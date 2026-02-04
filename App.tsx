import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth, authReady } from "./services/firebase";
import { AppView, GeneratedResult, InterviewStyle, UserProfile, SessionRecord, AiModel, VoiceProfile } from './types';
import { Hero } from './components/Hero';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GuideIntro } from './components/GuideIntro';
import { Studio } from './components/Studio';
import { RealtimeStudio } from './components/RealtimeStudio';
import { SummaryScreen } from './components/SummaryScreen';
import { Results } from './components/Results';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PricingModal } from './components/PricingModal';
import { generateTextAssets, generateSocialImages } from './services/geminiService';
import { storageService } from './services/storageService';

function App() {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('WIN_OF_WEEK');
  const [interviewTopic, setInterviewTopic] = useState<string>('');

  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // ---------------------------
  // 🔥 MAIN AUTH / REDIRECT LOGIC
  // ---------------------------
  useEffect(() => {
    console.log("App mounted, initializing auth listener...");

    // Always start in "checking" mode so we don't flash Landing too early
    setIsAuthChecking(true);

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    authReady.then(() => {
      if (!isMounted) return;

      // 1️⃣ Handle Google redirect callback (after signInWithRedirect)
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            console.log("Google redirect success:", result.user);
            handleLoginSuccess(result.user);
          }
        })
        .catch((err) => console.error("Google redirect error:", err));

      // 2️⃣ Real-time Firebase auth listener
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("Auth listener fired. User =", user);

        if (user) {
          try {
            const profile = await storageService.syncFirebaseUser(user);
            setCurrentUser(profile);

            console.log("User authenticated → redirect to WELCOME");
            setView(AppView.WELCOME);   // ⬅️ Always go to WELCOME when logged in
          } catch (e) {
            console.error("Failed to sync user profile", e);
          }
        }

        // End loading mode AFTER Firebase responds (user or no user)
        setIsAuthChecking(false);
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ---------------------------
  // 🔥 LOGIN SUCCESS HANDLER
  // ---------------------------
  const handleLoginSuccess = async (user: any) => {
    // This gets called from the redirect handler
    setIsAuthChecking(false);

    try {
      const profile = await storageService.syncFirebaseUser(user);
      setCurrentUser(profile);
    } catch (e) {
      console.warn("⚠️ Firestore sync failed. Using fallback profile.", e);

      setCurrentUser({
        id: user.uid,
        name: user.displayName || "Creator",
        email: user.email || "",
        joinedAt: Date.now(),
        history: [],
        insights: [],
        interactionCount: 0,
        plan: "FREE",
      });
    }

    setView(AppView.WELCOME);
  };

  // ---------------------------
  // Remaining App Logic
  // ---------------------------

  const handleStartStudio = (style: InterviewStyle, topic?: string) => {
    setInterviewStyle(style);
    setInterviewTopic(topic || '');
    setView(AppView.STUDIO);
  };

  const handleFinishRecording = (blob: Blob) => {
    setRecordingBlob(blob);
    setCurrentVideoUrl(null);
    setActiveSessionId(null);
    setView(AppView.SUMMARY);
  };

  const updateLocalHistory = (updatedSession: SessionRecord) => {
    if (!currentUser) return;

    const existing = currentUser.history || [];
    const index = existing.findIndex(s => s.id === updatedSession.id);

    let newHistory;
    if (index >= 0) {
      newHistory = [...existing];
      newHistory[index] = updatedSession;
    } else {
      newHistory = [updatedSession, ...existing];
    }

    setCurrentUser({ ...currentUser, history: newHistory });
  };

  const handleGenerate = async (modelTier: AiModel) => {
    if (!recordingBlob || !currentUser) return;

    console.log("🎙️ Recording blob size:", recordingBlob.size, "Type:", recordingBlob.type);
    console.log("👤 Current user:", currentUser.name, "ID:", currentUser.id);
    console.log("📝 Interview style:", interviewStyle);
    console.log("🤖 Model tier:", modelTier);

    // Special handling for onboarding interviews
    if (interviewStyle === 'ONBOARDING') {
      await handleOnboardingGenerate(modelTier);
      return;
    }

    setGeneratedResult({});
    setIsLoadingText(true);
    setView(AppView.RESULTS);

    let currentSessionId: string;

    try {
      const pendingSession = await storageService.createPendingSession(currentUser.id, interviewStyle);
      currentSessionId = pendingSession.id;
      setActiveSessionId(currentSessionId);
      updateLocalHistory(pendingSession);
    } catch {
      currentSessionId = crypto.randomUUID();
    }

    // Upload video in background (don't block on failures)
    if (!currentUser.id.startsWith('guest_')) {
      storageService.uploadVideo(currentUser.id, recordingBlob)
        .then(async (url) => {
          setCurrentVideoUrl(url);
          try {
            const updated = await storageService.updateSession(currentUser.id, currentSessionId, { videoUrl: url });
            updateLocalHistory(updated);
          } catch (e) {
            console.warn("Failed to save video URL to Firebase, but video is uploaded:", url);
          }
        })
        .catch(e => {
          console.warn("Video upload failed (likely CORS). Content generation will continue.", e);
        });
    }

    generateTextAssets(recordingBlob, interviewStyle, modelTier, currentUser.voiceProfile)
      .then(async (textData) => {
        setGeneratedResult(prev => ({ ...prev, ...textData }));
        setIsLoadingText(false);

        // Try to save to Firebase, but don't fail if it doesn't work
        try {
          let updated = await storageService.updateSession(currentUser.id, currentSessionId, {
            transcription: textData.transcription,
            socialAssets: textData.socialAssets,
            insights: textData.newInsights || []
          });
          updateLocalHistory(updated);
        } catch (e) {
          console.warn("Failed to save session to Firebase (likely CORS/permissions). Content is still available locally.", e);
        }

        if (textData.socialAssets) {
          console.log("🎨 Starting image generation for", textData.socialAssets.length, "assets");
          const assetsWithImages = await generateSocialImages(textData.socialAssets);
          console.log("🎨 Image generation complete. Assets with images:", assetsWithImages.filter(a => a.imageUrl).length);

          // Upload images to Firebase Storage and replace base64 URLs with cloud URLs
          let uploadFailedCount = 0;
          let uploadSuccessCount = 0;
          const assetsWithCloudImages = await Promise.all(
            assetsWithImages.map(async (asset) => {
              if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
                console.log(`☁️  Uploading ${asset.type} image to Firebase Storage...`);
                try {
                  const cloudUrl = await storageService.uploadImage(
                    currentUser.id,
                    asset.imageUrl,
                    asset.type
                  );
                  console.log(`✅ ${asset.type} image uploaded:`, cloudUrl.substring(0, 80) + "...");
                  uploadSuccessCount++;
                  return { ...asset, imageUrl: cloudUrl };
                } catch (e) {
                  console.error(`❌ Failed to upload image for ${asset.type}:`, e);
                  uploadFailedCount++;
                  return asset; // Keep base64 if upload fails
                }
              }
              return asset;
            })
          );

          console.log(`📊 Image upload summary: ${uploadSuccessCount} succeeded, ${uploadFailedCount} failed`);

          const complete = { ...textData, socialAssets: assetsWithCloudImages };
          setGeneratedResult(prev => ({ ...prev, ...complete }));

          // Try to save with cloud URLs
          console.log("💾 Saving session with images to Firestore...");
          try {
            const updated = await storageService.updateSession(currentUser.id, currentSessionId, {
              socialAssets: assetsWithCloudImages
            });
            console.log("✅ Session saved with images. socialAssets count:", updated.socialAssets?.length);
            console.log("📸 Image URLs in saved session:", updated.socialAssets?.map(a => a.imageUrl ? "has image" : "no image"));
            updateLocalHistory(updated);
          } catch (e) {
            console.error("❌ Failed to save session with images:", e);
          }
        }
      })
      .catch((err) => {
        setIsLoadingText(false);
        console.error("Content generation failed:", err);
        console.error("Error details:", err.message, err.stack);
        alert(`Failed to generate content: ${err.message || 'Unknown error'}. Please check console for details.`);
      });
  };

  const handleViewSession = async (session: SessionRecord) => {
    // Fetch fresh data from Firestore to get any updates (e.g., images uploaded after initial save)
    let freshSession = session;
    if (currentUser) {
      const fetched = await storageService.getSession(currentUser.id, session.id);
      if (fetched) {
        freshSession = fetched;
        // Update local cache too
        updateLocalHistory(freshSession);
      }
    }

    setGeneratedResult({
      transcription: freshSession.transcription,
      socialAssets: freshSession.socialAssets,
      newInsights: freshSession.insights
    });
    setRecordingBlob(null);
    setCurrentVideoUrl(freshSession.videoUrl || null);
    setActiveSessionId(freshSession.id);
    setView(AppView.RESULTS);
  };

  const handleUpgrade = () => {
    alert("Billing integration coming soon! You will be redirected to Stripe.");
    setIsPricingOpen(false);
  };

  const handleOnboardingComplete = async (voiceProfile: VoiceProfile) => {
    if (!currentUser) return;

    // Update user profile with voice profile
    const updatedUser = {
      ...currentUser,
      voiceProfile,
    };
    setCurrentUser(updatedUser);

    // Save to Firebase
    try {
      await storageService.saveVoiceProfile(currentUser.id, voiceProfile);
    } catch (e) {
      console.warn("Failed to save voice profile to Firebase. Continuing with local data.", e);
    }

    // Redirect to interviews
    setView(AppView.GUIDE_INTRO);
  };

  const handleOnboardingGenerate = async (modelTier: AiModel) => {
    if (!recordingBlob || !currentUser) return;

    setGeneratedResult({});
    setIsLoadingText(true);
    setView(AppView.RESULTS);

    try {
      // Transcribe the onboarding interview and generate content from it
      // Note: No voice profile yet since this IS the onboarding
      const textData = await generateTextAssets(recordingBlob, 'ONBOARDING', modelTier, undefined);

      setGeneratedResult(prev => ({ ...prev, ...textData }));

      // Extract voice profile from transcription
      const voiceProfile: VoiceProfile = {
        onboardingCompleted: true,
        onboardingCompletedAt: Date.now(),
        answers: [{
          questionId: 'onboarding_full',
          question: 'Complete onboarding interview',
          answer: textData.transcription || '',
          timestamp: Date.now(),
        }],
        currentGoal: textData.transcription,
      };

      // Save voice profile BEFORE generating images
      const updatedUser = {
        ...currentUser,
        voiceProfile,
      };
      setCurrentUser(updatedUser);

      try {
        await storageService.saveVoiceProfile(currentUser.id, voiceProfile);
      } catch (e) {
        console.warn("Failed to save voice profile to Firebase. Continuing with local data.", e);
      }

      setIsLoadingText(false);

      // Generate images if we have social assets
      if (textData.socialAssets) {
        const assetsWithImages = await generateSocialImages(textData.socialAssets);

        // Upload images to Firebase Storage
        const assetsWithCloudImages = await Promise.all(
          assetsWithImages.map(async (asset) => {
            if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
              try {
                const cloudUrl = await storageService.uploadImage(
                  currentUser.id,
                  asset.imageUrl,
                  asset.type
                );
                return { ...asset, imageUrl: cloudUrl };
              } catch (e) {
                console.warn(`Failed to upload image for ${asset.type}. Keeping base64.`, e);
                return asset;
              }
            }
            return asset;
          })
        );

        const complete = { ...textData, socialAssets: assetsWithCloudImages };
        setGeneratedResult(prev => ({ ...prev, ...complete }));
      }

    } catch (err) {
      setIsLoadingText(false);
      console.error("Onboarding processing failed:", err);
      alert("Failed to process onboarding interview. Please try again.");
    }
  };

  const handleBegin = () => {
    // Check if user has completed onboarding
    if (!currentUser?.voiceProfile?.onboardingCompleted) {
      // Route to onboarding interview via Studio
      setInterviewStyle('ONBOARDING');
      setInterviewTopic('');
      setView(AppView.STUDIO);
    } else {
      setView(AppView.GUIDE_INTRO);
    }
  };

  const handleResultsRestart = () => {
    // If they just completed onboarding, route to interview selection
    // Otherwise go back to welcome
    if (interviewStyle === 'ONBOARDING' && currentUser?.voiceProfile?.onboardingCompleted) {
      setView(AppView.GUIDE_INTRO);
    } else {
      setView(AppView.WELCOME);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-[#1f3a2e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-medium">Connecting to Ideoloop...</p>
      </div>
    );
  }

  return (
    <>
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onUpgrade={handleUpgrade}
      />

      {(() => {
        switch (view) {
          case AppView.LANDING:
            return <Hero onGetStarted={() => setView(AppView.AUTH)} onCreateCustom={() => setView(AppView.AUTH)} />;
          case AppView.AUTH:
            return <AuthScreen onLoginSuccess={handleLoginSuccess} authLoading={isAuthChecking} />;
          case AppView.WELCOME:
            return <WelcomeScreen userName={currentUser?.name} onBegin={handleBegin} onDashboard={() => setView(AppView.DASHBOARD)} />;
          case AppView.DASHBOARD:
            return currentUser ? (
              <Dashboard
                user={currentUser}
                onBack={() => setView(AppView.WELCOME)}
                onAdmin={() => setView(AppView.ADMIN)}
                onViewSession={handleViewSession}
              />
            ) : <AuthScreen onLoginSuccess={handleLoginSuccess} authLoading={isAuthChecking} />;
          case AppView.ADMIN:
            return <AdminDashboard onBack={() => setView(AppView.DASHBOARD)} />;
          case AppView.GUIDE_INTRO:
            return <GuideIntro onStart={handleStartStudio} userPlan={currentUser?.plan} onOpenPricing={() => setIsPricingOpen(true)} />;
          case AppView.STUDIO:
            return <Studio interviewStyle={interviewStyle} interviewTopic={interviewTopic} userProfile={currentUser} onFinish={handleFinishRecording} onCancel={() => setView(AppView.WELCOME)} />;
          case AppView.SUMMARY:
            return <SummaryScreen onGenerate={handleGenerate} />;
          case AppView.RESULTS:
            return generatedResult ? (
              <Results
                result={generatedResult}
                recordings={recordingBlob ? { 'full_session': recordingBlob } : {}}
                videoUrl={currentVideoUrl || undefined}
                onRestart={handleResultsRestart}
                isLoadingText={isLoadingText}
              />
            ) : null;
          default:
            return <Hero onGetStarted={() => setView(AppView.AUTH)} onCreateCustom={() => setView(AppView.AUTH)} />;
        }
      })()}
    </>
  );
}

export default App;

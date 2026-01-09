import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth, authReady } from "./services/firebase";
import { AppView, GeneratedResult, InterviewStyle, UserProfile, SessionRecord, AiModel } from './types';
import { Hero } from './components/Hero';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GuideIntro } from './components/GuideIntro';
import { Studio } from './components/Studio';
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

    const uploadPromise = !currentUser.id.startsWith('guest_')
      ? storageService.uploadVideo(currentUser.id, recordingBlob)
          .then(async (url) => {
            setCurrentVideoUrl(url);
            const updated = await storageService.updateSession(currentUser.id, currentSessionId, { videoUrl: url });
            updateLocalHistory(updated);
            return url;
          })
      : Promise.resolve(undefined);

    generateTextAssets(recordingBlob, interviewStyle, modelTier)
      .then(async (textData) => {
        setGeneratedResult(prev => ({ ...prev, ...textData }));
        setIsLoadingText(false);

        let updated = await storageService.updateSession(currentUser.id, currentSessionId, {
          transcription: textData.transcription,
          socialAssets: textData.socialAssets,
          insights: textData.newInsights || []
        });
        updateLocalHistory(updated);

        if (textData.socialAssets) {
          const assetsWithImages = await generateSocialImages(textData.socialAssets);
          const complete = { ...textData, socialAssets: assetsWithImages };

          setGeneratedResult(prev => ({ ...prev, ...complete }));

          updated = await storageService.updateSession(currentUser.id, currentSessionId, {
            socialAssets: assetsWithImages
          });
          updateLocalHistory(updated);
        }
      })
      .catch(() => {
        setIsLoadingText(false);
        alert("Failed to generate content. Please try again.");
      });
  };

  const handleViewSession = (session: SessionRecord) => {
    setGeneratedResult({
      transcription: session.transcription,
      socialAssets: session.socialAssets,
      newInsights: session.insights
    });
    setRecordingBlob(null);
    setCurrentVideoUrl(session.videoUrl || null);
    setActiveSessionId(session.id);
    setView(AppView.RESULTS);
  };

  const handleUpgrade = () => {
    alert("Billing integration coming soon! You will be redirected to Stripe.");
    setIsPricingOpen(false);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-[#82ba90] border-t-transparent rounded-full animate-spin"></div>
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
            return <WelcomeScreen userName={currentUser?.name} onBegin={() => setView(AppView.GUIDE_INTRO)} onDashboard={() => setView(AppView.DASHBOARD)} />;
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
                onRestart={() => setView(AppView.WELCOME)} 
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

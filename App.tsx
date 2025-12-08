import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
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
  
  // Progressive State
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Modal State
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Listen for Firebase Auth changes
  useEffect(() => {
    console.log("App mounted, initializing auth listener...");
    const timeout = setTimeout(() => {
        if (isAuthChecking) {
            console.warn("Auth check timed out. Defaulting to Landing.");
            setIsAuthChecking(false);
        }
    }, 8000); // Increased timeout for async cloud fetch

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
            // ASYNC: Wait for cloud sync to finish before setting user
            const profile = await storageService.syncFirebaseUser(user);
            setCurrentUser(profile);
            
            // Only redirect if we are on an entry page
            if (view === AppView.AUTH || view === AppView.LANDING) {
                setView(AppView.WELCOME);
            }
        } catch (e) {
            console.error("Failed to sync user profile", e);
        }
      }
      setIsAuthChecking(false);
      clearTimeout(timeout);
    });

    return () => {
        clearTimeout(timeout);
        unsubscribe();
    };
  }, []); // Remove dependencies to avoid re-running

  const handleLoginSuccess = async (user: any) => {
      setIsAuthChecking(true); // Show loading while fetching history
      try {
          // Attempt Cloud Sync
          const profile = await storageService.syncFirebaseUser(user);
          setCurrentUser(profile);
          setView(AppView.WELCOME);
      } catch(e) {
          console.error("Login Sync Critical Failure", e);
          // CRITICAL FAIL-SAFE:
          // If the storage service crashes (e.g. imports are broken), we MUST still let the user in.
          // Construct a temporary local profile so they are not blocked.
          setCurrentUser({
              id: user.uid || 'temp_user',
              name: user.displayName || 'Creator',
              email: user.email || '',
              joinedAt: Date.now(),
              history: [],
              insights: [],
              interactionCount: 0,
              plan: 'FREE'
          });
          setView(AppView.WELCOME);
      } finally {
          setIsAuthChecking(false);
      }
  };

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
      
      const existingHistory = currentUser.history || [];
      const index = existingHistory.findIndex(s => s.id === updatedSession.id);
      
      let newHistory;
      if (index >= 0) {
          newHistory = [...existingHistory];
          newHistory[index] = updatedSession;
      } else {
          newHistory = [updatedSession, ...existingHistory];
      }
      
      setCurrentUser({ ...currentUser, history: newHistory });
  };

  const handleGenerate = async (modelTier: AiModel) => {
    if (!recordingBlob || !currentUser) return;
    
    // IMMEDIATE NAVIGATION & FEEDBACK
    setGeneratedResult({}); 
    setIsLoadingText(true);
    setView(AppView.RESULTS);

    let currentSessionId: string;

    try {
        // STEP 1: CREATE PENDING SESSION (Prevents Data Loss)
        const pendingSession = await storageService.createPendingSession(currentUser.id, interviewStyle);
        currentSessionId = pendingSession.id;
        setActiveSessionId(currentSessionId);
        updateLocalHistory(pendingSession);
    } catch (e) {
        console.error("Failed to init session", e);
        // Fallback ID if cloud write fails temporarily (will fail later, but keeps UI alive)
        currentSessionId = crypto.randomUUID(); 
    }

    // STEP 2: UPLOAD AUDIO (Async)
    const uploadPromise = !currentUser.id.startsWith('guest_') 
        ? storageService.uploadVideo(currentUser.id, recordingBlob)
            .then(async (url) => {
                console.log("Audio uploaded:", url);
                setCurrentVideoUrl(url);
                // Update Session with URL
                const updated = await storageService.updateSession(currentUser.id, currentSessionId, { videoUrl: url });
                updateLocalHistory(updated);
                return url;
            })
            .catch(e => console.error("Upload failed", e))
        : Promise.resolve(undefined);

    // STEP 3: GENERATE TEXT (Gemini)
    generateTextAssets(recordingBlob, interviewStyle, modelTier)
        .then(async (textData) => {
            // Render text immediately in UI
            setGeneratedResult(prev => ({ ...prev, ...textData }));
            setIsLoadingText(false);
            
            // Save Text Results to Cloud
            let updated = await storageService.updateSession(currentUser.id, currentSessionId, {
                transcription: textData.transcription,
                socialAssets: textData.socialAssets,
                insights: textData.newInsights || []
            });
            updateLocalHistory(updated);

            // STEP 4: GENERATE IMAGES (Chained)
            if (textData.socialAssets) {
               console.log("Starting Image Generation...");
               try {
                  const assetsWithImages = await generateSocialImages(textData.socialAssets);
                  
                  // Update UI
                  const completeData = { ...textData, socialAssets: assetsWithImages };
                  setGeneratedResult(prev => ({ ...prev, ...completeData }));
                  
                  // Save Images to Cloud
                  updated = await storageService.updateSession(currentUser.id, currentSessionId, {
                      socialAssets: assetsWithImages
                  });
                  updateLocalHistory(updated);
               } catch (e) {
                  console.error("Image gen failed", e);
               }
            }
        })
        .catch(err => {
            console.error("Text Gen Failed", err);
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
      setRecordingBlob(null); // Clear local blob
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
            return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
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
                ) : <AuthScreen onLoginSuccess={handleLoginSuccess} />;
            case AppView.ADMIN:
                return <AdminDashboard onBack={() => setView(AppView.DASHBOARD)} />;
            case AppView.GUIDE_INTRO:
            return <GuideIntro onStart={handleStartStudio} userPlan={currentUser?.plan} onOpenPricing={() => setIsPricingOpen(true)} />;
            case AppView.STUDIO:
            return <Studio interviewStyle={interviewStyle} interviewTopic={interviewTopic} userProfile={currentUser} onFinish={handleFinishRecording} onCancel={() => setView(AppView.WELCOME)} />;
            case AppView.SUMMARY:
            return <SummaryScreen onGenerate={handleGenerate} />;
            case AppView.PROCESSING:
            return null;
            case AppView.RESULTS:
            // Allow viewing results if we have data, even if partial
            if (generatedResult) {
                return (
                <Results 
                    result={generatedResult} 
                    recordings={recordingBlob ? { 'full_session': recordingBlob } : {}}
                    videoUrl={currentVideoUrl || undefined}
                    onRestart={() => setView(AppView.WELCOME)} 
                    isLoadingText={isLoadingText}
                />
                );
            }
            return null;
            default:
            return <Hero onGetStarted={() => setView(AppView.AUTH)} onCreateCustom={() => setView(AppView.AUTH)} />;
        }
      })()}
    </>
  );
}

export default App;
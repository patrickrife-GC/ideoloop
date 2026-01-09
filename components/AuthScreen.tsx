import React, { useState } from 'react';
import { 
  signInWithRedirect,
  signInAnonymously 
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  authLoading: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, authLoading }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Used when auth completely fails
  const forceMockEntry = () => {
    const guestUser = {
      uid: 'guest_' + Math.random().toString(36).substr(2, 9),
      displayName: 'Guest User',
      email: 'guest@ideoloop.ai',
      photoURL: null,
      isAnonymous: true
    };
    onLoginSuccess(guestUser);
  };

  const handleGuestLogin = async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const result = await signInAnonymously(auth);
      onLoginSuccess(result.user);
    } catch (err) {
      console.warn("Anonymous auth failed, using mock instead.", err);
      forceMockEntry();
    }
  };

  // 🚀 Google login using redirect (required outside localhost)
  const handleGoogleLogin = async () => {
    if (authLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error("Google redirect failed", err);
      setError("Unable to authenticate. Switching to Guest Mode...");
      handleGuestLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 font-inter relative overflow-hidden">

      {/* Background graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl pointer-events-none opacity-20 blur-3xl z-0">
        <div className="aspect-[1100/600] w-full bg-gradient-to-tr from-[#82ba90] to-[#a7f3d0]"
             style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}>
        </div>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 relative z-50">

        <div className="text-center mb-10">
          <div className="mx-auto w-12 h-12 bg-[#82ba90]/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">⚡️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Sign in to Ideoloop</h1>
          <p className="text-gray-500">
            Your creative studio awaits. Sign in to save your sessions and access your history.
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 text-sm rounded-lg border text-center shadow-sm 
            ${error.includes('Switching') 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'}`}>
            <p className="font-bold mb-1 flex items-center justify-center gap-2">
              {error.includes('Switching') ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  Redirecting...
                </>
              ) : <>Action Required</>}
            </p>
            <p>{error}</p>
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading || authLoading}
          className={`w-full bg-white border border-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all 
            flex items-center justify-center gap-3 shadow-sm group mb-4 
            ${(isLoading || authLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-gray-300'}`}
        >
          {(isLoading || authLoading) ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">or</span>
          </div>
        </div>

        {/* Guest */}
        <button
          onClick={handleGuestLogin}
          disabled={authLoading}
          className={`w-full bg-gray-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg ${
            authLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
          }`}
        >
          Start as Guest (No Login Required)
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          Instantly access the full studio. Recommended for preview.
        </p>

      </div>
    </div>
  );
};

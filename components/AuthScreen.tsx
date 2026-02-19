import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  authLoading: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, authLoading }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"google" | "email" | "guest">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const clearErrors = () => {
    setFormError(null);
    setFormNotice(null);
  };

  // Fallback when Firebase auth completely fails
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

  const handleGoogleLogin = async () => {
    if (authLoading || isLoading) return;
    setIsLoading(true);
    clearErrors();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (err: any) {
      console.error("Google sign-in failed", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setFormError("Sign-in cancelled. Try again.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setFormError("This domain isn't authorized for Google sign-in. Use email or guest mode.");
      } else {
        setFormError("Google sign-in failed. Try email or guest mode.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (authLoading || isLoading) return;
    setIsLoading(true);
    clearErrors();
    try {
      const result = await signInAnonymously(auth);
      onLoginSuccess(result.user);
    } catch (err) {
      console.warn("Anonymous auth failed, using mock instead.", err);
      forceMockEntry();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (intent: "login" | "signup") => {
    if (authLoading || isLoading) return;
    setIsLoading(true);
    clearErrors();
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || password.length < 6) {
        setFormError("Enter a valid email and a password of at least 6 characters.");
        setIsLoading(false);
        return;
      }
      const result =
        intent === "login"
          ? await signInWithEmailAndPassword(auth, trimmedEmail, password)
          : await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      onLoginSuccess(result.user);
    } catch (err: any) {
      const message = err?.message ? String(err.message) : "Authentication failed.";
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (authLoading || isLoading) return;
    setIsLoading(true);
    clearErrors();
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setFormError("Enter your email to receive a reset link.");
        setIsLoading(false);
        return;
      }
      await sendPasswordResetEmail(auth, trimmedEmail);
      setFormNotice("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      const message = err?.message ? String(err.message) : "Password reset failed.";
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 font-inter relative overflow-hidden">

      {/* Background graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl pointer-events-none opacity-20 blur-3xl z-0">
        <div className="aspect-[1100/600] w-full bg-gradient-to-tr from-[#1f3a2e] to-[#6B9B7F]"
             style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}>
        </div>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20 relative z-50">

        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-[#1f3a2e]/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">⚡️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Sign in to Ideoloop</h1>
          <p className="text-gray-500">
            Your creative studio awaits. Sign in to save your sessions and access your history.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => { setMode("google"); clearErrors(); }}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              mode === "google" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            Google
          </button>
          <button
            onClick={() => { setMode("email"); clearErrors(); }}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              mode === "email" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => { setMode("guest"); clearErrors(); }}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              mode === "guest" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            Guest
          </button>
        </div>

        {formError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {formError}
          </div>
        )}
        {formNotice && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            {formNotice}
          </div>
        )}

        {mode === "google" && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading || isLoading}
              className={`w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-all shadow-sm ${
                (authLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              {(authLoading || isLoading) ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {/* Google G logo */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              Recommended — one click, no password needed.
            </p>
          </div>
        )}

        {mode === "email" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#82ba90]/40"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#82ba90]/40"
                placeholder="At least 6 characters"
                autoComplete="current-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleEmailAuth("login")}
                disabled={authLoading || isLoading}
                className={`w-full bg-gray-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg ${
                  (authLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                }`}
              >
                {(authLoading || isLoading) ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : "Log In"}
              </button>
              <button
                onClick={() => handleEmailAuth("signup")}
                disabled={authLoading || isLoading}
                className={`w-full bg-white text-gray-900 font-bold py-3 rounded-xl transition-all shadow-lg border border-gray-200 ${
                  (authLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={authLoading || isLoading}
              className={`w-full text-sm font-semibold text-gray-600 underline underline-offset-4 ${
                (authLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-900'
              }`}
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode === "guest" && (
          <>
            <button
              onClick={handleGuestLogin}
              disabled={authLoading || isLoading}
              className={`w-full bg-gray-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg ${
                (authLoading || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
              }`}
            >
              {(authLoading || isLoading) ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : "Start as Guest (No Login Required)"}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Instantly access the full studio. Sessions won't be saved.
            </p>
          </>
        )}

      </div>
    </div>
  );
};

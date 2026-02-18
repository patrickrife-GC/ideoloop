import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../services/firebase";

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
  authLoading: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, authLoading }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "guest">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

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
    setFormError(null);
    setFormNotice(null);
    try {
      const result = await signInAnonymously(auth);
      onLoginSuccess(result.user);
    } catch (err) {
      console.warn("Anonymous auth failed, using mock instead.", err);
      forceMockEntry();
    }
  };

  const handleEmailAuth = async (intent: "login" | "signup") => {
    if (authLoading) return;
    setIsLoading(true);
    setFormError(null);
    setFormNotice(null);

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
    if (authLoading) return;
    setIsLoading(true);
    setFormError(null);
    setFormNotice(null);

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

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            onClick={() => setMode("email")}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              mode === "email" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            Email Account
          </button>
          <button
            onClick={() => setMode("guest")}
            className={`py-2 rounded-lg text-sm font-semibold border ${
              mode === "guest" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            Guest Mode
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

        {mode === "email" ? (
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
                ) : (
                  "Log In"
                )}
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
            <p className="text-center text-xs text-gray-400">
              New to Ideoloop? Sign up to save your sessions.
            </p>
          </div>
        ) : (
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
              ) : (
                "Start as Guest (No Login Required)"
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Instantly access the full studio. Recommended for preview.
            </p>
          </>
        )}

      </div>
    </div>
  );
};

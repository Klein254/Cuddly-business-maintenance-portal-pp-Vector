import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Lock } from 'lucide-react';
import { signIn, SignInError, SignInProblem, takeSignInNotice } from '../auth';

interface LoginScreenProps {
  // Called for accounts that haven't been secured yet; secured sign-ins are picked up by App automatically
  onLegacyLogin: (user: User, rememberMe: boolean) => void;
}

const SIGN_IN_MESSAGES: Record<SignInProblem, string> = {
  'invalid': 'Invalid username or password',
  'too-many-attempts': 'Too many attempts. Wait a few minutes, then try again.',
  'offline': 'No connection. Signing in needs internet access.',
  'unavailable': 'Sign-in failed. Please try again.'
};

// Read once per page load (e.g. "your session has ended" after an admin resets a password)
const initialNotice = takeSignInNotice();

export default function LoginScreen({ onLegacyLogin }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [signingIn, setSigningIn] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide username and password');
      return;
    }

    setSigningIn(true);
    try {
      const result = await signIn(username, password, rememberMe);
      if (result.kind === 'legacy') onLegacyLogin(result.user, rememberMe);
    } catch (err) {
      setError(SIGN_IN_MESSAGES[err instanceof SignInError ? err.problem : 'unavailable']);
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-b-full bg-amber-400" />

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-400 flex items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.25)]">
            <span className="text-black font-black text-4xl">V</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tighter text-white">VECTOR TECHNICAL</h1>
          <p className="text-[10px] text-amber-400 uppercase tracking-widest font-medium mt-1">
            Secure Unified Terminal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {initialNotice && !error && (
            <div className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs text-center p-2 rounded">
              {initialNotice}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-stone-500 uppercase tracking-wider mb-2">
              Username (Surname)
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
              <input
                type="text"
                placeholder="Enter your surname"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 pl-10 text-stone-200 outline-none focus:border-amber-400 text-sm placeholder:text-stone-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-stone-500 uppercase tracking-wider mb-2">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 pl-10 text-stone-200 outline-none focus:border-amber-400 text-sm placeholder:text-stone-700 font-mono tracking-widest placeholder:tracking-normal"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-amber-400 h-4 w-4 rounded cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-stone-400 font-mono cursor-pointer select-none">
              Keep me securely logged in
            </label>
          </div>

          <button
            type="submit"
            disabled={signingIn}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-black text-sm uppercase py-3 rounded-xl tracking-wider flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <ShieldCheck className="h-5 w-5" />
            {signingIn ? 'Verifying…' : 'Initialize Session'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-stone-800 pt-5">
          <p className="text-[10px] text-stone-600 font-mono">
            System requires authorization. Use your surname as username.
          </p>
        </div>
      </div>
    </div>
  );
}

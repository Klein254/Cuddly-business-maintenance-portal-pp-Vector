import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Lock } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User, rememberMe: boolean) => void;
}

export default function LoginScreen({ users, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide username and password');
      return;
    }
    
    // Find user by username (case insensitive)
    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!targetUser) {
      setError('Invalid username or password');
      return;
    }

    if (targetUser.pin === password) {
      onLogin(targetUser, rememberMe);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative header */}
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-400 flex items-center justify-center rounded-sm">
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
                className="w-full bg-stone-950 border border-stone-800 rounded p-3 pl-10 text-stone-200 outline-none focus:border-amber-400 text-sm placeholder:text-stone-700"
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
                className="w-full bg-stone-950 border border-stone-800 rounded p-3 pl-10 text-stone-200 outline-none focus:border-amber-400 text-sm placeholder:text-stone-700 font-mono tracking-widest placeholder:tracking-normal"
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
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase py-3 rounded tracking-wider flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <ShieldCheck className="h-5 w-5" />
            Initialize Session
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

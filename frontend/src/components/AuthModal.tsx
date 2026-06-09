import React, { useState } from "react";
import { X, Mail, Lock, User, Key, AlertCircle } from "lucide-react";
import { useEco } from "../context/EcoContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup, isLoading } = useEco();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (!isLoginTab && !name)) {
      setError("Please fill in all fields");
      return;
    }

    try {
      if (isLoginTab) {
        await login({ email, password });
      } else {
        await signup({ email, password, name });
      }
      onClose(); // Close on success
      // Reset state
      setEmail("");
      setPassword("");
      setName("");
    } catch (err: any) {
      setError(err.message || "An authentication error occurred");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 relative z-10 border border-white/10 animate-slide-up shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white font-display">
            {isLoginTab ? "Welcome Back" : "Join EcoTrack AI"}
          </h3>
          <p className="text-xs text-dark-400 mt-1">
            {isLoginTab ? "Log in to access your saved carbon footprint logs" : "Create an account to track your progress over time"}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 bg-dark-900/60 p-1 rounded-xl border border-white/5 mb-6">
          <button
            onClick={() => { setIsLoginTab(true); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              isLoginTab ? "bg-brand-600 text-white shadow" : "text-dark-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              !isLoginTab ? "bg-brand-600 text-white shadow" : "text-dark-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-xs mb-4">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginTab && (
            <div className="space-y-1">
              <label className="text-[10px] text-dark-400 uppercase tracking-wider font-bold">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full pl-10 text-sm"
                />
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-400" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] text-dark-400 uppercase tracking-wider font-bold">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full pl-10 text-sm"
              />
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-dark-400 uppercase tracking-wider font-bold">Password</label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-10 text-sm"
              />
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-dark-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl text-sm transition mt-6 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/15"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <Key className="h-4 w-4" />
                <span>{isLoginTab ? "Log In" : "Create Account"}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-4">
          <button
            onClick={() => { setIsLoginTab(!isLoginTab); setError(null); }}
            className="text-xxs text-dark-400 hover:text-brand-400 transition"
          >
            {isLoginTab ? "Need an account? Register instead" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

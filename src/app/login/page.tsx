"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Film, Lock, Mail, ArrowRight, AlertCircle, Loader2, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (res.success) {
      router.push(redirectUrl);
    } else {
      setError(res.error || "Failed to log in");
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="bg-cinema-900/90 border border-slate-800/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 backdrop-blur-xl">
      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo quick fill section for testing */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Quick Demo Accounts (1-Click Fill)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount("host.alex@sharewatching.app")}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left text-xs transition-colors"
          >
            <p className="font-semibold text-white">Alex (Host)</p>
            <p className="text-[10px] text-slate-400 truncate">host.alex@sharewatching.app</p>
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount("guest.sam@sharewatching.app")}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left text-xs transition-colors"
          >
            <p className="font-semibold text-white">Sam (Guest)</p>
            <p className="text-[10px] text-slate-400 truncate">guest.sam@sharewatching.app</p>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 text-center">
          (Use Alex in Tab 1 and Sam in Tab 2 to test instant co-watching!)
        </p>
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cinema-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="ambient-glow -top-32 -left-32 w-96 h-96 bg-brand-600/20" />
      <div className="ambient-glow -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center space-x-3 mb-6 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/25 group-hover:scale-105 transition-transform">
            <Film className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">ShareWatching</span>
        </Link>
        <h2 className="text-center text-xl font-bold text-slate-100">Sign in to your account</h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Access your personal S3 video portfolio & join synced watch parties
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Suspense
          fallback={
            <div className="p-8 text-center bg-cinema-900/90 rounded-3xl border border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading sign in...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

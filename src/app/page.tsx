"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import WatchTogetherModal from "@/components/WatchTogetherModal";
import { useAuth } from "@/context/AuthContext";
import {
  Film,
  Zap,
  Users,
  Video,
  Mic,
  Tv,
  HardDriveDownload,
  FolderLock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  ShieldCheck,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [showWatchModal, setShowWatchModal] = useState(false);

  return (
    <div className="min-h-screen bg-cinema-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow top-0 left-1/4 w-[600px] h-[600px] bg-brand-600/15" />
      <div className="ambient-glow top-1/3 right-10 w-[500px] h-[500px] bg-indigo-600/15" />

      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Zero-Buffer Co-Watching & Google Meet Video Call</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Watch Movies Together.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              Zero Delay. Zero Buffering.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Pre-upload your favorite movies to your personal Amazon S3 folder, pre-download to your
            device for seamless 0ms local playback, and connect with a 5-digit code. Complete with
            real-time Google Meet-style video & voice conferencing.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowWatchModal(true)}
                  className="flex items-center space-x-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-brand-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Tv className="w-5 h-5" />
                  <span>Start Watch Party</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-mono">
                    5-Digit Code
                  </span>
                </button>

                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 px-7 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-base transition-all hover:scale-105 active:scale-95"
                >
                  <span>Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex items-center space-x-2 px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base shadow-xl shadow-brand-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/login"
                  className="flex items-center space-x-2 px-7 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-base transition-all"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>

          {/* Interactive Feature Preview / Cinema Mockup */}
          <div className="mt-16 sm:mt-20 max-w-5xl mx-auto rounded-3xl bg-cinema-900/80 border border-slate-800/80 p-3 sm:p-5 shadow-2xl backdrop-blur-xl">
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 flex flex-col justify-between">
              {/* Top Bar on Mockup */}
              <div className="p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>0s Local Cache Buffer Ready</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                    Code: #74921
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-black/60 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ultra-Sync (3ms latency)</span>
                </div>
              </div>

              {/* Center Movie Simulation */}
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-600/80 flex items-center justify-center shadow-2xl text-white mb-3">
                  <Play className="w-7 h-7 fill-white ml-0.5" />
                </div>
                <h3 className="text-xl font-bold text-white">Interstellar (2014)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Playing simultaneously in high definition on both devices
                </p>
              </div>

              {/* Bottom Scrubber simulation */}
              <div className="p-4 bg-gradient-to-t from-black/90 to-transparent z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs font-mono text-slate-300">
                  <Pause className="w-4 h-4 fill-white" />
                  <span>01:42:19 / 02:49:00</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span>🍿</span>
                  <span>❤️</span>
                  <span>🔥</span>
                  <span>👏</span>
                </div>
              </div>
            </div>

            {/* Bottom Dual Webcams Preview (Google Meet Style) */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="h-28 sm:h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative p-3">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-300 font-bold flex items-center justify-center text-sm mb-1">
                    A
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Alex (Host)</span>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-emerald-400 px-2 py-0.5 rounded flex items-center space-x-1">
                  <Mic className="w-3 h-3" />
                  <span>Speaking</span>
                </span>
              </div>

              <div className="h-28 sm:h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative p-3">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm mb-1">
                    S
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Sam (Guest)</span>
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-slate-400 px-2 py-0.5 rounded flex items-center space-x-1">
                  <Mic className="w-3 h-3" />
                  <span>Connected</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE ADVANTAGES */}
        <section className="py-20 bg-cinema-900/50 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Engineered for Zero Delay Co-Watching
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Built specifically to solve video buffering delays, audio lag, and desynchronized movie nights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-cinema-900 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <FolderLock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Personal S3 Folders</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pre-upload movies to your own isolated S3 directory (<code>users/&#123;id&#125;/videos</code>). Build a permanent watch portfolio.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-cinema-900 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <HardDriveDownload className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Pre-Download Local Cache</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  1-Click local caching to browser IndexedDB ensures zero buffering during playback, even on slow connections.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-cinema-900 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">5-Digit Room Matching</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate a simple 5-digit code. Share with your partner. Strict 2-person limit guarantees maximum private bandwidth.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-cinema-900 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Google Meet Video Feeds</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dual webcam tiles below the cinema player let you see and hear each other with crystal clear WebRTC low-latency audio.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 bg-cinema-950">
        <p>© 2026 ShareWatching. Built with Next.js, MongoDB, TypeScript, Tailwind CSS & Amazon S3.</p>
      </footer>

      {showWatchModal && (
        <WatchTogetherModal isOpen={showWatchModal} onClose={() => setShowWatchModal(false)} />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Film, Video, User, LogOut, Sparkles, Tv } from "lucide-react";
import WatchTogetherModal from "./WatchTogetherModal";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-cinema-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight text-white">ShareWatching</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Zero-Buffer
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Sync Theater & Video Meet</p>
            </div>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowWatchModal(true)}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 text-white font-medium text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Tv className="w-4 h-4" />
                  <span>Watch Together</span>
                  <span className="hidden md:inline-flex text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">
                    5-Digit Code
                  </span>
                </button>

                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
                >
                  <Video className="w-4 h-4 text-brand-400" />
                  <span className="hidden sm:inline">My Portfolio</span>
                </Link>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                    />
                    <span className="text-sm font-medium text-slate-200 hidden md:inline">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-cinema-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <User className="w-4 h-4 text-brand-400" />
                        <span>Dashboard & Videos</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-md shadow-brand-600/25 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Watch Together 5-Digit Room Modal */}
      {showWatchModal && (
        <WatchTogetherModal isOpen={showWatchModal} onClose={() => setShowWatchModal(false)} />
      )}
    </>
  );
}

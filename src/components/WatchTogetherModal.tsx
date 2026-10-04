"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Tv,
  Copy,
  Check,
  Users,
  Play,
  Film,
  Sparkles,
  AlertCircle,
  Loader2,
  LogIn,
} from "lucide-react";
import { IRoom, IVideo } from "@/types";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";

interface WatchTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCode?: string;
}

export default function WatchTogetherModal({
  isOpen,
  onClose,
  preSelectedCode,
}: WatchTogetherModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"choose" | "host" | "join" | "selectVideo">("choose");
  const [roomCode, setRoomCode] = useState<string>(preSelectedCode || "");
  const [inputCode, setInputCode] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<IRoom | null>(null);
  const [availableVideos, setAvailableVideos] = useState<IVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If preSelectedCode was provided, jump to join
  useEffect(() => {
    if (preSelectedCode) {
      setInputCode(preSelectedCode);
      setMode("join");
    }
  }, [preSelectedCode]);

  // Handle Host Room Creation
  const handleHostRoom = async () => {
    if (!user) {
      setError("Please sign in or create an account to host a watch party.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");

      setRoomCode(data.room.code);
      setCurrentRoom(data.room);
      setMode("host");
    } catch (err: any) {
      setError(err.message || "Failed to create watch party");
    } finally {
      setLoading(false);
    }
  };

  // Handle Guest Joining
  const handleJoinRoom = async () => {
    if (!user) {
      setError("Please sign in or create an account to join a watch party.");
      return;
    }

    if (!inputCode || inputCode.trim().length !== 5) {
      setError("Please enter a valid 5-digit room code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/rooms/${inputCode.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");

      setRoomCode(inputCode.trim());
      setCurrentRoom(data.room);
      setMode("selectVideo");
      loadRoomVideos(inputCode.trim());
    } catch (err: any) {
      setError(err.message || "Could not join watch party");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available videos from both users
  const loadRoomVideos = async (code: string) => {
    try {
      const res = await fetchWithAuth(`/api/rooms/${code}/videos`);
      if (res.ok) {
        const data = await res.json();
        setAvailableVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to load room videos", err);
    }
  };

  // Poll room status when in Host or SelectVideo mode
  useEffect(() => {
    if (!roomCode || (mode !== "host" && mode !== "selectVideo")) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`/api/rooms/${roomCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const room: IRoom = data.room;

        if (room) {
          setCurrentRoom(room);

          // If in host mode and guest joins -> advance to video selection!
          if (mode === "host" && room.guestUserId) {
            setMode("selectVideo");
            loadRoomVideos(roomCode);
          }

          // Sync selected video if partner changed it
          if (room.selectedVideo && room.selectedVideo.id !== selectedVideoId) {
            setSelectedVideoId(room.selectedVideo.id);
          }

          // If room transitioned to watching, navigate both users!
          if (room.status === "watching") {
            router.push(`/room/${roomCode}`);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [roomCode, mode, selectedVideoId, router]);

  // Video selection by either user
  const handleSelectVideo = async (video: IVideo) => {
    setSelectedVideoId(video.id);
    try {
      await fetchWithAuth(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select-video", videoId: video.id }),
      });
    } catch (err) {
      console.error("Failed to select video", err);
    }
  };

  // Watch Now Trigger
  const handleStartWatching = async () => {
    if (!selectedVideoId) {
      setError("Please select a video to watch together");
      return;
    }

    setLoading(true);
    try {
      await fetchWithAuth(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start-watch" }),
      });

      router.push(`/room/${roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to start watch session");
      setLoading(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-cinema-900 border border-slate-700/80 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Watch Together</h2>
              <p className="text-xs text-slate-400">
                Synchronized 2-Person Cinema with Real-Time Video Meet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between space-x-2 text-red-300 text-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {!user && (
              <Link
                href="/login"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-semibold text-[11px] whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        )}

        {/* Not Logged In Warning Banner */}
        {!user && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogIn className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-amber-200">Sign In Required</p>
                <p className="text-[11px] text-amber-300/80">
                  Please sign in to host or join with a 5-digit code.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* STEP 1: CHOOSE HOST OR JOIN */}
        {mode === "choose" && (
          <div className="mt-6 space-y-4">
            <div
              onClick={handleHostRoom}
              className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-brand-500/60 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors">
                      Host a Watch Party
                    </h3>
                    <p className="text-xs text-slate-400">
                      Generate a random 5-digit code and invite a friend
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20">
                  Host
                </span>
              </div>
            </div>

            <div
              onClick={() => {
                if (!user) {
                  setError("Please sign in or create an account to join a watch party.");
                  return;
                }
                setError(null);
                setMode("join");
              }}
              className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      Join with 5-Digit Code
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter a friend&apos;s code to connect and watch together
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                  Join
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: HOST VIEW (SHOWS 5-DIGIT CODE & WAITS FOR GUEST) */}
        {mode === "host" && (
          <div className="mt-6 text-center space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your 5-Digit Match Code
              </span>
              <div className="my-3 flex items-center justify-center space-x-2">
                <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-brand-400 drop-shadow-md">
                  {roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Share this code with your friend. Max 2 viewers allowed for private synced viewing.
              </p>

              <div className="mt-4 flex items-center justify-center space-x-3">
                <button
                  onClick={copyRoomCode}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Code!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy 5-Digit Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Waiting for partner to enter code...</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setMode("choose")}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                Cancel and go back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: JOIN VIEW (INPUT 5-DIGIT CODE) */}
        {mode === "join" && (
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Enter 5-Digit Room Code
              </label>
              <input
                type="text"
                maxLength={5}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 58392"
                autoFocus
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700 text-brand-400 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                Ask the host for their 5-digit code
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={inputCode.length !== 5 || loading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-indigo-600/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Join Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SYNCED VIDEO SELECTION (FOR BOTH USERS) */}
        {mode === "selectVideo" && (
          <div className="mt-6 space-y-5">
            {/* Connected Participants Header */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">
                  Matched! Host: {currentRoom?.hostName} & Guest: {currentRoom?.guestName || "You"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Code: {roomCode}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select a Video to Watch Together
                </span>
                <span className="text-xs text-brand-400">
                  {availableVideos.length} Available Video{availableVideos.length === 1 ? "" : "s"}
                </span>
              </div>

              {availableVideos.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800">
                  <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">No pre-uploaded videos found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload a video to your portfolio first, or ask your partner to upload one.
                  </p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableVideos.map((video) => {
                    const isSelected = selectedVideoId === video.id;
                    const isOwner = video.userId === user?.id;

                    return (
                      <div
                        key={video.id}
                        onClick={() => handleSelectVideo(video)}
                        className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                          isSelected
                            ? "bg-brand-500/15 border-brand-500/80 shadow-md shadow-brand-500/10"
                            : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "bg-brand-500 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Film className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isSelected ? "text-brand-300" : "text-white"
                              }`}
                            >
                              {video.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {video.duration > 0 && `${Math.round(video.duration)}s • `}
                              {(video.fileSize / (1024 * 1024)).toFixed(1)} MB •{" "}
                              {isOwner ? "From your portfolio" : "From partner's portfolio"}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="flex-shrink-0 flex items-center space-x-1 text-xs font-semibold text-brand-400 bg-brand-500/20 px-2.5 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 hover:text-slate-300">
                            Pick
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Launch Watch Party */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-xs text-slate-500">
                {selectedVideoId ? "Ready to launch player & video meet" : "Select a video to continue"}
              </span>
              <button
                onClick={handleStartWatching}
                disabled={!selectedVideoId || loading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Watch Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

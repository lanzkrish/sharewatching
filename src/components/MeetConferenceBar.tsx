"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Sparkles,
  Users,
  ShieldCheck,
} from "lucide-react";
import { IUser } from "@/types";

interface MeetConferenceBarProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  currentUser: IUser;
  partnerName: string;
  isHost: boolean;
  roomCode: string;
  onToggleMic: (enabled: boolean) => void;
  onToggleCam: (enabled: boolean) => void;
  onToggleChat: () => void;
  onLeaveRoom: () => void;
  unreadCount?: number;
}

export default function MeetConferenceBar({
  localStream,
  remoteStream,
  currentUser,
  partnerName,
  isHost,
  roomCode,
  onToggleMic,
  onToggleCam,
  onToggleChat,
  onLeaveRoom,
  unreadCount = 0,
}: MeetConferenceBarProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleMicToggle = () => {
    const next = !isMicOn;
    setIsMicOn(next);
    onToggleMic(next);
  };

  const handleCamToggle = () => {
    const next = !isCamOn;
    setIsCamOn(next);
    onToggleCam(next);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full mt-4 space-y-4">
      {/* Dual Video Camera Tiles (Google Meet Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Participant Card */}
        <div className="relative aspect-video sm:h-52 bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
          {localStream && isCamOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-cinema-950">
              <div className="w-16 h-16 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center text-brand-300 text-xl font-bold mb-2">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-slate-400">Camera is turned off</p>
            </div>
          )}

          {/* User Badge Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10">
              <span className="text-xs font-medium text-white truncate">
                {currentUser.name} (You)
              </span>
              <span className="text-[10px] text-brand-400 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded">
                {isHost ? "Host" : "Guest"}
              </span>
            </div>

            <div
              className={`p-1.5 rounded-lg backdrop-blur-md ${
                isMicOn ? "bg-black/60 text-emerald-400" : "bg-red-500/80 text-white"
              }`}
            >
              {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Remote Participant Card */}
        <div className="relative aspect-video sm:h-52 bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-cinema-950 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xl font-bold mb-2">
                {partnerName ? partnerName.charAt(0).toUpperCase() : <Users className="w-6 h-6" />}
              </div>
              <p className="text-sm font-semibold text-white">
                {partnerName || "Waiting for partner..."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {partnerName
                  ? "Connecting peer video stream..."
                  : `Share room code ${roomCode} with a friend`}
              </p>
            </div>
          )}

          {/* Remote User Badge Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10">
              <span className="text-xs font-medium text-white truncate">
                {partnerName || "Partner"}
              </span>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {isHost ? "Guest" : "Host"}
              </span>
            </div>

            {remoteStream && (
              <div className="p-1.5 rounded-lg backdrop-blur-md bg-black/60 text-emerald-400">
                <Mic className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Strip (Google Meet style) */}
      <div className="p-3 rounded-2xl bg-cinema-900/95 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Room Code info */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Copy Room Code"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">2-Person Encrypted Room</span>
        </div>

        {/* Center: Main Media Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mic Button */}
          <button
            onClick={handleMicToggle}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isMicOn
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
            title={isMicOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={handleCamToggle}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isCamOn
                ? "bg-slate-800 hover:bg-slate-700 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
            title={isCamOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={onToggleChat}
            className="relative p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-md"
            title="Toggle In-Room Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* End Call / Leave */}
          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
            title="Leave Watch Party"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Leave Party</span>
          </button>
        </div>

        {/* Right status */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Google Meet Voice & Video Active</span>
        </div>
      </div>
    </div>
  );
}

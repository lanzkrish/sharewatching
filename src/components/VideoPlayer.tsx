"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  RotateCw,
  Loader2,
} from "lucide-react";
import { IVideo, PlaybackAction } from "@/types";
import {
  isLocallyCached,
  getCachedVideoObjectUrl,
  cacheVideoLocally,
} from "@/lib/localCache";

interface VideoPlayerProps {
  video: IVideo;
  roomCode: string;
  isHost: boolean;
  onSendAction: (action: PlaybackAction) => void;
  incomingAction: PlaybackAction | null;
  onReactionSent?: (emoji: string) => void;
}

export default function VideoPlayer({
  video,
  roomCode,
  isHost,
  onSendAction,
  incomingAction,
  onReactionSent,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [effectiveSrc, setEffectiveSrc] = useState(video.url);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>("In Sync");
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Prevent recursive echo loops when receiving remote action
  const isRemoteAction = useRef(false);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Check initial local cache state
  useEffect(() => {
    let isMounted = true;
    async function checkCache() {
      const cached = await isLocallyCached(video.id);
      if (cached && isMounted) {
        setIsCached(true);
        const objectUrl = await getCachedVideoObjectUrl(video.id);
        if (objectUrl && isMounted) {
          setEffectiveSrc(objectUrl);
        }
      } else if (isMounted) {
        setIsCached(false);
        setEffectiveSrc(video.url);
      }
    }
    checkCache();
    return () => {
      isMounted = false;
    };
  }, [video.id, video.url]);

  // Handle Local Cache Download
  const handleDownloadToCache = async () => {
    if (isDownloading || isCached) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const blobUrl = await cacheVideoLocally(video.id, video.url, (percent) => {
        setDownloadProgress(percent);
      });
      setIsCached(true);
      setEffectiveSrc(blobUrl);

      // Notify peer that you have cached the video
      onSendAction({ type: "CACHE_STATUS", isCached: true, cachedPercent: 100 });
    } catch (err) {
      console.error("Failed to cache video:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // React to incoming sync actions from partner
  useEffect(() => {
    if (!incomingAction || !videoRef.current) return;

    const el = videoRef.current;

    switch (incomingAction.type) {
      case "PLAY":
        isRemoteAction.current = true;
        // Sync time if drift is > 0.3s
        if (Math.abs(el.currentTime - incomingAction.currentTime) > 0.3) {
          el.currentTime = incomingAction.currentTime;
        }
        el.play().catch(() => {});
        setIsPlaying(true);
        setSyncStatus("Partner played video");
        setTimeout(() => setSyncStatus("In Sync"), 2000);
        break;

      case "PAUSE":
        isRemoteAction.current = true;
        el.pause();
        if (Math.abs(el.currentTime - incomingAction.currentTime) > 0.3) {
          el.currentTime = incomingAction.currentTime;
        }
        setIsPlaying(false);
        setSyncStatus("Partner paused video");
        setTimeout(() => setSyncStatus("In Sync"), 2000);
        break;

      case "SEEK":
        isRemoteAction.current = true;
        el.currentTime = incomingAction.currentTime;
        setCurrentTime(incomingAction.currentTime);
        setSyncStatus(`Partner scrubbed to ${formatTime(incomingAction.currentTime)}`);
        setTimeout(() => setSyncStatus("In Sync"), 2500);
        break;

      case "SYNC_HEARTBEAT":
        // Auto-correct subtle drift smoothly
        if (Math.abs(el.currentTime - incomingAction.currentTime) > 0.4) {
          el.currentTime = incomingAction.currentTime;
        }
        if (incomingAction.isPlaying && el.paused) {
          el.play().catch(() => {});
          setIsPlaying(true);
        } else if (!incomingAction.isPlaying && !el.paused) {
          el.pause();
          setIsPlaying(false);
        }
        break;

      case "REACTION":
        triggerFloatingEmoji(incomingAction.emoji);
        break;
    }
  }, [incomingAction]);

  // Periodic heartbeat sync (Host sends current timestamp every 3 seconds)
  useEffect(() => {
    if (!isHost) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        onSendAction({
          type: "SYNC_HEARTBEAT",
          currentTime: videoRef.current.currentTime,
          isPlaying: !videoRef.current.paused,
          timestamp: Date.now(),
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHost, onSendAction]);

  // User playback actions
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onSendAction({
        type: "PAUSE",
        currentTime: videoRef.current.currentTime,
        timestamp: Date.now(),
      });
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onSendAction({
        type: "PLAY",
        currentTime: videoRef.current.currentTime,
        timestamp: Date.now(),
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const target = parseFloat(e.target.value);
    videoRef.current.currentTime = target;
    setCurrentTime(target);

    onSendAction({
      type: "SEEK",
      currentTime: target,
      timestamp: Date.now(),
    });
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    videoRef.current.currentTime = next;
    setCurrentTime(next);

    onSendAction({
      type: "SEEK",
      currentTime: next,
      timestamp: Date.now(),
    });
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const triggerFloatingEmoji = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2500);
  };

  const handleSendReaction = (emoji: string) => {
    triggerFloatingEmoji(emoji);
    onSendAction({ type: "REACTION", emoji, sender: "You" });
    if (onReactionSent) onReactionSent(emoji);
  };

  // Auto-hide controls when mouse is idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 group select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={effectiveSrc}
        playsInline
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onDurationChange={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onPlay={() => {
          setIsPlaying(true);
          if (!isRemoteAction.current) {
            onSendAction({
              type: "PLAY",
              currentTime: videoRef.current?.currentTime || 0,
              timestamp: Date.now(),
            });
          }
          isRemoteAction.current = false;
        }}
        onPause={() => {
          setIsPlaying(false);
          if (!isRemoteAction.current) {
            onSendAction({
              type: "PAUSE",
              currentTime: videoRef.current?.currentTime || 0,
              timestamp: Date.now(),
            });
          }
          isRemoteAction.current = false;
        }}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />

      {/* Floating Emoji Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-12 text-4xl animate-bounce transition-all duration-1000 transform -translate-y-48 opacity-90"
            style={{ left: `${item.x}%` }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Top Overlay Badges */}
      <div
        className={`absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Buffer Mode Badge */}
          {isCached ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Buffer (Cached Locally)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cloud Streaming</span>
              </div>
              <button
                onClick={handleDownloadToCache}
                disabled={isDownloading}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-600/80 hover:bg-brand-500 border border-brand-400/40 text-white text-xs font-medium backdrop-blur-md transition-all shadow-md"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Caching {downloadProgress}%</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Download to Device for 0-Buffer</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 text-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{syncStatus}</span>
          </div>
        </div>
      </div>

      {/* Floating Center Play Button on Pause */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer z-10"
        >
          <div className="w-20 h-20 rounded-full bg-brand-600/90 hover:bg-brand-500 flex items-center justify-center shadow-2xl shadow-brand-500/50 hover:scale-110 active:scale-95 transition-all text-white">
            <Play className="w-8 h-8 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="mb-3 flex items-center space-x-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer focus:outline-none accent-brand-500 hover:h-2 transition-all"
          />
        </div>

        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white" />
              )}
            </button>

            {/* Skip buttons */}
            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Forward 10s"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none accent-brand-500"
              />
            </div>

            {/* Timestamps */}
            <span className="text-xs font-mono text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Reactions & Fullscreen */}
          <div className="flex items-center space-x-2">
            {/* Quick Reactions Bar */}
            <div className="hidden sm:flex items-center space-x-1 bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/10">
              {["🍿", "❤️", "😂", "🔥", "👏"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="px-2 py-1 text-sm rounded-lg hover:bg-white/20 hover:scale-125 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import UploadVideoModal from "@/components/UploadVideoModal";
import WatchTogetherModal from "@/components/WatchTogetherModal";
import {
  Film,
  UploadCloud,
  Tv,
  HardDriveDownload,
  CheckCircle,
  Play,
  Trash2,
  Folder,
  Database,
  Sparkles,
  Zap,
  Loader2,
  Clock,
  Layers,
} from "lucide-react";
import { IVideo } from "@/types";
import {
  isLocallyCached,
  cacheVideoLocally,
  removeCachedVideo,
  getAllCachedVideoIds,
} from "@/lib/localCache";
import { fetchWithAuth } from "@/lib/api";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState<IVideo[]>([]);
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, number>>({});
  const [downloadingMap, setDownloadingMap] = useState<Record<string, boolean>>({});
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch portfolio videos
  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const res = await fetchWithAuth("/api/videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to fetch videos", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [user]);

  // Check local caching state for all loaded videos
  useEffect(() => {
    async function checkAllCached() {
      const cachedIds = await getAllCachedVideoIds();
      const map: Record<string, boolean> = {};
      videos.forEach((v) => {
        map[v.id] = cachedIds.includes(v.id);
      });
      setCachedMap(map);
    }
    if (videos.length > 0) {
      checkAllCached();
    }
  }, [videos]);

  // Handle Download to Device for 0-buffering
  const handleDownloadVideo = async (video: IVideo) => {
    if (downloadingMap[video.id] || cachedMap[video.id]) return;

    setDownloadingMap((prev) => ({ ...prev, [video.id]: true }));
    setDownloadProgressMap((prev) => ({ ...prev, [video.id]: 0 }));

    try {
      await cacheVideoLocally(video.id, video.url, (percent) => {
        setDownloadProgressMap((prev) => ({ ...prev, [video.id]: percent }));
      });
      setCachedMap((prev) => ({ ...prev, [video.id]: true }));
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download video to local storage.");
    } finally {
      setDownloadingMap((prev) => ({ ...prev, [video.id]: false }));
    }
  };

  // Remove from local cache
  const handleRemoveFromCache = async (videoId: string) => {
    await removeCachedVideo(videoId);
    setCachedMap((prev) => ({ ...prev, [videoId]: false }));
  };

  // Delete video from portfolio
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to remove this video from your portfolio?")) return;
    try {
      const res = await fetchWithAuth(`/api/videos/${videoId}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
        await removeCachedVideo(videoId);
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Total storage calculated
  const totalStorage = videos.reduce((acc, v) => acc + (v.fileSize || 0), 0);
  const totalCachedCount = Object.values(cachedMap).filter(Boolean).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-slate-400">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Banner & Actions */}
        <div className="relative rounded-3xl bg-gradient-to-r from-cinema-900 via-slate-900 to-indigo-950/60 border border-slate-800/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="ambient-glow -top-20 -right-20 w-80 h-80 bg-brand-600/20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                alt={user.name}
                className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-brand-500/30 object-cover shadow-lg"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{user.name}</h1>
                  <span className="text-xs bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">
                    Pro Viewer
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
                  <Folder className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-mono text-[11px] text-slate-300">
                    S3 Folder: users/{user.id}/videos/
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowWatchModal(true)}
                className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Tv className="w-5 h-5" />
                <span>Watch Together</span>
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded-md">
                  5-Digit Code
                </span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UploadCloud className="w-5 h-5 text-brand-400" />
                <span>Upload to Portfolio</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Uploaded Videos</p>
                <p className="text-lg font-bold text-white">{videos.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Locally Cached (0s Buffer)</p>
                <p className="text-lg font-bold text-white">
                  {totalCachedCount} / {videos.length}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Portfolio Storage</p>
                <p className="text-lg font-bold text-white">{formatBytes(totalStorage)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Your Video Portfolio</h2>
              <p className="text-xs text-slate-400">
                Pre-upload movies and videos to your private S3 folder, or download them locally for instant playback
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              <span>+ Add Video</span>
            </button>
          </div>

          {/* Videos Grid */}
          {isLoadingVideos ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
              <p className="text-xs text-slate-400">Loading your portfolio videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-cinema-900/60 border border-slate-800 p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto text-brand-400">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Your Portfolio is Empty</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Upload a video from your computer to store it in your Amazon S3 folder. You can pre-download it locally to eliminate mid-movie buffering!
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-lg shadow-brand-600/30 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload First Video</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map((video) => {
                const isCached = cachedMap[video.id];
                const isDownloading = downloadingMap[video.id];
                const progress = downloadProgressMap[video.id] || 0;

                return (
                  <div
                    key={video.id}
                    className="group rounded-2xl bg-cinema-900 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden flex flex-col shadow-lg"
                  >
                    {/* Video Card Thumbnail/Preview Header */}
                    <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
                      <video
                        src={video.url}
                        preload="metadata"
                        className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      {/* Cache Badge on Thumbnail */}
                      <div className="absolute top-3 left-3">
                        {isCached ? (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>0s Buffer Ready</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 text-[10px] font-medium backdrop-blur-md">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>S3 Cloud</span>
                          </span>
                        )}
                      </div>

                      {/* Delete action */}
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 text-slate-300 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete from Portfolio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Duration on preview */}
                      {video.duration > 0 && (
                        <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded bg-black/70 text-slate-300 font-mono text-[11px] backdrop-blur-md">
                          {Math.floor(video.duration / 60)}:
                          {(video.duration % 60).toString().padStart(2, "0")}
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-semibold text-white text-sm line-clamp-1">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 mt-2 text-[11px] text-slate-500">
                          <span>{formatBytes(video.fileSize)}</span>
                          <span>•</span>
                          <span>{video.folderPath}</span>
                        </div>
                      </div>

                      {/* Zero-Buffer Cache & Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        {/* Download / Cache Button */}
                        {isCached ? (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                            <span className="flex items-center space-x-1.5 text-emerald-300 font-medium">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span>Downloaded to Device</span>
                            </span>
                            <button
                              onClick={() => handleRemoveFromCache(video.id)}
                              className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        ) : isDownloading ? (
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                                <span>Downloading for 0-buffer...</span>
                              </span>
                              <span className="font-mono text-brand-300 font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownloadVideo(video)}
                            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                          >
                            <HardDriveDownload className="w-3.5 h-3.5 text-brand-400" />
                            <span>Download to Device (0s Buffer)</span>
                          </button>
                        )}

                        {/* Watch Party button for this video */}
                        <button
                          onClick={() => setShowWatchModal(true)}
                          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>Watch Together (Share 5-Digit Code)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showUploadModal && (
        <UploadVideoModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onVideoUploaded={(newVid) => {
            setVideos((prev) => [newVid, ...prev]);
          }}
        />
      )}

      {showWatchModal && (
        <WatchTogetherModal
          isOpen={showWatchModal}
          onClose={() => setShowWatchModal(false)}
        />
      )}
    </div>
  );
}

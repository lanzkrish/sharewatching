"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, Film, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { IVideo } from "@/types";
import { fetchWithAuth } from "@/lib/api";

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoUploaded: (video: IVideo) => void;
}

export default function UploadVideoModal({ isOpen, onClose, onVideoUploaded }: UploadVideoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFile(null);
    setTitle("");
    setDescription("");
    setError(null);
    setUploadProgress(0);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, WebM, MOV, etc.)");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setError(null);
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }

    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setError("Please provide a title and select a video file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 1. Get S3 presigned PUT URL (delegates to backend server with secure AWS credentials)
      let presignedRes = await fetchWithAuth("/api/videos/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "video/mp4",
        }),
      });

      let presignedData = await presignedRes.json().catch(() => null);

      // Direct fallback to backend server proxy if Next.js route failed
      if (!presignedData || !presignedData.uploadUrl) {
        try {
          const directServerRes = await fetch("/api/server/api/videos/presigned-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: "user",
              fileName: file.name,
              contentType: file.type || "video/mp4",
            }),
          });
          if (directServerRes.ok) {
            presignedData = await directServerRes.json();
          }
        } catch {}
      }

      if (!presignedData || !presignedData.uploadUrl) {
        throw new Error(
          presignedData?.message ||
            "Unable to generate S3 upload URL. Please verify the backend server is running."
        );
      }

      // 2. Upload directly to Amazon S3 via XMLHttpRequest with real-time progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedData.uploadUrl, true);
        if (file.type) {
          xhr.setRequestHeader("Content-Type", file.type);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 95);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            let s3Msg = `AWS S3 upload failed with status ${xhr.status} (${xhr.statusText})`;
            try {
              const parser = new DOMParser();
              const xml = parser.parseFromString(xhr.responseText, "text/xml");
              const code = xml.getElementsByTagName("Code")[0]?.textContent;
              const msg = xml.getElementsByTagName("Message")[0]?.textContent;
              if (code && msg) {
                s3Msg = `AWS S3 Error [${code}]: ${msg}`;
              }
            } catch {}
            reject(new Error(s3Msg));
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              "Network error uploading to S3. Please verify your S3 bucket CORS permissions."
            )
          );
        };

        xhr.send(file);
      });

      // 3. Save video record in MongoDB database
      const recordRes = await fetchWithAuth("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          s3Key: presignedData.s3Key,
          url: presignedData.fileUrl,
          isLocal: false,
          fileSize: file.size,
          duration: Math.round(duration),
          mimeType: file.type || "video/mp4",
        }),
      });

      const recordData = await recordRes.json();
      if (recordRes.ok && recordData.video) {
        onVideoUploaded(recordData.video);
        handleClose();
      } else {
        throw new Error(recordData.error || "Failed to record video details in database");
      }
    } catch (err: any) {
      console.error("Direct S3 upload error:", err);
      setError(err.message || "An error occurred while uploading video to Amazon S3");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-cinema-900 border border-slate-700/80 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Video to Portfolio</h2>
              <p className="text-xs text-slate-400">
                Pre-upload for seamless, zero-buffer co-watching parties
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* File Picker / Drop Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Video File (MP4, WebM, MOV)
            </label>
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-2xl hover:border-brand-500/60 bg-slate-950/40 hover:bg-slate-900/50 cursor-pointer transition-all">
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-300">Click to upload or drag video</span>
                <span className="text-xs text-slate-500 mt-1">Direct stream upload (low memory)</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <Film className="w-6 h-6 text-brand-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                        {duration > 0 && ` • ${Math.round(duration)}s`}
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 p-1 font-medium"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hidden video element to read duration */}
          {previewUrl && (
            <video
              ref={videoRef}
              src={previewUrl}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />
          )}

          {/* Video Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inception (2010) or Vacation Trip"
              disabled={isUploading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes or details about this video..."
              disabled={isUploading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm resize-none"
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                  <span>Uploading directly to Amazon S3...</span>
                </span>
                <span className="font-mono text-brand-300 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-indigo-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title || isUploading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-brand-600/30 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Add to Portfolio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

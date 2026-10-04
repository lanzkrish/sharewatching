"use client";

const DB_NAME = "ShareWatchingLocalCache";
const DB_VERSION = 1;
const STORE_NAME = "videos";

interface CachedVideoRecord {
  videoId: string;
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "videoId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Checks if a video is already stored in local IndexedDB.
 */
export async function isLocallyCached(videoId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(videoId);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Downloads a video from S3 / remote URL into IndexedDB with stream progress tracking.
 * Guarantees zero-buffering instant local playback.
 */
export async function cacheVideoLocally(
  videoId: string,
  videoUrl: string,
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<string> {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const contentLengthHeader = response.headers.get("Content-Length");
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  const contentType = response.headers.get("Content-Type") || "video/mp4";

  let loadedBytes = 0;
  const reader = response.body?.getReader();

  if (!reader) {
    const blob = await response.blob();
    await saveBlobToDB(videoId, blob, contentType);
    return URL.createObjectURL(blob);
  }

  const chunks: BlobPart[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      loadedBytes += value.length;
      if (onProgress && totalBytes > 0) {
        const percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
        onProgress(percent, loadedBytes, totalBytes);
      } else if (onProgress) {
        onProgress(50, loadedBytes, 0);
      }
    }
  }

  const completeBlob = new Blob(chunks, { type: contentType });
  await saveBlobToDB(videoId, completeBlob, contentType);

  if (onProgress) {
    onProgress(100, loadedBytes, totalBytes || loadedBytes);
  }

  return URL.createObjectURL(completeBlob);
}

function saveBlobToDB(videoId: string, blob: Blob, mimeType: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record: CachedVideoRecord = {
        videoId,
        blob,
        mimeType,
        size: blob.size,
        cachedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Returns a local blob: URL for the cached video to eliminate buffering.
 */
export async function getCachedVideoObjectUrl(videoId: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(videoId);

      req.onsuccess = () => {
        const record = req.result as CachedVideoRecord | undefined;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Delete a cached video from local storage
 */
export async function removeCachedVideo(videoId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(videoId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to remove cached video", err);
  }
}

/**
 * Get all cached video IDs on this device
 */
export async function getAllCachedVideoIds(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

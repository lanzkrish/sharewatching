"use client";

import { io, Socket } from "socket.io-client";
import { PlaybackAction, IVideo, IChatMessage } from "@/types";

let socketInstance: Socket | null = null;

function getSocketUrl(): string {
  if (typeof window === "undefined") return "";

  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const isHttps = window.location.protocol === "https:";

  // 1. Localhost development
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return envUrl || "http://localhost:5008";
  }

  // 2. If envUrl is explicitly provided
  if (envUrl) {
    // If the live page is loaded over HTTPS, but envUrl is HTTP (like http://64.227.172.18:5008),
    // modern browsers immediately block it as Mixed Content!
    // We seamlessly route it via the same-origin HTTPS proxy (/socket.io) in netlify.toml
    if (isHttps && envUrl.startsWith("http://")) {
      console.warn(
        `[Socket.IO] Insecure HTTP socket URL (${envUrl}) detected on HTTPS page. Routing via same-origin proxy to prevent browser Mixed Content block.`
      );
      return window.location.origin;
    }
    return envUrl;
  }

  // 3. In production, default to same-origin (proxied to backend via netlify.toml)
  return window.location.origin;
}

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    const targetUrl = getSocketUrl();
    console.log(`[Socket.IO] Initializing connection to: ${targetUrl || "same-origin"}`);

    socketInstance = io(targetUrl, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketInstance.on("connect", () => {
      console.log(`[Socket.IO] ✅ Connected to signaling server! (Socket ID: ${socketInstance?.id})`);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("[Socket.IO] ⚠️ Connection error:", err.message);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
    });
  }

  return socketInstance;
}

export function joinSocketRoom(roomCode: string, userId: string, username: string, isHost: boolean) {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("join-room", { roomCode, userId, username, isHost });
  } else if (socket) {
    socket.once("connect", () => {
      socket.emit("join-room", { roomCode, userId, username, isHost });
    });
  }
}

export function sendSocketSignal(
  roomCode: string,
  targetUserId: string | null | undefined,
  type: "offer" | "answer" | "ice-candidate",
  payload: any
) {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("signal", {
      roomCode,
      targetUserId,
      type,
      payload,
    });
  }
}

export function sendSocketVideoAction(roomCode: string, action: PlaybackAction) {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("video-action", { roomCode, action });
  }
}

export function sendSocketSelectVideo(roomCode: string, video: IVideo) {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("select-video", { roomCode, video });
  }
}

export function sendSocketChatMessage(roomCode: string, message: IChatMessage) {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("chat-message", { roomCode, message });
  }
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

"use client";

import { io, Socket } from "socket.io-client";
import { PlaybackAction, IVideo, IChatMessage } from "@/types";

let socketInstance: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5008"
    : "");

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!socketInstance && SOCKET_URL) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("[Socket.IO] Connected to signaling server:", socketInstance?.id);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("[Socket.IO] Connection error (falling back to HTTP signaling if needed):", err.message);
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

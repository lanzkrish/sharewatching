const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 5008;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// In-memory room and socket registry
// Map<roomCode, Map<userId, { socketId, username, isHost, joinedAt }>>
const activeRooms = new Map();
// Map<socketId, { roomCode, userId, username }>
const socketRegistry = new Map();

// STUN and TURN server credentials
const defaultIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

if (process.env.TURN_URL) {
  defaultIceServers.push({
    urls: process.env.TURN_URL,
    username: process.env.TURN_USERNAME || "",
    credential: process.env.TURN_PASSWORD || "",
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    activeRooms: activeRooms.size,
    connectedSockets: socketRegistry.size,
    timestamp: new Date().toISOString(),
  });
});

// ICE configuration endpoint for clients
app.get("/api/ice-servers", (req, res) => {
  res.json({ iceServers: defaultIceServers });
});

// Socket.IO Real-Time Signaling & Playback Sync
io.on("connection", (socket) => {
  console.log(`[Socket Connected] id=${socket.id}`);

  // Join Room
  socket.on("join-room", ({ roomCode, userId, username, isHost }) => {
    if (!roomCode || !userId) return;

    socket.join(`room:${roomCode}`);
    socketRegistry.set(socket.id, { roomCode, userId, username });

    if (!activeRooms.has(roomCode)) {
      activeRooms.set(roomCode, new Map());
    }

    const roomUsers = activeRooms.get(roomCode);
    roomUsers.set(userId, {
      socketId: socket.id,
      userId,
      username: username || "Guest",
      isHost: Boolean(isHost),
      joinedAt: Date.now(),
    });

    console.log(`[User Joined] user=${username} (${userId}) room=${roomCode} (Total in room: ${roomUsers.size})`);

    // Send existing peers in this room back to the new participant
    const existingUsers = Array.from(roomUsers.values()).filter((u) => u.userId !== userId);
    socket.emit("room-users", { users: existingUsers });

    // Notify other peers in this room that a new participant joined
    socket.to(`room:${roomCode}`).emit("user-joined", {
      userId,
      username: username || "Guest",
      isHost: Boolean(isHost),
      socketId: socket.id,
    });
  });

  // WebRTC Signaling Relay (Offers, Answers, ICE Candidates)
  socket.on("signal", ({ roomCode, targetUserId, type, payload }) => {
    if (!roomCode || !type) return;

    const sender = socketRegistry.get(socket.id);
    const senderId = sender?.userId;

    if (targetUserId) {
      // Direct relay to specific peer
      const roomUsers = activeRooms.get(roomCode);
      const targetUser = roomUsers?.get(targetUserId);

      if (targetUser && targetUser.socketId) {
        io.to(targetUser.socketId).emit("signal", {
          senderId,
          type,
          payload,
        });
        return;
      }
    }

    // Broadcast to all other participants in the room
    socket.to(`room:${roomCode}`).emit("signal", {
      senderId,
      type,
      payload,
    });
  });

  // Real-Time Playback Synchronization (PLAY, PAUSE, SEEK, RATE)
  socket.on("video-action", ({ roomCode, action }) => {
    if (!roomCode || !action) return;
    const sender = socketRegistry.get(socket.id);
    socket.to(`room:${roomCode}`).emit("video-action", {
      action,
      senderId: sender?.userId,
      timestamp: Date.now(),
    });
  });

  // Video Selection Broadcast
  socket.on("select-video", ({ roomCode, video }) => {
    if (!roomCode || !video) return;
    const sender = socketRegistry.get(socket.id);
    socket.to(`room:${roomCode}`).emit("select-video", {
      video,
      senderId: sender?.userId,
      timestamp: Date.now(),
    });
  });

  // Live Room Chat
  socket.on("chat-message", ({ roomCode, message }) => {
    if (!roomCode || !message) return;
    io.to(`room:${roomCode}`).emit("chat-message", message);
  });

  // Disconnect & Cleanup
  socket.on("disconnect", () => {
    const session = socketRegistry.get(socket.id);
    if (!session) return;

    const { roomCode, userId, username } = session;
    socketRegistry.delete(socket.id);

    const roomUsers = activeRooms.get(roomCode);
    if (roomUsers) {
      roomUsers.delete(userId);
      console.log(`[User Left] user=${username} (${userId}) room=${roomCode} (Remaining: ${roomUsers.size})`);

      if (roomUsers.size === 0) {
        activeRooms.delete(roomCode);
      } else {
        socket.to(`room:${roomCode}`).emit("user-left", {
          userId,
          username,
        });
      }
    }
  });
});

process.on("uncaughtException", (err) => {
  console.error("❌ [Fatal] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Fatal] Unhandled Rejection at:", promise, "reason:", reason);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ [Fatal] Port ${PORT} is already in use by another process on this server!`);
    console.error(`👉 Change PORT in .env to another port (e.g. PORT=5005 or PORT=5050)`);
  } else {
    console.error("❌ [Fatal] Server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 ShareWatching Real-time Server Running!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Allowed CORS: ${CORS_ORIGIN}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});

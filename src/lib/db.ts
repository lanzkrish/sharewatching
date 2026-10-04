import { connectToDatabase } from "./mongodb";
import { UserModel, IUserDocument } from "@/models/User";
import { VideoModel, IVideoDocument } from "@/models/Video";
import { RoomModel, IRoomDocument } from "@/models/Room";
import { IUser, IVideo, IRoom, ISignalMessage } from "@/types";

// In-Memory Fallback Store (keeps app running if MongoDB is offline)
interface LocalStore {
  users: Map<string, any>;
  videos: Map<string, any>;
  rooms: Map<string, any>;
  signals: ISignalMessage[];
}

declare global {
  // eslint-disable-next-line no-var
  var __localDbStore: LocalStore | undefined;
}

const DEMO_PW_HASH = "$2b$10$b8NaejHcBFiZCIzaPV7Z0ec5Ys7HSGLe3D.834Lg1uc2d7NoScn2C";

if (!global.__localDbStore) {
  const users = new Map();
  const videos = new Map();

  // Pre-seed Demo Users
  users.set("usr_demo_alex", {
    id: "usr_demo_alex",
    name: "Alex (Host)",
    email: "host.alex@sharewatching.app",
    passwordHash: DEMO_PW_HASH,
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
    createdAt: new Date().toISOString(),
  });

  users.set("usr_demo_sam", {
    id: "usr_demo_sam",
    name: "Sam (Guest)",
    email: "guest.sam@sharewatching.app",
    passwordHash: DEMO_PW_HASH,
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Sam",
    createdAt: new Date().toISOString(),
  });

  // Pre-seed Demo Portfolio Videos in S3 folders
  videos.set("vid_demo_alex_1", {
    id: "vid_demo_alex_1",
    userId: "usr_demo_alex",
    title: "Tears of Steel (4K Sci-Fi)",
    description: "High-octane sci-fi short film pre-uploaded to Alex's S3 folder.",
    s3Key: "users/usr_demo_alex/videos/tears-of-steel.mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    isLocal: false,
    folderPath: "users/usr_demo_alex/videos",
    fileSize: 168000000,
    duration: 734,
    mimeType: "video/mp4",
    thumbnailUrl: "",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  });

  videos.set("vid_demo_sam_1", {
    id: "vid_demo_sam_1",
    userId: "usr_demo_sam",
    title: "Big Buck Bunny (Animation Classic)",
    description: "Classic open movie pre-uploaded to Sam's private S3 folder.",
    s3Key: "users/usr_demo_sam/videos/big-buck-bunny.mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    isLocal: false,
    folderPath: "users/usr_demo_sam/videos",
    fileSize: 158000000,
    duration: 596,
    mimeType: "video/mp4",
    thumbnailUrl: "",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  });

  global.__localDbStore = {
    users,
    videos,
    rooms: new Map(),
    signals: [],
  };
}

const localStore = global.__localDbStore;

// Helper to format documents
function mapUser(doc: any): IUser {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    name: doc.name,
    email: doc.email,
    avatar: doc.avatar || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

function mapVideo(doc: any): IVideo {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    userId: doc.userId,
    title: doc.title,
    description: doc.description || "",
    s3Key: doc.s3Key || "",
    url: doc.url,
    isLocal: Boolean(doc.isLocal),
    folderPath: doc.folderPath || `users/${doc.userId}/videos`,
    fileSize: doc.fileSize || 0,
    duration: doc.duration || 0,
    mimeType: doc.mimeType || "video/mp4",
    thumbnailUrl: doc.thumbnailUrl || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

function mapRoom(doc: any): IRoom {
  return {
    code: doc.code,
    hostUserId: doc.hostUserId,
    hostName: doc.hostName,
    guestUserId: doc.guestUserId || undefined,
    guestName: doc.guestName || undefined,
    selectedVideo: doc.selectedVideo || null,
    status: doc.status || "waiting",
    playbackState: doc.playbackState || {
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: "",
    },
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export const db = {
  // ================= USERS =================
  async findUserByEmail(email: string) {
    const mongo = await connectToDatabase();
    if (mongo) {
      const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
      return user ? { ...mapUser(user), passwordHash: user.passwordHash } : null;
    }

    for (const u of localStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase().trim()) {
        return { ...u };
      }
    }
    return null;
  },

  async findUserById(id: string) {
    const mongo = await connectToDatabase();
    if (mongo) {
      const user = await UserModel.findById(id);
      return user ? mapUser(user) : null;
    }

    const user = localStore.users.get(id);
    return user ? mapUser(user) : null;
  },

  async createUser(data: { name: string; email: string; passwordHash: string; avatar?: string }) {
    const mongo = await connectToDatabase();
    if (mongo) {
      const user = await UserModel.create({
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        avatar: data.avatar || "",
      });
      return mapUser(user);
    }

    const id = "usr_" + Math.random().toString(36).substring(2, 11);
    const newUser = {
      id,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      avatar: data.avatar || "",
      createdAt: new Date().toISOString(),
    };
    localStore.users.set(id, newUser);
    return mapUser(newUser);
  },

  // ================= VIDEOS =================
  async getVideosByUser(userId: string): Promise<IVideo[]> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const docs = await VideoModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map(mapVideo);
    }

    const list: IVideo[] = [];
    for (const v of localStore.videos.values()) {
      if (v.userId === userId) {
        list.push(mapVideo(v));
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getVideosForRoomParticipants(userIds: string[]): Promise<IVideo[]> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const docs = await VideoModel.find({ userId: { $in: userIds } }).sort({ createdAt: -1 });
      return docs.map(mapVideo);
    }

    const list: IVideo[] = [];
    for (const v of localStore.videos.values()) {
      if (userIds.includes(v.userId)) {
        list.push(mapVideo(v));
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getVideoById(id: string): Promise<IVideo | null> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const doc = await VideoModel.findById(id);
      return doc ? mapVideo(doc) : null;
    }

    const item = localStore.videos.get(id);
    return item ? mapVideo(item) : null;
  },

  async createVideo(data: {
    userId: string;
    title: string;
    description?: string;
    s3Key?: string;
    url: string;
    isLocal: boolean;
    folderPath: string;
    fileSize?: number;
    duration?: number;
    mimeType?: string;
    thumbnailUrl?: string;
  }): Promise<IVideo> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const doc = await VideoModel.create(data);
      return mapVideo(doc);
    }

    const id = "vid_" + Math.random().toString(36).substring(2, 11);
    const item = {
      id,
      ...data,
      fileSize: data.fileSize || 0,
      duration: data.duration || 0,
      mimeType: data.mimeType || "video/mp4",
      createdAt: new Date().toISOString(),
    };
    localStore.videos.set(id, item);
    return mapVideo(item);
  },

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const res = await VideoModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    }

    const item = localStore.videos.get(id);
    if (item && item.userId === userId) {
      localStore.videos.delete(id);
      return true;
    }
    return false;
  },

  // ================= ROOMS =================
  async createRoom(data: { code: string; hostUserId: string; hostName: string }): Promise<IRoom> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const doc = await RoomModel.create({
        code: data.code,
        hostUserId: data.hostUserId,
        hostName: data.hostName,
        status: "waiting",
        playbackState: {
          isPlaying: false,
          currentTime: 0,
          updatedAt: Date.now(),
          updatedBy: data.hostUserId,
        },
      });
      return mapRoom(doc);
    }

    const room = {
      code: data.code,
      hostUserId: data.hostUserId,
      hostName: data.hostName,
      status: "waiting",
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        updatedAt: Date.now(),
        updatedBy: data.hostUserId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStore.rooms.set(data.code, room);
    return mapRoom(room);
  },

  async getRoomByCode(code: string): Promise<IRoom | null> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const doc = await RoomModel.findOne({ code });
      return doc ? mapRoom(doc) : null;
    }

    const room = localStore.rooms.get(code);
    return room ? mapRoom(room) : null;
  },

  async joinRoom(code: string, guestUserId: string, guestName: string): Promise<IRoom | null> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const room = await RoomModel.findOne({ code });
      if (!room) return null;
      // If room already has guest and it's not the same guest
      if (room.guestUserId && room.guestUserId !== guestUserId) {
        return null; // Room is full (max 2 people)
      }
      room.guestUserId = guestUserId;
      room.guestName = guestName;
      if (room.status === "waiting") {
        room.status = "ready";
      }
      await room.save();
      return mapRoom(room);
    }

    const room = localStore.rooms.get(code);
    if (!room) return null;
    if (room.guestUserId && room.guestUserId !== guestUserId) {
      return null;
    }
    room.guestUserId = guestUserId;
    room.guestName = guestName;
    if (room.status === "waiting") {
      room.status = "ready";
    }
    room.updatedAt = new Date().toISOString();
    localStore.rooms.set(code, room);
    return mapRoom(room);
  },

  async selectRoomVideo(code: string, video: IVideo): Promise<IRoom | null> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const room = await RoomModel.findOne({ code });
      if (!room) return null;
      room.selectedVideoId = video.id;
      room.selectedVideo = {
        id: video.id,
        title: video.title,
        url: video.url,
        duration: video.duration,
        mimeType: video.mimeType,
      };
      await room.save();
      return mapRoom(room);
    }

    const room = localStore.rooms.get(code);
    if (!room) return null;
    room.selectedVideo = video;
    room.selectedVideoId = video.id;
    room.updatedAt = new Date().toISOString();
    localStore.rooms.set(code, room);
    return mapRoom(room);
  },

  async updateRoomPlayback(
    code: string,
    state: { isPlaying: boolean; currentTime: number; updatedBy: string }
  ): Promise<IRoom | null> {
    const now = Date.now();
    const mongo = await connectToDatabase();
    if (mongo) {
      const room = await RoomModel.findOne({ code });
      if (!room) return null;
      room.playbackState = {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        updatedAt: now,
        updatedBy: state.updatedBy,
      };
      if (room.status !== "watching") {
        room.status = "watching";
      }
      await room.save();
      return mapRoom(room);
    }

    const room = localStore.rooms.get(code);
    if (!room) return null;
    room.playbackState = {
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      updatedAt: now,
      updatedBy: state.updatedBy,
    };
    room.status = "watching";
    room.updatedAt = new Date().toISOString();
    localStore.rooms.set(code, room);
    return mapRoom(room);
  },

  async updateRoomStatus(code: string, status: "waiting" | "ready" | "watching" | "ended") {
    const mongo = await connectToDatabase();
    if (mongo) {
      await RoomModel.updateOne({ code }, { status });
      return;
    }
    const room = localStore.rooms.get(code);
    if (room) {
      room.status = status;
      room.updatedAt = new Date().toISOString();
    }
  },

  async closeRoom(code: string, userId: string): Promise<boolean> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const room = await RoomModel.findOne({ code });
      if (room && (room.hostUserId === userId || !room.hostUserId)) {
        await RoomModel.deleteOne({ code });
        return true;
      }
      return false;
    }

    const room = localStore.rooms.get(code);
    if (room && (room.hostUserId === userId || !room.hostUserId)) {
      localStore.rooms.delete(code);
      return true;
    }
    return false;
  },

  async leaveRoom(code: string, userId: string): Promise<IRoom | null> {
    const mongo = await connectToDatabase();
    if (mongo) {
      const room = await RoomModel.findOne({ code });
      if (!room) return null;

      // If host leaves, delete room permanently
      if (room.hostUserId === userId) {
        await RoomModel.deleteOne({ code });
        return null;
      }

      // If guest leaves, clear guest slots
      if (room.guestUserId === userId) {
        room.guestUserId = undefined as any;
        room.guestName = undefined as any;
        room.status = "waiting";
        await room.save();
        return mapRoom(room);
      }
      return mapRoom(room);
    }

    const room = localStore.rooms.get(code);
    if (!room) return null;

    if (room.hostUserId === userId) {
      localStore.rooms.delete(code);
      return null;
    }

    if (room.guestUserId === userId) {
      delete room.guestUserId;
      delete room.guestName;
      room.status = "waiting";
      room.updatedAt = new Date().toISOString();
      localStore.rooms.set(code, room);
      return mapRoom(room);
    }
    return mapRoom(room);
  },

  // ================= SIGNALING (WebRTC & Instant Sync) =================
  addSignal(signal: Omit<ISignalMessage, "id" | "createdAt">): ISignalMessage {
    const newSignal: ISignalMessage = {
      id: "sig_" + Math.random().toString(36).substring(2, 9),
      ...signal,
      createdAt: Date.now(),
    };
    localStore.signals.push(newSignal);

    // Keep only the last 300 signals to prevent memory growth
    if (localStore.signals.length > 300) {
      localStore.signals = localStore.signals.slice(-150);
    }

    return newSignal;
  },

  getSignalsForUser(roomCode: string, userId: string, since: number = 0): ISignalMessage[] {
    return localStore.signals.filter((s) => {
      if (s.roomCode !== roomCode) return false;
      if (s.createdAt <= since) return false;
      // Deliver if intended for this user or broadcast to room (except sender themselves)
      if (s.senderId === userId) return false;
      return !s.recipientId || s.recipientId === userId;
    });
  },
};

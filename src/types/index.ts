export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface IVideo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  s3Key?: string;
  url: string; // S3 presigned / public URL or local URL
  isLocal: boolean;
  folderPath: string; // e.g. users/{userId}/videos
  fileSize: number; // bytes
  duration: number; // seconds
  mimeType: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface IRoom {
  code: string; // 5-digit code e.g. "83912"
  hostUserId: string;
  hostName: string;
  guestUserId?: string;
  guestName?: string;
  selectedVideo?: IVideo | null;
  status: "waiting" | "ready" | "watching" | "ended";
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    updatedAt: number;
    updatedBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type PlaybackAction =
  | { type: "PLAY"; currentTime: number; timestamp: number }
  | { type: "PAUSE"; currentTime: number; timestamp: number }
  | { type: "SEEK"; currentTime: number; timestamp: number }
  | { type: "SYNC_HEARTBEAT"; currentTime: number; isPlaying: boolean; timestamp: number }
  | { type: "CACHE_STATUS"; isCached: boolean; cachedPercent: number }
  | { type: "REACTION"; emoji: string; sender: string }
  | { type: "CHAT"; message: string; sender: string; timestamp: number };

export interface ISignalMessage {
  id: string;
  roomCode: string;
  senderId: string;
  recipientId?: string;
  type: "offer" | "answer" | "ice-candidate" | "join" | "leave" | "sync-action" | "select-video" | "start-watch" | "chat";
  payload: any;
  createdAt: number;
}

export interface IChatMessage {
  id?: string;
  sender: string;
  text: string;
  timestamp?: number;
  isSystem?: boolean;
}


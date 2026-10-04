import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoomDocument extends Document {
  code: string; // 5-digit code e.g. "58291"
  hostUserId: string;
  hostName: string;
  guestUserId?: string;
  guestName?: string;
  selectedVideoId?: string;
  selectedVideo?: {
    id: string;
    title: string;
    url: string;
    duration: number;
    mimeType: string;
  };
  status: "waiting" | "ready" | "watching" | "ended";
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    updatedAt: number;
    updatedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoomDocument>(
  {
    code: { type: String, required: true, unique: true, index: true },
    hostUserId: { type: String, required: true },
    hostName: { type: String, required: true },
    guestUserId: { type: String, default: "" },
    guestName: { type: String, default: "" },
    selectedVideoId: { type: String, default: "" },
    selectedVideo: {
      id: String,
      title: String,
      url: String,
      duration: Number,
      mimeType: String,
    },
    status: {
      type: String,
      enum: ["waiting", "ready", "watching", "ended"],
      default: "waiting",
    },
    playbackState: {
      isPlaying: { type: Boolean, default: false },
      currentTime: { type: Number, default: 0 },
      updatedAt: { type: Number, default: () => Date.now() },
      updatedBy: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const RoomModel: Model<IRoomDocument> =
  mongoose.models.Room || mongoose.model<IRoomDocument>("Room", RoomSchema);

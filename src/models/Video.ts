import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVideoDocument extends Document {
  userId: string;
  title: string;
  description?: string;
  s3Key?: string;
  url: string;
  isLocal: boolean;
  folderPath: string; // users/{userId}/videos
  fileSize: number;
  duration: number;
  mimeType: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideoDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    s3Key: { type: String, default: "" },
    url: { type: String, required: true },
    isLocal: { type: Boolean, default: false },
    folderPath: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    mimeType: { type: String, default: "video/mp4" },
    thumbnailUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const VideoModel: Model<IVideoDocument> =
  mongoose.models.Video || mongoose.model<IVideoDocument>("Video", VideoSchema);

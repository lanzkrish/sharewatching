import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let filePath: string | null = null;
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Save under public/uploads/users/{userId}/
    const userUploadsDir = path.join(process.cwd(), "public", "uploads", "users", user.id);
    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }

    // Disk space safety check to prevent crashing the OS
    try {
      const stat = fs.statfsSync(userUploadsDir);
      const freeBytes = stat.bavail * stat.bsize;
      const expectedSize = parseInt(
        req.headers.get("x-file-size") || req.headers.get("content-length") || "0",
        10
      );

      // Require at least the file size + 500MB safety buffer for OS stability
      if (expectedSize > 0 && freeBytes < expectedSize + 500 * 1024 * 1024) {
        const freeMB = (freeBytes / (1024 * 1024)).toFixed(0);
        const neededMB = (expectedSize / (1024 * 1024)).toFixed(0);
        return NextResponse.json(
          {
            error: `Insufficient disk space: only ${freeMB} MB free on disk, but this video is ${neededMB} MB. Please free up disk space or configure Amazon S3 / Cloudflare R2 for cloud storage.`,
          },
          { status: 507 }
        );
      }
    } catch {
      // Continue if statfs is unavailable
    }

    // Direct Binary Stream Upload (Near-Zero RAM usage)
    if (req.headers.has("x-file-name") && req.body) {
      const rawFileName = req.headers.get("x-file-name") || "video.mp4";
      const fileName = decodeURIComponent(rawFileName);
      const rawTitle = req.headers.get("x-file-title") || fileName.replace(/\.[^/.]+$/, "");
      const title = decodeURIComponent(rawTitle);
      const rawDesc = req.headers.get("x-file-description") || "";
      const description = decodeURIComponent(rawDesc);
      const mimeType = req.headers.get("content-type") || "video/mp4";

      const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sanitized}`;
      filePath = path.join(userUploadsDir, uniqueFileName);

      // Stream directly from HTTP request into disk file without buffering in RAM
      const fileWriteStream = fs.createWriteStream(filePath);
      const nodeReadable = Readable.fromWeb(req.body as any);
      await pipeline(nodeReadable, fileWriteStream);

      const stats = fs.statSync(filePath);
      const publicUrl = `/uploads/users/${user.id}/${uniqueFileName}`;
      const folderPath = `users/${user.id}/videos`;

      return NextResponse.json({
        success: true,
        fileUrl: publicUrl,
        fileName: uniqueFileName,
        folderPath,
        fileSize: stats.size,
        mimeType,
        title,
        description,
      });
    }

    // Fallback: Multipart Form Data using file.stream() (streamed chunk-by-chunk)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Untitled Video";
    const description = (formData.get("description") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sanitized}`;
    filePath = path.join(userUploadsDir, uniqueFileName);

    // Stream file contents to disk instead of arrayBuffer() + Buffer.from()
    const fileWriteStream = fs.createWriteStream(filePath);
    const nodeReadable = Readable.fromWeb(file.stream() as any);
    await pipeline(nodeReadable, fileWriteStream);

    const stats = fs.statSync(filePath);
    const publicUrl = `/uploads/users/${user.id}/${uniqueFileName}`;
    const folderPath = `users/${user.id}/videos`;

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: uniqueFileName,
      folderPath,
      fileSize: stats.size,
      mimeType: file.type || "video/mp4",
      title,
      description,
    });
  } catch (error: any) {
    console.error("Local stream upload error:", error);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

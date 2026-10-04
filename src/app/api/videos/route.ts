import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await db.getVideosByUser(user.id);
    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error("Fetch videos error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch videos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, s3Key, url, isLocal, fileSize, duration, mimeType, thumbnailUrl } =
      await req.json();

    if (!title || !url) {
      return NextResponse.json({ error: "Title and video URL are required" }, { status: 400 });
    }

    const folderPath = `users/${user.id}/videos`;

    const video = await db.createVideo({
      userId: user.id,
      title,
      description: description || "",
      s3Key: s3Key || "",
      url,
      isLocal: Boolean(isLocal),
      folderPath,
      fileSize: fileSize || 0,
      duration: duration || 0,
      mimeType: mimeType || "video/mp4",
      thumbnailUrl: thumbnailUrl || "",
    });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error("Create video error:", error);
    return NextResponse.json({ error: error.message || "Failed to create video" }, { status: 500 });
  }
}

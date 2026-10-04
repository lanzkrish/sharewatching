import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generatePresignedUploadUrl, isS3Configured } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isS3Configured()) {
      return NextResponse.json({
        isS3Configured: false,
        message: "AWS S3 is not configured. Use local upload endpoint.",
      });
    }

    const { fileName, contentType } = await req.json();
    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const result = await generatePresignedUploadUrl(
      user.id,
      fileName,
      contentType || "video/mp4"
    );

    if (!result) {
      return NextResponse.json({
        isS3Configured: false,
        message: "Failed to generate presigned URL",
      });
    }

    return NextResponse.json({
      isS3Configured: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Presigned URL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

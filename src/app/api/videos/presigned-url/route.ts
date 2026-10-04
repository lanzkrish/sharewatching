import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generatePresignedUploadUrl, isS3Configured } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, contentType } = await req.json();
    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (!isS3Configured()) {
      // Check if S3 credentials are hosted on the standalone backend server (Droplet)
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (socketUrl && !socketUrl.includes("localhost")) {
        try {
          const remoteRes = await fetch(`${socketUrl}/api/videos/presigned-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              fileName,
              contentType: contentType || "video/mp4",
            }),
          });
          if (remoteRes.ok) {
            const remoteData = await remoteRes.json();
            if (remoteData.isS3Configured) {
              return NextResponse.json(remoteData);
            }
          }
        } catch (serverErr) {
          console.warn("Backend server S3 presign failed:", serverErr);
        }
      }

      return NextResponse.json({
        isS3Configured: false,
        message: "AWS S3 is not configured. Use local upload endpoint.",
      });
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

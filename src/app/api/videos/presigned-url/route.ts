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

    // 1. Primary: DigitalOcean Droplet backend server handshake
    // Keeps all AWS credentials securely isolated on the backend server
    const backendServerUrl =
      process.env.BACKEND_SERVER_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "http://64.227.172.18:5008";

    if (backendServerUrl) {
      try {
        const remoteRes = await fetch(`${backendServerUrl}/api/videos/presigned-url`, {
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
          if (remoteData.isS3Configured && remoteData.uploadUrl) {
            return NextResponse.json(remoteData);
          }
        }
      } catch (serverErr) {
        console.warn("[Presigned URL] Handshake with backend server failed, checking local config:", serverErr);
      }
    }

    // 2. Secondary: If backend server is unreachable and environment has S3 credentials
    if (isS3Configured()) {
      const result = await generatePresignedUploadUrl(
        user.id,
        fileName,
        contentType || "video/mp4"
      );

      if (result) {
        return NextResponse.json({
          isS3Configured: true,
          ...result,
        });
      }
    }

    return NextResponse.json({
      isS3Configured: false,
      message: "AWS S3 is not configured on the server. Please verify credentials in server/.env.",
    });
  } catch (error: any) {
    console.error("Presigned URL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

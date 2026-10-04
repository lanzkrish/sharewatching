import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-2";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN;
const bucketName =
  process.env.S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET_NAME ||
  "sharewatching-videos-ap-south-2";

export function isS3Configured(): boolean {
  return Boolean(accessKeyId && secretAccessKey && bucketName);
}

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client | null {
  if (!isS3Configured()) return null;
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
        ...(sessionToken ? { sessionToken } : {}),
      },
      // Prevent AWS SDK v3 from adding automatic CRC32 checksum query params to presigned URLs
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3ClientInstance;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  fileUrl: string;
  s3Key: string;
  folderPath: string;
}

/**
 * Generate a Presigned PUT URL for direct browser-to-S3 upload.
 * Videos are strictly isolated into user-specific folders:
 * users/{userId}/videos/{uniqueId}-{sanitizedFileName}
 */
export async function generatePresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<PresignedUploadResult | null> {
  const client = getS3Client();
  if (!client) return null;

  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const folderPath = `users/${userId}/videos`;
  const s3Key = `${folderPath}/${Date.now()}_${uniqueId}_${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  });

  // URL valid for 30 minutes
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 1800,
    unhoistableHeaders: new Set(["x-amz-sdk-checksum-algorithm", "x-amz-checksum-crc32"]),
  });
  const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

  return {
    uploadUrl,
    fileUrl,
    s3Key,
    folderPath,
  };
}

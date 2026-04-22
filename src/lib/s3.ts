import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "mastra-brain-agent-skills";

export async function uploadToS3(key: string, content: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: "text/markdown",
  });

  await s3Client.send(command);
  return `s3://${BUCKET_NAME}/${key}`;
}

export async function getFromS3(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const content = await response.Body?.transformToString();
  return content || "";
}

export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export function parseS3Uri(uri: string) {
  const match = uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
  if (!match) return null;
  return {
    bucket: match[1],
    key: match[2],
  };
}

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "mastra-brain-agent-skills";

export interface TreeNode {
  name: string;
  prefix: string;
  type: "folder" | "file";
  size?: number;
  lastModified?: Date;
  hasSkill?: boolean;
}

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

export async function listS3Tree(prefix: string): Promise<{ folders: TreeNode[]; files: TreeNode[] }> {
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    Delimiter: "/",
  });

  const response = await s3Client.send(command);

  const folders: TreeNode[] =
    response.CommonPrefixes?.map((cp) => ({
      name: cp.Prefix?.replace(prefix, "").replace(/\/$/, "") || "",
      prefix: cp.Prefix || "",
      type: "folder" as const,
    })) || [];

  const files: TreeNode[] =
    response.Contents?.filter((obj) => obj.Key !== prefix)
      .map((obj) => ({
        name: obj.Key?.replace(prefix, "") || "",
        prefix: obj.Key || "",
        type: "file" as const,
        size: obj.Size,
        lastModified: obj.LastModified,
      })) || [];

  return { folders, files };
}

export async function createS3Folder(prefix: string): Promise<string> {
  const key = `${prefix}.keep`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: "",
    ContentType: "application/octet-stream",
  });
  await s3Client.send(command);
  return `s3://${BUCKET_NAME}/${key}`;
}

export async function deleteS3Prefix(prefix: string): Promise<void> {
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

  const keysToDelete: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          keysToDelete.push(obj.Key);
        }
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (keysToDelete.length === 0) return;

  const BATCH_SIZE = 1000;
  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: batch.map((key) => ({ Key: key })),
        Quiet: true,
      },
    });
    await s3Client.send(deleteCommand);
  }
}

export async function uploadS3Buffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { PutObjectCommand: PutObjectCmd } = await import("@aws-sdk/client-s3");

  const command = new PutObjectCmd({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `s3://${BUCKET_NAME}/${key}`;
}

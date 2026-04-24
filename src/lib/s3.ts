import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  })
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET || "mastra-brain-agent-skills";

function buildS3Uri(key: string): string {
  return `s3://${BUCKET_NAME}/${key}`;
}

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
  return buildS3Uri(key);
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
  const folders: TreeNode[] = [];
  const files: TreeNode[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    response.CommonPrefixes?.forEach((cp) => {
      if (cp.Prefix) {
        folders.push({
          name: cp.Prefix.slice(prefix.length).replace(/\/$/, ""),
          prefix: cp.Prefix,
          type: "folder" as const,
        });
      }
    });

    response.Contents?.forEach((obj) => {
      if (obj.Key && obj.Key !== prefix) {
        files.push({
          name: obj.Key.slice(prefix.length),
          prefix: obj.Key,
          type: "file" as const,
          size: obj.Size,
          lastModified: obj.LastModified,
        });
      }
    });

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return { folders, files };
}

export async function createS3Folder(prefix: string): Promise<string> {
  const key = prefix.endsWith("/") ? `${prefix}.keep` : `${prefix}/.keep`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: "",
    ContentType: "application/octet-stream",
  });
  await s3Client.send(command);
  return buildS3Uri(key);
}

export async function deleteS3Prefix(prefix: string): Promise<void> {
  if (!prefix || prefix === "/") {
    throw new Error("Refusing to delete empty or root prefix");
  }

  let isTruncated = true;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    const keysToDelete = listResponse.Contents?.filter((obj) => obj.Key).map((obj) => ({ Key: obj.Key! })) ?? [];

    if (keysToDelete.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: keysToDelete,
          Quiet: true,
        },
      });
      await s3Client.send(deleteCommand);
    }

    isTruncated = listResponse.IsTruncated ?? false;
    continuationToken = isTruncated ? listResponse.NextContinuationToken : undefined;
  } while (isTruncated);
}

export async function uploadS3Buffer(
  key: string,
  buffer: Buffer,
  contentType = "application/octet-stream"
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return buildS3Uri(key);
}

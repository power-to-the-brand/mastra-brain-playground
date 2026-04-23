import { NextRequest, NextResponse } from 'next/server';
import { uploadS3Buffer } from '@/lib/s3';

interface UploadFile {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

function sanitizePath(path: string): string {
  const sanitized = path.replace(/^\/+/, '');
  const segments = sanitized.split('/');
  if (segments.some((segment) => segment === '..')) {
    throw new Error('Path contains invalid ".." segments');
  }
  return sanitized;
}

function validateFile(file: unknown, index: number): { valid: true; data: UploadFile } | { valid: false; error: string } {
  if (typeof file !== 'object' || file === null) {
    return { valid: false, error: `File at index ${index} is not an object` };
  }

  const f = file as Record<string, unknown>;

  if (typeof f.path !== 'string' || f.path.length === 0) {
    return { valid: false, error: `File at index ${index} has invalid path: must be a non-empty string` };
  }

  if (typeof f.content !== 'string') {
    return { valid: false, error: `File at index ${index} has invalid content: must be a string` };
  }

  if (f.encoding !== 'utf8' && f.encoding !== 'base64') {
    return { valid: false, error: `File at index ${index} has invalid encoding: must be 'utf8' or 'base64'` };
  }

  try {
    const sanitizedPath = sanitizePath(f.path);
    if (sanitizedPath.length === 0) {
      return { valid: false, error: `File at index ${index} has invalid path: empty after sanitization` };
    }
    return {
      valid: true,
      data: { path: sanitizedPath, content: f.content, encoding: f.encoding as 'utf8' | 'base64' },
    };
  } catch (err) {
    return { valid: false, error: `File at index ${index} has invalid path: ${(err as Error).message}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetPrefix, files }: { targetPrefix: string; files: UploadFile[] } = body;

    if (!targetPrefix || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = validateFile(files[i], i);
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const file = result.data;

      const key = targetPrefix.endsWith('/') ? `${targetPrefix}${file.path}` : `${targetPrefix}/${file.path}`;
      const buffer = file.encoding === 'base64' ? Buffer.from(file.content, 'base64') : Buffer.from(file.content, 'utf8');

      const contentType = key.endsWith('.md') ? 'text/markdown' : key.endsWith('.py') ? 'text/x-python' : 'application/octet-stream';
      await uploadS3Buffer(key, buffer, contentType);
      uploaded.push(key);
    }

    return NextResponse.json({ uploaded, count: uploaded.length });
  } catch (error) {
    console.error('Failed to upload files:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}

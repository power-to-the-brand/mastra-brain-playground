import { NextRequest, NextResponse } from 'next/server';
import { uploadS3Buffer } from '@/lib/s3';

interface UploadFile {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetPrefix, files }: { targetPrefix: string; files: UploadFile[] } = body;

    if (!targetPrefix || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const uploaded: string[] = [];

    for (const file of files) {
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

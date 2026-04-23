import { NextRequest, NextResponse } from 'next/server';
import { listS3Tree } from '@/lib/s3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';

  try {
    const { folders, files } = await listS3Tree(prefix);
    return NextResponse.json({ prefix, folders, files });
  } catch (error) {
    console.error('Failed to list S3 tree:', error);
    return NextResponse.json({ error: 'Failed to list tree' }, { status: 500 });
  }
}

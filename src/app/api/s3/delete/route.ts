import { NextRequest, NextResponse } from 'next/server';
import { deleteFromS3, deleteS3Prefix } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, prefix }: { key?: string; prefix?: string } = body;

    if (key) {
      await deleteFromS3(key);
      return NextResponse.json({ deleted: key });
    }

    if (prefix) {
      await deleteS3Prefix(prefix);
      return NextResponse.json({ deleted: prefix });
    }

    return NextResponse.json({ error: 'Missing key or prefix' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete from S3:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

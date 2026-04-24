import { NextRequest, NextResponse } from 'next/server';
import { deleteFromS3, deleteS3Prefix, BUCKET_NAME } from '@/lib/s3';
import { db, skills } from '@/db';
import { eq, like } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, prefix }: { key?: string; prefix?: string } = body;

    if (key) {
      await deleteFromS3(key);

      // Clean up skill record if this is a SKILL.md file
      let deletedSkills = 0;
      if (key.endsWith('/SKILL.md') || key === 'SKILL.md') {
        const s3Uri = `s3://${BUCKET_NAME}/${key}`;
        const result = await db.delete(skills).where(eq(skills.s3Location, s3Uri));
        deletedSkills = result.rowCount ?? 0;
      }

      return NextResponse.json({ deleted: key, deletedSkills });
    }

    if (prefix) {
      await deleteS3Prefix(prefix);

      // Clean up any skill records under this prefix
      const s3Pattern = `s3://${BUCKET_NAME}/${prefix}%`;
      const result = await db.delete(skills).where(like(skills.s3Location, s3Pattern));
      const deletedSkills = result.rowCount ?? 0;

      return NextResponse.json({ deleted: prefix, deletedSkills });
    }

    return NextResponse.json({ error: 'Missing key or prefix' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete from S3:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

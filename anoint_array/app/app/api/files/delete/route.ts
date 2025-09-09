

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { deleteFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cloudStoragePath = searchParams.get('path');

    if (!cloudStoragePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const success = await deleteFile(cloudStoragePath);

    if (success) {
      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

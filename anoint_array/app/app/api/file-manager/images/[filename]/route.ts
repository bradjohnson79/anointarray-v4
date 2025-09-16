
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { deleteFile } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can delete files
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = params;
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '');
    if (sanitizedFilename !== filename) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Determine storage mode to build the correct key
    const useLocalFallback = !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV === 'development';
    const { folderPrefix } = getBucketConfig();
    const key = useLocalFallback ? filename : `${folderPrefix}${filename}`;

    // Delete the file using our S3 utility (handles local and S3 storage)
    const success = await deleteFile(key);
    
    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

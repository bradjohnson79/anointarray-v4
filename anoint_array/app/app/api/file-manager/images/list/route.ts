
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readdir, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can access file manager
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    try {
      const files = await readdir(uploadsDir);
      
      // Filter for image files and format for dropdown options
      const imageExtensions = ['.jpg', '.jpeg', '.png'];
      const imageOptions = [];
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
          const filePath = path.join(uploadsDir, file);
          const stats = await stat(filePath);
          
          // Use the full filename as the display name
          const displayName = file;
          
          imageOptions.push({
            value: `/api/files/${file}`,
            label: displayName,
            filename: file,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString()
          });
        }
      }
      
      // Sort by upload date (newest first)
      imageOptions.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      return NextResponse.json({ 
        success: true,
        options: imageOptions
      });
      
    } catch (error) {
      console.error('Error reading uploads directory:', error);
      return NextResponse.json({ 
        success: true,
        options: []
      });
    }

  } catch (error) {
    console.error('Error fetching image options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image options' },
      { status: 500 }
    );
  }
}

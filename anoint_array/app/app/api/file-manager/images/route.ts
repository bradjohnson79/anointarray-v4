
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
      
      // Filter for image files and get their stats
      const imageExtensions = ['.jpg', '.jpeg', '.png'];
      const imageFiles = [];
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
          const filePath = path.join(uploadsDir, file);
          const stats = await stat(filePath);
          
          // Extract original filename from the timestamped filename
          // Format: timestamp-uniqueId.extension
          const nameParts = file.split('-');
          let originalName = file;
          if (nameParts.length >= 2) {
            // Remove timestamp and unique ID to get original name
            const withoutTimestamp = nameParts.slice(1).join('-');
            const withoutUniqueId = withoutTimestamp.substring(9); // Remove 8-char unique ID + dot
            originalName = withoutUniqueId || file;
          }
          
          imageFiles.push({
            filename: file,
            originalName: originalName,
            url: `/api/files/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString()
          });
        }
      }
      
      // Sort by upload date (newest first)
      imageFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      return NextResponse.json({ 
        success: true,
        images: imageFiles,
        count: imageFiles.length
      });
      
    } catch (error) {
      console.error('Error reading uploads directory:', error);
      return NextResponse.json({ 
        success: true,
        images: [],
        count: 0
      });
    }

  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload request received');
    
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can upload files
    if (!session) {
      console.log('❌ No session found - user not authenticated');
      return NextResponse.json({ 
        error: 'Not authenticated. Please log in as an Admin user.',
        code: 'NO_SESSION'
      }, { status: 401 });
    }
    
    if (session.user?.role !== 'ADMIN') {
      console.log('❌ User role not admin:', session.user?.role);
      return NextResponse.json({ 
        error: 'Admin privileges required. Current role: ' + (session.user?.role || 'none'),
        code: 'NOT_ADMIN',
        userRole: session.user?.role
      }, { status: 401 });
    }

    console.log('✅ Authentication successful for admin user:', session.user?.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customName = formData.get('customName') as string;
    const type = formData.get('type') as string;

    if (!file) {
      console.log('❌ No file provided in request');
      return NextResponse.json({ 
        error: 'No file provided. Please select an image to upload.',
        code: 'NO_FILE'
      }, { status: 400 });
    }

    console.log('📋 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file type (JPG/PNG only for File Manager)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { 
          error: `Invalid file type (${file.type}). Only JPG and PNG files are allowed`,
          code: 'INVALID_TYPE',
          fileType: file.type,
          allowedTypes: allowedTypes,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    console.log('✅ File type validation passed:', file.type);

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { 
          error: `File too large (${fileSizeMB}MB). Maximum size is 5MB. Please compress your image and try again.`,
          fileSize: file.size,
          maxSize: maxSize,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // Validate minimum file size (prevent empty/corrupted files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      return NextResponse.json(
        { 
          error: `File too small (${file.size} bytes). This might be a corrupted or empty file. Minimum size is 1KB.`,
          fileSize: file.size,
          minSize: minSize,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3 with custom name if provided
    const fileName = customName && customName.trim() !== '' ? customName : file.name;
    const uploadResult = await uploadFile(buffer, fileName, file.type);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload file to S3' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.publicUrl,
      cloudStoragePath: uploadResult.cloudStoragePath,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

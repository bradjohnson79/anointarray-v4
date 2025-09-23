
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { uploadFile } from '@/lib/s3';
import fs from 'fs/promises';
import path from 'path';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload request received');
    
    await requireAdmin();
    console.log('✅ Authentication successful for admin user');

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

    // Sanitize filename
    const extFromType = (file.type.split('/')[1] || '').toLowerCase();
    const originalExt = (file.name.split('.').pop() || '').toLowerCase();
    const ext = originalExt || extFromType || 'png';
    const baseName = (customName && customName.trim() !== '' ? customName : file.name)
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const finalName = `${baseName}.${ext}`;

    if (useSupabaseStorage()) {
      try {
        const supabase = createSupabaseServerClient();
        const objectPath = `${finalName}`; // root of bucket
        const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(objectPath, buffer, {
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });
        if (error) throw error;

        // Try a signed URL (works even if bucket not public)
        const signed = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(objectPath, 3600);
        const publicResult = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath);
        const url = (signed.data?.signedUrl) || publicResult.data.publicUrl;

        return NextResponse.json({
          success: true,
          url,
          cloudStoragePath: objectPath,
          size: file.size,
          type: file.type,
          storage: 'supabase',
          bucket: PRODUCT_IMAGES_BUCKET,
        });
      } catch (e: any) {
        console.error('Supabase upload failed:', e);
        return NextResponse.json({ error: 'Supabase upload failed', code: 'SUPABASE_UPLOAD_FAILED', message: String(e?.message || e) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Supabase storage not configured', code: 'SUPABASE_NOT_CONFIGURED' }, { status: 400 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        code: 'UNEXPECTED_UPLOAD_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

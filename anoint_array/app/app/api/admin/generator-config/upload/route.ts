
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const AI_RESOURCES_DIR = path.join(process.cwd(), 'data', 'ai-resources');
const CSV_DIR = path.join(AI_RESOURCES_DIR, 'csv');
const TEMPLATE_DIR = path.join(AI_RESOURCES_DIR, 'templates');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.access(AI_RESOURCES_DIR);
  } catch {
    await fs.mkdir(AI_RESOURCES_DIR, { recursive: true });
  }

  try {
    await fs.access(CSV_DIR);
  } catch {
    await fs.mkdir(CSV_DIR, { recursive: true });
  }

  try {
    await fs.access(TEMPLATE_DIR);
  } catch {
    await fs.mkdir(TEMPLATE_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDirectories();

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fileType = formData.get('fileType') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (fileType !== 'csv' && fileType !== 'template') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const targetDir = fileType === 'csv' ? CSV_DIR : TEMPLATE_DIR;
    const uploadedFiles: string[] = [];

    for (const file of files) {
      // Validate file types
      if (fileType === 'csv' && !file.name.toLowerCase().endsWith('.csv')) {
        continue; // Skip non-CSV files
      }

      if (fileType === 'template') {
        const validExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
        const hasValidExtension = validExtensions.some(ext => 
          file.name.toLowerCase().endsWith(ext)
        );
        if (!hasValidExtension) {
          continue; // Skip invalid image files
        }
      }

      // Save file
      const fileName = file.name;
      const filePath = path.join(targetDir, fileName);
      
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      uploadedFiles.push(fileName);
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedFiles.length,
      uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

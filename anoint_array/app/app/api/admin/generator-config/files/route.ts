
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

async function getFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory);
    return files.filter(file => !file.startsWith('.')); // Filter out hidden files
  } catch (error) {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDirectories();

    const csvFiles = await getFiles(CSV_DIR);
    const templateFiles = await getFiles(TEMPLATE_DIR);

    return NextResponse.json({
      csvFiles,
      templateFiles
    });

  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    if (fileType !== 'csv' && fileType !== 'template') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const targetDir = fileType === 'csv' ? CSV_DIR : TEMPLATE_DIR;
    const filePath = path.join(targetDir, fileName);

    // Check if file exists and delete it
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      return NextResponse.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

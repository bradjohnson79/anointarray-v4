import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const KB_ROOT = path.join(process.cwd(), 'data', 'support-kb');
const PDF_DIR = path.join(KB_ROOT, 'pdfs');
const MD_DIR = path.join(KB_ROOT, 'md');
const IMG_DIR = path.join(KB_ROOT, 'images');

async function ensureDirs() {
  await fs.mkdir(PDF_DIR, { recursive: true });
  await fs.mkdir(MD_DIR, { recursive: true });
  await fs.mkdir(IMG_DIR, { recursive: true });
}

function sanitize(name: string) {
  const base = name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-');
  return base.replace(/-+/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDirs();
    const form = await request.formData();
    const files = form.getAll('files') as File[];
    if (!files || files.length === 0) return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ error: 'Max 10 files per upload' }, { status: 400 });

    const uploaded: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['pdf', 'md', 'png'].includes(ext)) {
        continue; // skip unsupported
      }
      const dir = ext === 'pdf' ? PDF_DIR : ext === 'md' ? MD_DIR : IMG_DIR;
      let name = sanitize(file.name);
      let target = path.join(dir, name);
      let counter = 1;
      try {
        while (true) {
          await fs.access(target);
          const base = name.replace(/\.[^.]+$/, '');
          const e = name.includes('.') ? '.' + ext : '';
          name = `${base}-${counter++}${e}`;
          target = path.join(dir, name);
        }
      } catch {}
      await fs.writeFile(target, buffer);
      uploaded.push(name);
    }

    return NextResponse.json({ success: true, uploaded });
  } catch (e) {
    console.error('KB upload error', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

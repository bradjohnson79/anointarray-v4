import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    await ensureDirs();
    const pdfs = await fs.readdir(PDF_DIR).catch(() => []);
    const mds = await fs.readdir(MD_DIR).catch(() => []);
    const images = await fs.readdir(IMG_DIR).catch(() => []);
    return NextResponse.json({ pdfs, mds, images });
  } catch (e) {
    console.error('KB list error', e);
    return NextResponse.json({ pdfs: [], mds: [] });
  }
}

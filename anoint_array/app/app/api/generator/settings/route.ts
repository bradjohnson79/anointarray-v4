import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'generator-data', 'generator-config.json');

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const cfg = JSON.parse(data);
    const s = cfg?.settings || {};
    return NextResponse.json({
      centerX: s.centerX ?? 0,
      centerY: s.centerY ?? 0,
      centralRadius: s.centralRadius ?? 80,
      innerRadius: s.innerRadius ?? 140,
      middleRadius: s.middleRadius ?? 200,
      outerRadius: s.outerRadius ?? 260,
      canvasSize: s.canvasSize ?? 600,
      showGrid: s.showGrid ?? true,
      autoSettings: s.autoSettings ?? true,
      updatedAt: cfg?.lastUpdated || null,
    });
  } catch (e) {
    // Reasonable defaults if no config found
    return NextResponse.json({
      centerX: 0,
      centerY: 0,
      centralRadius: 80,
      innerRadius: 140,
      middleRadius: 200,
      outerRadius: 260,
      canvasSize: 600,
      showGrid: true,
      autoSettings: true,
      updatedAt: null,
    });
  }
}

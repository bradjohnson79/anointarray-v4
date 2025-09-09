import { renderSealPNGBuffer } from '../lib/seal-renderer-server';
import fs from 'fs/promises';
import path from 'path';

async function main(){
  const filename = 'seal_Brad_Allen_Johnson_torus-field_1757109015404.json';
  const full = path.join(process.cwd(), 'data', 'generated-seals', filename);
  const raw = await fs.readFile(full, 'utf-8');
  const data = JSON.parse(raw);
  const settingsPath = path.join(process.cwd(), 'generator-data', 'generator-config.json');
  const sraw = await fs.readFile(settingsPath, 'utf-8');
  const cfg = JSON.parse(sraw);
  const settings = cfg.settings || { centerX: 0, centerY: 0, centralRadius: 80, innerRadius: 140, middleRadius: 200, outerRadius: 260, canvasSize: 600 };
  const buf = await renderSealPNGBuffer({
    centralDesign: data.centralDesign,
    ring1Tokens: data.ring1Tokens,
    ring2Tokens: data.ring2Tokens,
    ring3Affirmation: data.ring3Affirmation,
  }, settings, 1200);
  const out = path.join(process.cwd(), 'uploads', 'test-export.png');
  await fs.writeFile(out, buf);
  console.log('Wrote', out, 'bytes', buf.length);
}
main().catch((e)=>{ console.error(e); process.exit(1); });

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Prefer DIRECT_URL for connectivity tests to bypass pooler if needed
const direct = process.env.DIRECT_URL || '';
const pooled = process.env.DATABASE_URL || '';
if (direct) process.env.DATABASE_URL = direct; // override for PrismaClient

const prisma = new PrismaClient();

function mask(v: string){
  if (!v) return '';
  return v.length > 8 ? `${v.slice(0,4)}…${v.slice(-4)} (len=${v.length})` : '***';
}

async function main(){
  const out: any = { pooled: !!pooled, direct: !!direct };
  try{
    const ver = await prisma.$queryRawUnsafe<any[]>(`SELECT version()`);
    out.version = String(ver?.[0]?.version || '').split(' ')[0];
    const tables = await prisma.$queryRawUnsafe<any[]>(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`
    );
    out.tables = tables.map(t => t.table_name);
    const users = await prisma.$queryRawUnsafe<any[]>(`select count(*)::int as c from users`)
      .catch(()=>[{ c: 'n/a' }]);
    out.counts = { users: users?.[0]?.c };
    console.log(JSON.stringify({ test: 'supabase-sanity', ok: true, details: out }, null, 2));
  }catch(e:any){
    const msg = String(e?.message||e).replace(/postgresql:\/\/[^@]+@/gi,'postgresql://***:***@');
    console.log(JSON.stringify({ test: 'supabase-sanity', ok: false, error: msg, details: out }, null, 2));
    process.exit(1);
  }finally{
    await prisma.$disconnect();
  }
}

main();


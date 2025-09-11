import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
async function main() {
  try {
    const v = await p.$queryRawUnsafe<any[]>("SELECT version() as version");
    console.log('[guard:db] version:', v?.[0]?.version?.split(' ')?.[0] || 'unknown');
    const tables = await p.$queryRawUnsafe<any[]>(
      "select table_name from information_schema.tables where table_schema='public' and table_name in ('users','products','orders') order by table_name"
    );
    console.log('[guard:db] tables:', tables.map(t=>t.table_name).join(','));
  } finally {
    await p.$disconnect();
  }
}
main().catch(e=>{ console.error('[guard:db] error', e?.message||e); process.exit(4); });


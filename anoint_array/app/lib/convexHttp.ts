export async function callConvex(params: { functionPath: string; args: any }) {
  const url = process.env.CONVEX_URL || '';
  const adminKey = process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN || '';
  if (!url || !adminKey) {
    throw new Error('Convex is not configured (missing CONVEX_URL or CONVEX_ADMIN_KEY)');
  }
  const endpoint = url.replace(/\/$/, '') + '/api/run/' + encodeURIComponent(params.functionPath);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminKey },
    body: JSON.stringify(params.args || {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error((json && (json.error || json.message)) || ('Convex call failed (' + res.status + ')'));
  }
  return json;
}

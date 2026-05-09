export function cors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, X-Device-Token, X-Device-Uuid');
  return new Response(response.body, { status: response.status, headers });
}

export function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

export function checkAdminKey(request, env) {
  const key = request.headers.get('X-Admin-Key');
  if (!key || key !== env.ADMIN_API_KEY) return false;
  return true;
}

export function randomToken(len = 64) {
  const arr = new Uint8Array(len / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function nowISO() {
  return new Date().toISOString().replace('Z', '').slice(0, 19);
}

export function addDays(isoStr, days) {
  const d = new Date(isoStr + 'Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace('Z', '').slice(0, 19);
}

import { json, checkAdminKey } from '../../../_helpers.js';

export async function onRequestGet({ request, env }) {
  if (!checkAdminKey(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const username = url.searchParams.get('username');

  let query = `SELECT device_uuid, username, staff_id, staff_name, status, device_label,
                      registered_at, approved_at, expires_at
               FROM devices`;
  const conditions = [];
  const binds = [];

  if (status) { conditions.push('status = ?'); binds.push(status); }
  if (username) { conditions.push('username = ?'); binds.push(username); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY registered_at DESC';

  try {
    const { results } = await env.DB.prepare(query).bind(...binds).all();
    return json({ ok: true, devices: results });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Admin-Key',
    },
  });
}

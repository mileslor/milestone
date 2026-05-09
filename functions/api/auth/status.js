import { json, nowISO } from '../../_helpers.js';

export async function onRequestGet({ request, env }) {
  const device_uuid = request.headers.get('X-Device-Uuid');
  if (!device_uuid) return json({ ok: false, error: 'missing X-Device-Uuid' }, 400);

  try {
    const row = await env.DB.prepare(
      `SELECT status, token, expires_at FROM devices WHERE device_uuid = ?`
    ).bind(device_uuid).first();

    if (!row) return json({ ok: false, error: 'device not found' }, 404);

    // Auto-expire: if expires_at passed, mark expired
    if (row.status === 'approved' && row.expires_at && row.expires_at < nowISO()) {
      await env.DB.prepare(
        `UPDATE devices SET status = 'expired', token = NULL WHERE device_uuid = ?`
      ).bind(device_uuid).run();
      return json({ ok: true, status: 'expired', token: null, expires_at: row.expires_at });
    }

    return json({
      ok: true,
      status: row.status,
      token: row.status === 'approved' ? row.token : null,
      expires_at: row.expires_at || null,
    });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Device-Uuid',
    },
  });
}

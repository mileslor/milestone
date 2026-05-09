import { json, nowISO } from '../../_helpers.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const { device_uuid, username, device_label } = body;
  if (!device_uuid || !username) return json({ ok: false, error: 'missing fields' }, 400);

  try {
    // If already approved, return existing token
    const existing = await env.DB.prepare(
      `SELECT status, token, expires_at FROM devices WHERE device_uuid = ?`
    ).bind(device_uuid).first();

    if (existing?.status === 'approved') {
      return json({ ok: true, status: 'approved', token: existing.token, expires_at: existing.expires_at });
    }

    // Upsert: re-register resets to pending
    const registered_at = nowISO();
    await env.DB.prepare(
      `INSERT INTO devices (device_uuid, username, staff_id, staff_name, status, device_label, registered_at)
       VALUES (?, ?, 0, '', 'pending', ?, ?)
       ON CONFLICT(device_uuid) DO UPDATE SET
         username = excluded.username,
         device_label = excluded.device_label,
         registered_at = excluded.registered_at,
         status = 'pending',
         token = NULL,
         approved_at = NULL,
         expires_at = NULL`
    ).bind(device_uuid, username.trim(), device_label || null, registered_at).run();

    return json({ ok: true, status: 'pending', message: '登記成功，請返回中心讓管理員批准此裝置。' });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

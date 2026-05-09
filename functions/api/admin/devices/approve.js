import { json, checkAdminKey, randomToken, nowISO, addDays } from '../../../_helpers.js';

export async function onRequestPost({ request, env }) {
  if (!checkAdminKey(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const { device_uuid, staff_id, staff_name } = body;
  if (!device_uuid || !staff_id || !staff_name) return json({ ok: false, error: 'missing fields' }, 400);

  const token = randomToken(64);
  const approved_at = nowISO();
  const expires_at = addDays(approved_at, 90);

  try {
    await env.DB.prepare(
      `UPDATE devices SET
         staff_id = ?, staff_name = ?, status = 'approved',
         token = ?, approved_at = ?, expires_at = ?
       WHERE device_uuid = ?`
    ).bind(staff_id, staff_name, token, approved_at, expires_at, device_uuid).run();

    return json({ ok: true, expires_at });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    },
  });
}

import { json, checkAdminKey } from '../../../_helpers.js';

export async function onRequestPost({ request, env }) {
  if (!checkAdminKey(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const { device_uuid } = body;
  if (!device_uuid) return json({ ok: false, error: 'missing device_uuid' }, 400);

  try {
    await env.DB.prepare(
      `UPDATE devices SET status = 'revoked', token = NULL WHERE device_uuid = ?`
    ).bind(device_uuid).run();

    return json({ ok: true });
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

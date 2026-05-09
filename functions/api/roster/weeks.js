import { json, nowISO } from '../../_helpers.js';

export async function onRequestGet({ request, env }) {
  const token = request.headers.get('X-Device-Token');
  if (!token) return json({ ok: false, error: 'unauthorized', status: 'expired' }, 401);

  const device = await env.DB.prepare(
    `SELECT status, expires_at FROM devices WHERE token = ?`
  ).bind(token).first();

  if (!device || device.status !== 'approved') return json({ ok: false, error: 'unauthorized', status: 'expired' }, 401);
  if (device.expires_at && device.expires_at < nowISO()) return json({ ok: false, error: 'unauthorized', status: 'expired' }, 401);

  try {
    const { results } = await env.DB.prepare(
      `SELECT week_start, week_end, pushed_at FROM roster_weeks ORDER BY week_start DESC`
    ).all();

    return json({ ok: true, weeks: results });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Device-Token',
    },
  });
}

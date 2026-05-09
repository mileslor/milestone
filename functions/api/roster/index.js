import { json, nowISO } from '../../_helpers.js';

async function resolveDevice(token, env) {
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT staff_id, staff_name, status, expires_at FROM devices WHERE token = ?`
  ).bind(token).first();
  if (!row || row.status !== 'approved') return null;
  if (row.expires_at && row.expires_at < nowISO()) return null;
  return row;
}

export async function onRequestGet({ request, env }) {
  const token = request.headers.get('X-Device-Token');
  const device = await resolveDevice(token, env);
  if (!device) return json({ ok: false, error: 'unauthorized', status: 'expired' }, 401);

  const url = new URL(request.url);
  const week_start = url.searchParams.get('week_start');

  try {
    let row;
    if (week_start) {
      row = await env.DB.prepare(
        `SELECT data_json, pushed_at FROM roster_weeks WHERE week_start = ?`
      ).bind(week_start).first();
    } else {
      row = await env.DB.prepare(
        `SELECT data_json, pushed_at FROM roster_weeks ORDER BY week_start DESC LIMIT 1`
      ).first();
    }

    if (!row) return json({ ok: false, error: 'no roster data found' }, 404);

    const data = JSON.parse(row.data_json);
    const staffEntry = (data.roster || []).find(s => s.staff_id === device.staff_id);

    return json({
      ok: true,
      staff_id: device.staff_id,
      staff_name: device.staff_name,
      week_start: data.week_start,
      week_end: data.week_end,
      pushed_at: data.pushed_at,
      public_holidays: data.public_holidays || [],
      entries: staffEntry?.entries || [],
      leaves: staffEntry?.leaves || [],
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
      'Access-Control-Allow-Headers': 'X-Device-Token',
    },
  });
}

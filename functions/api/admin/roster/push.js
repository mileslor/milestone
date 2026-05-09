import { json, checkAdminKey } from '../../../_helpers.js';

export async function onRequestPost({ request, env }) {
  if (!checkAdminKey(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const { week_start, week_end, pushed_at, public_holidays = [], roster = [] } = body;
  if (!week_start || !week_end || !pushed_at) return json({ ok: false, error: 'missing fields' }, 400);

  const data_json = JSON.stringify({ week_start, week_end, pushed_at, public_holidays, roster });

  try {
    await env.DB.prepare(
      `INSERT INTO roster_weeks (week_start, week_end, data_json, pushed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET
         week_end = excluded.week_end,
         data_json = excluded.data_json,
         pushed_at = excluded.pushed_at`
    ).bind(week_start, week_end, data_json, pushed_at).run();

    return json({ ok: true, week_start });
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

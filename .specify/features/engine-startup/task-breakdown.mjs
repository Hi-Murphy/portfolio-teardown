import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const raw = JSON.parse(gunzipSync(readFileSync(process.argv[2])).toString());
const ev = Array.isArray(raw) ? raw : raw.traceEvents ?? raw.events;
const meta = ev.filter(e => e.name === 'TracingStartedInBrowser').pop();
const pid = meta?.args?.data?.frames?.find(f => f.isMainFrame || f.isOutermostMainFrame)?.processId;
const tid = ev.find(e => e.pid === pid && e.name === 'thread_name' && e.args?.name === 'CrRendererMain')?.tid;
const main = ev.filter(e => e.pid === pid && e.tid === tid && e.ph === 'X');
const top = main.filter(e => (e.name === 'ThreadControllerImpl::RunTask' || e.name === 'RunTask') && e.dur > 8000).sort((a,b)=>a.ts-b.ts);
let lastEnd = 0;
for (const t of top) {
  if (t.ts < lastEnd) continue; lastEnd = t.ts + t.dur;
  const kids = main.filter(e => e.ts >= t.ts && e.ts + (e.dur||0) <= t.ts + t.dur && e !== t && (e.dur||0) > 2000);
  const agg = {};
  for (const k of kids) { const key = k.name + (k.args?.data?.url ? ' ' + k.args.data.url.split('/').pop() : '') + (k.args?.data?.functionName ? ' fn=' + k.args.data.functionName : '') + (k.args?.data?.type ? ' type=' + k.args.data.type : ''); agg[key] = (agg[key]||0) + k.dur; }
  console.log(`TASK ts=${((t.ts - top[0].ts)/1000).toFixed(1)}ms dur=${(t.dur/1000).toFixed(1)}ms`);
  for (const [k,v] of Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,9)) console.log(`   ${(v/1000).toFixed(1).padStart(7)} ${k}`);
}

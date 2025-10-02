// backend/api/ping.ts
export default function handler(req: any, res: any) {
  res.setHeader('x-test-ping', '1');
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
}

import { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'x-test-ping': '1' });
  res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
}

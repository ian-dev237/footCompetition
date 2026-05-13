import { getVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug') ?? '';

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastVersion = -1;
      let closed = false;

      const send = (v: number) => {
        if (closed) return;
        const payload = `data: ${JSON.stringify({ slug, version: v, ts: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // initial hello
      send(getVersion());
      lastVersion = getVersion();

      const interval = setInterval(() => {
        const v = getVersion();
        if (v !== lastVersion) {
          lastVersion = v;
          send(v);
        } else {
          // heartbeat to keep proxy connections alive
          if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
        }
      }, 1500);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* ignore */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

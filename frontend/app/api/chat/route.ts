import { proxyPost } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// Streams the bot reply as text/plain — chunks pass straight from FastAPI.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyPost("/api/chat", body, { stream: true });
}

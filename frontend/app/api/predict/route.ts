import { proxyPost } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyPost("/api/predict", body);
}

import { proxyGet, proxyPost } from "@/lib/proxy";

export const dynamic = "force-dynamic";
// TomTom + Groq pipeline can take a few seconds — bump the handler limit.
export const maxDuration = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const origin = u.searchParams.get("origin");
  const destination = u.searchParams.get("destination");
  const qs = new URLSearchParams();
  if (origin) qs.set("origin", origin);
  if (destination) qs.set("destination", destination);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return proxyGet(`/api/routes${suffix}`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyPost("/api/routes", body);
}

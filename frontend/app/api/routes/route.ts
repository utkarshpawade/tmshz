import { proxyGet } from "@/lib/proxy";

export const dynamic = "force-dynamic";

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

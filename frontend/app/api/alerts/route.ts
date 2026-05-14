import { proxyGet } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const qs = new URLSearchParams();
  const severity = u.searchParams.get("severity");
  const limit = u.searchParams.get("limit");
  if (severity) qs.set("severity", severity);
  if (limit) qs.set("limit", limit);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return proxyGet(`/api/alerts${suffix}`);
}

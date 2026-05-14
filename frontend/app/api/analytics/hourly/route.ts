import { proxyGet } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyGet("/api/analytics/hourly");
}

import { proxyPost } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function POST() {
  return proxyPost("/api/simulate-rush", {});
}

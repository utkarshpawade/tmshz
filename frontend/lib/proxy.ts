// Server-only helpers used by BFF route handlers in app/api/.
// All Next handlers proxy through here so FASTAPI_URL is set in one place.
// Only imported by app/api/**/route.ts files — never reaches the client bundle.

export const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const passThrough = (r: Response, fallbackType = "application/json") =>
  new Response(r.body, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || fallbackType },
  });

export async function proxyGet(path: string): Promise<Response> {
  try {
    const r = await fetch(`${FASTAPI_URL}${path}`, { cache: "no-store" });
    return passThrough(r);
  } catch (e) {
    return Response.json(
      { error: "backend_unreachable", path, detail: String(e) },
      { status: 502 },
    );
  }
}

export async function proxyPost(
  path: string,
  body: unknown,
  { stream = false }: { stream?: boolean } = {},
): Promise<Response> {
  try {
    const r = await fetch(`${FASTAPI_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return passThrough(r, stream ? "text/plain; charset=utf-8" : "application/json");
  } catch (e) {
    return Response.json(
      { error: "backend_unreachable", path, detail: String(e) },
      { status: 502 },
    );
  }
}

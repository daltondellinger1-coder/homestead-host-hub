interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
}

function withOrigin(html: string, origin: string): string {
  return html.replaceAll("__SITE_ORIGIN__", origin);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
    const pathname = new URL(request.url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";
    const isClientRoute = !lastSegment.includes(".");

    if (response.status === 404 && request.method === "GET" && (acceptsHtml || isClientRoute)) {
      const appShellUrl = new URL("/", request.url);
      response = await env.ASSETS.fetch(new Request(appShellUrl, request));
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");

    return new Response(withOrigin(await response.text(), new URL(request.url).origin), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;

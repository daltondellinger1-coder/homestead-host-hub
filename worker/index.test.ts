import { describe, expect, it, vi } from "vitest";
import worker from "./index";

describe("Sites worker", () => {
  it("renders absolute social metadata from the request origin", async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn(async () =>
          new Response('<meta property="og:image" content="__SITE_ORIGIN__/og.png">', {
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
        ),
      },
    };

    const response = await worker.fetch(
      new Request("https://helper.example/operations"),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );

    expect(await response.text()).toContain("https://helper.example/og.png");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("serves the app shell for direct client-side routes", async () => {
    const fetchAsset = vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        return new Response("<main>Homestead Helper</main>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    const env = { ASSETS: { fetch: fetchAsset } };

    const response = await worker.fetch(
      new Request("https://helper.example/operations", {
        headers: { accept: "text/html,application/xhtml+xml" },
      }),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Homestead Helper");
    expect(fetchAsset).toHaveBeenCalledTimes(2);
  });

  it("serves public compliance routes to link checkers that send a generic accept header", async () => {
    const fetchAsset = vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        return new Response("<main>Homestead Helper</main>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    const env = { ASSETS: { fetch: fetchAsset } };

    const response = await worker.fetch(
      new Request("https://helper.example/privacy", {
        headers: { accept: "*/*" },
      }),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Homestead Helper");
    expect(fetchAsset).toHaveBeenCalledTimes(2);
  });

  it("does not turn missing static assets into the app shell", async () => {
    const missing = new Response("Not found", { status: 404 });
    const env = { ASSETS: { fetch: vi.fn(async () => missing) } };

    const response = await worker.fetch(
      new Request("https://helper.example/assets/missing.js", {
        headers: { accept: "*/*" },
      }),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );

    expect(response).toBe(missing);
  });

  it("passes non-HTML assets through unchanged", async () => {
    const asset = new Response("asset", {
      headers: { "content-type": "text/plain" },
    });
    const env = {
      ASSETS: {
        fetch: vi.fn(async () => asset),
      },
    };

    const response = await worker.fetch(
      new Request("https://helper.example/robots.txt"),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );

    expect(response).toBe(asset);
  });
});

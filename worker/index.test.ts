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

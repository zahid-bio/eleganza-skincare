import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/commerce/[action]/route";

test("normalizes local request origins while rejecting cross-origin forms", async () => {
  delete process.env.APP_ORIGIN;
  delete process.env.DATABASE_URL;
  process.env.PGLITE_DIR = "memory://";
  const params = Promise.resolve({ action: "newsletter" });
  const form = (origin: string) =>
    new Request("http://localhost:3218/api/commerce/newsletter", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3218",
        origin,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "newsletter@example.com", consent: true }),
    });
  assert.equal((await POST(form("http://127.0.0.1:3218"), { params })).status, 200);
  assert.equal((await POST(form("https://example.com"), { params })).status, 403);
});

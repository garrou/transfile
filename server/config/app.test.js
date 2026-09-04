import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import request from "supertest";

const ALLOWED_ORIGIN = "http://allowed.test";
const VALID_ID = "c".repeat(32);
const storageDir = path.join(process.cwd(), "storage");

const loadApp = async ({ origin = ALLOWED_ORIGIN, rateLimitMax } = {}) => {
    vi.resetModules();
    process.env.ORIGIN = origin;
    if (rateLimitMax !== undefined) process.env.RATE_LIMIT_MAX = String(rateLimitMax);
    else delete process.env.RATE_LIMIT_MAX;

    const { default: app } = await import("./app.js");
    return app._app;
};

afterEach(async () => {
    delete process.env.RATE_LIMIT_MAX;
});

afterAll(async () => {
    await fs.rm(storageDir, { recursive: true, force: true });
});

describe("CORS", () => {
    it("reflects the configured origin", async () => {
        const app = await loadApp({ origin: ALLOWED_ORIGIN });

        const res = await request(app).get(`/files/${VALID_ID}`).set("Origin", ALLOWED_ORIGIN);

        expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    });

    it("always returns the configured origin, regardless of the requester's Origin header", async () => {
        // cors treats a plain string as a literal header value, not a dynamic allowlist match.
        // A page at an unlisted origin still gets this header back, but with a value that
        // doesn't match its own origin, so the browser's same-origin policy blocks it from
        // reading the response. Only the actual configured origin can use the response.
        const app = await loadApp({ origin: ALLOWED_ORIGIN });

        const res = await request(app).get(`/files/${VALID_ID}`).set("Origin", "http://evil.test");

        expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    });
});

describe("path traversal protection at the HTTP layer", () => {
    it("rejects a traversing id on GET", async () => {
        const app = await loadApp();
        const res = await request(app).get("/files/..%2F..%2F..%2Fetc%2Fpasswd");
        expect(res.status).toBe(400);
    });

    it("rejects a traversing id on DELETE", async () => {
        const app = await loadApp();
        const res = await request(app).delete("/files/..%2F..%2F..%2Fetc%2Fpasswd");
        expect(res.status).toBe(400);
    });

    it("rejects a traversing fileId on POST", async () => {
        const app = await loadApp();
        const res = await request(app)
            .post("/files")
            .send({ fileId: "../../../../tmp/pwn", data: Buffer.from("x").toString("base64") });
        expect(res.status).toBe(400);
    });
});

describe("rate limiting", () => {
    it("returns 429 once the configured request budget is exceeded", async () => {
        const app = await loadApp({ rateLimitMax: 3 });

        const responses = [];
        for (let i = 0; i < 4; i++) {
            responses.push(await request(app).get(`/files/${VALID_ID}`));
        }

        expect(responses.slice(0, 3).every((res) => res.status !== 429)).toBe(true);
        expect(responses[3].status).toBe(429);
    });
});

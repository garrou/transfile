import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import FileService from "./fileService.js";

const VALID_ID = "a".repeat(32);
const DATA = Buffer.from("hello world").toString("base64");

describe("FileService", () => {
    let storageDir;
    let service;

    beforeEach(async () => {
        storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "transfile-test-"));
        service = new FileService(storageDir);
    });

    afterEach(async () => {
        await fs.rm(storageDir, { recursive: true, force: true });
    });

    describe("uploadFile", () => {
        it("rejects a payload missing fileId or data", async () => {
            await expect(service.uploadFile({ data: DATA })).rejects.toMatchObject({ status: 400 });
            await expect(service.uploadFile({ fileId: VALID_ID })).rejects.toMatchObject({ status: 400 });
        });

        it.each([undefined, null, "a string", 123, ["array"]])(
            "rejects a non-object payload: %p",
            async (payload) => {
                await expect(service.uploadFile(payload)).rejects.toMatchObject({ status: 400 });
            }
        );

        it.each([{ a: 1 }, [1, 2, 3], 123, true, ""])(
            "rejects data that is not a non-empty string: %p",
            async (data) => {
                await expect(service.uploadFile({ fileId: VALID_ID, data })).rejects.toMatchObject({ status: 400 });
            }
        );

        it.each([
            "../../../../etc/passwd",
            "../secret",
            "a/b",
            "short",
            "A".repeat(32),
            "g".repeat(32),
            "",
        ])("rejects a malformed or path-traversing fileId: %s", async (fileId) => {
            await expect(service.uploadFile({ fileId, data: DATA })).rejects.toMatchObject({ status: 400 });
            const entries = await fs.readdir(storageDir).catch(() => []);
            expect(entries).toHaveLength(0);
        });

        it("does not escape the storage directory even when the traversal resolves outside it", async () => {
            const parentDir = path.dirname(storageDir);
            const before = await fs.readdir(parentDir);

            await expect(
                service.uploadFile({ fileId: "../outside", data: DATA })
            ).rejects.toMatchObject({ status: 400 });

            const after = await fs.readdir(parentDir);
            expect(after).toEqual(before);
        });

        it("stores the file and computes size from the actual decoded buffer, ignoring a spoofed size", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA, filename: "a.txt", type: "text/plain", size: 999999 });

            const { data, metadata } = await service.fetchFile(VALID_ID);
            expect(data).toBe(DATA);
            expect(metadata.size).toBe(Buffer.from(DATA, "base64").byteLength);
        });

        it("truncates overly long filename and type", async () => {
            const longFilename = "a".repeat(500);
            const longType = "b".repeat(500);

            await service.uploadFile({ fileId: VALID_ID, data: DATA, filename: longFilename, type: longType });

            const { metadata } = await service.fetchFile(VALID_ID);
            expect(metadata.filename.length).toBeLessThanOrEqual(255);
            expect(metadata.type.length).toBeLessThanOrEqual(255);
        });

        it("coerces deleteAfterDownload to a boolean", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA, deleteAfterDownload: "yes" });
            const { metadata } = await service.fetchFile(VALID_ID);
            expect(metadata.deleteAfterDownload).toBe(true);
        });

        it.each([
            [9999, 24],
            [-5, 1],
            [0.5, 1],
            [undefined, 24],
            ["not-a-number", 24],
        ])("clamps expirationHours=%p to %p hour(s) from now", async (expirationHours, expectedHours) => {
            const before = Date.now();
            await service.uploadFile({ fileId: VALID_ID, data: DATA, expirationHours });

            const stored = JSON.parse(await fs.readFile(path.join(storageDir, `${VALID_ID}.json`), "utf8"));
            const hoursFromNow = (new Date(stored.expiresAt).getTime() - before) / (60 * 60 * 1000);
            expect(hoursFromNow).toBeGreaterThan(expectedHours - 0.05);
            expect(hoursFromNow).toBeLessThanOrEqual(expectedHours + 0.05);
        });
    });

    describe("fetchFile", () => {
        it("rejects an invalid id without touching the filesystem", async () => {
            await expect(service.fetchFile("../../etc/passwd")).rejects.toMatchObject({ status: 400 });
        });

        it("returns 404 for a well-formed but unknown id", async () => {
            await expect(service.fetchFile(VALID_ID)).rejects.toMatchObject({ status: 404 });
        });

        it("deletes the file after the first fetch when deleteAfterDownload is true", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA, deleteAfterDownload: true });

            await expect(service.fetchFile(VALID_ID)).resolves.toBeDefined();
            await expect(service.fetchFile(VALID_ID)).rejects.toMatchObject({ status: 404 });
        });

        it("keeps the file available across multiple fetches when deleteAfterDownload is false", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA, deleteAfterDownload: false });

            await expect(service.fetchFile(VALID_ID)).resolves.toBeDefined();
            await expect(service.fetchFile(VALID_ID)).resolves.toBeDefined();
        });

        it("returns 404 and purges the files once expiresAt is in the past", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA, expirationHours: 1 });

            const metaPath = path.join(storageDir, `${VALID_ID}.json`);
            const metadata = JSON.parse(await fs.readFile(metaPath, "utf8"));
            metadata.expiresAt = new Date(Date.now() - 1000).toISOString();
            await fs.writeFile(metaPath, JSON.stringify(metadata), "utf8");

            await expect(service.fetchFile(VALID_ID)).rejects.toMatchObject({ status: 404 });

            const entries = await fs.readdir(storageDir);
            expect(entries).toHaveLength(0);
        });
    });

    describe("deleteFile", () => {
        it("rejects an invalid id", async () => {
            await expect(service.deleteFile("not-hex")).rejects.toMatchObject({ status: 400 });
        });

        it("returns 404 for a well-formed but unknown id", async () => {
            await expect(service.deleteFile(VALID_ID)).rejects.toMatchObject({ status: 404 });
        });

        it("removes both the data and metadata files", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA });

            await service.deleteFile(VALID_ID);

            const entries = await fs.readdir(storageDir);
            expect(entries).toHaveLength(0);
            await expect(service.fetchFile(VALID_ID)).rejects.toMatchObject({ status: 404 });
        });
    });

    describe("concurrent access races", () => {
        it("deleteFile does not throw when a concurrent request already removed the files", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA });

            const enoent = Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" });
            vi.spyOn(fs, "unlink").mockRejectedValueOnce(enoent);

            await expect(service.deleteFile(VALID_ID)).resolves.toBeUndefined();

            vi.restoreAllMocks();
        });

        it("fetchFile returns 404 instead of leaking a raw fs error when a concurrent request wins the race", async () => {
            await service.uploadFile({ fileId: VALID_ID, data: DATA });

            const originalReadFile = fs.readFile.bind(fs);
            vi.spyOn(fs, "readFile").mockImplementation(async (filePath, ...args) => {
                if (String(filePath).endsWith(".bin")) {
                    throw Object.assign(new Error(`ENOENT: no such file or directory, open '${filePath}'`), { code: "ENOENT" });
                }
                return originalReadFile(filePath, ...args);
            });

            await expect(service.fetchFile(VALID_ID)).rejects.toMatchObject({ status: 404 });

            vi.restoreAllMocks();
        });
    });

    describe("MAX_UPLOAD_MB enforcement", () => {
        it("rejects a buffer larger than the configured limit", async () => {
            vi.resetModules();
            const previous = process.env.MAX_UPLOAD_MB;
            process.env.MAX_UPLOAD_MB = String(1 / (1024 * 1024) * 10); // ~10 bytes limit

            try {
                const { default: LimitedFileService } = await import(`./fileService.js?limit-test`);
                const limited = new LimitedFileService(storageDir);

                await expect(
                    limited.uploadFile({ fileId: VALID_ID, data: DATA })
                ).rejects.toMatchObject({ status: 413 });

                const entries = await fs.readdir(storageDir);
                expect(entries).toHaveLength(0);
            } finally {
                process.env.MAX_UPLOAD_MB = previous;
                vi.resetModules();
            }
        });
    });
});

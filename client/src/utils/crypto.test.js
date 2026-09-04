import { describe, expect, it } from "vitest";
import {
    generatePassphrase,
    generateFileId,
    encryptFileData,
    decryptFileData,
    encryptTextData,
    decryptTextData,
    buildMetadataAad,
} from "./crypto";
import { words } from "./bip39";

const asFile = (bytes) => ({ arrayBuffer: async () => bytes.buffer });
const META = { filename: "report.pdf", type: "application/pdf", kind: "file" };
const TEXT_META = { filename: "", type: "text/plain", kind: "text" };

describe("generatePassphrase", () => {
    it("returns the requested number of dash-separated words from the wordlist", () => {
        const phrase = generatePassphrase(12);
        const parts = phrase.split("-");

        expect(parts).toHaveLength(12);
        parts.forEach((word) => expect(words).toContain(word));
    });

    it("is not deterministic across calls", () => {
        const a = generatePassphrase(12);
        const b = generatePassphrase(12);
        expect(a).not.toBe(b);
    });
});

describe("generateFileId", () => {
    it("is deterministic for a given passphrase", async () => {
        const id1 = await generateFileId("correct-horse-battery-staple");
        const id2 = await generateFileId("correct-horse-battery-staple");
        expect(id1).toBe(id2);
    });

    it("produces a 32-character lowercase hex string", async () => {
        const id = await generateFileId("some-passphrase");
        expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    it("differs for different passphrases", async () => {
        const id1 = await generateFileId("passphrase-one");
        const id2 = await generateFileId("passphrase-two");
        expect(id1).not.toBe(id2);
    });
});

describe("buildMetadataAad", () => {
    it("is deterministic for the same metadata", () => {
        expect(buildMetadataAad(META)).toEqual(buildMetadataAad(META));
    });

    it("differs when any field differs", () => {
        expect(buildMetadataAad(META)).not.toEqual(buildMetadataAad({ ...META, filename: "other.pdf" }));
        expect(buildMetadataAad(META)).not.toEqual(buildMetadataAad({ ...META, type: "text/plain" }));
        expect(buildMetadataAad(META)).not.toEqual(buildMetadataAad({ ...META, kind: "text" }));
    });

    it("defaults missing fields to an empty string", () => {
        expect(buildMetadataAad({})).toEqual(buildMetadataAad({ filename: "", type: "", kind: "" }));
    });
});

describe("text encryption roundtrip", () => {
    it("decrypts to the original text with the correct passphrase and matching metadata", async () => {
        const text = "a secret message with émoji 🔒 and\nnewlines";
        const passphrase = "correct-passphrase";

        const encrypted = await encryptTextData(text, passphrase, TEXT_META);
        const decrypted = await decryptTextData(encrypted, passphrase, TEXT_META);

        expect(decrypted).toBe(text);
    });

    it("produces different ciphertext for the same plaintext across calls (random salt/iv)", async () => {
        const text = "same message";
        const passphrase = "same-passphrase";

        const first = await encryptTextData(text, passphrase, TEXT_META);
        const second = await encryptTextData(text, passphrase, TEXT_META);

        expect(first).not.toBe(second);
    });

    it("fails to decrypt with the wrong passphrase", async () => {
        const encrypted = await encryptTextData("secret", "right-passphrase", TEXT_META);

        await expect(decryptTextData(encrypted, "wrong-passphrase", TEXT_META)).rejects.toThrow();
    });

    it("fails to decrypt when the metadata used as AAD was tampered with after encryption", async () => {
        const encrypted = await encryptTextData("secret", "a-passphrase", TEXT_META);

        await expect(
            decryptTextData(encrypted, "a-passphrase", { ...TEXT_META, type: "text/html" })
        ).rejects.toThrow();
    });
});

describe("file encryption roundtrip", () => {
    it("decrypts to the original bytes with the correct passphrase and matching metadata", async () => {
        const original = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
        const passphrase = "file-passphrase";

        const encrypted = await encryptFileData(asFile(original), passphrase, META);
        const decrypted = await decryptFileData(encrypted, passphrase, META);

        expect(new Uint8Array(decrypted)).toEqual(original);
    });

    it("fails to decrypt with the wrong passphrase", async () => {
        const original = new Uint8Array([1, 2, 3]);
        const encrypted = await encryptFileData(asFile(original), "right-passphrase", META);

        await expect(decryptFileData(encrypted, "wrong-passphrase", META)).rejects.toThrow();
    });

    it("fails to decrypt tampered ciphertext", async () => {
        const original = new Uint8Array([1, 2, 3, 4, 5]);
        const passphrase = "tamper-test";
        const encrypted = await encryptFileData(asFile(original), passphrase, META);

        const bytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
        bytes[bytes.length - 1] ^= 0xff;
        const tampered = btoa(String.fromCharCode(...bytes));

        await expect(decryptFileData(tampered, passphrase, META)).rejects.toThrow();
    });

    it.each([
        { ...META, filename: "malware.exe" },
        { ...META, type: "application/x-msdownload" },
        { ...META, kind: "text" },
    ])("fails to decrypt when the stored metadata was tampered with (%o)", async (tamperedMeta) => {
        const original = new Uint8Array([9, 9, 9]);
        const passphrase = "server-tamper-test";
        const encrypted = await encryptFileData(asFile(original), passphrase, META);

        await expect(decryptFileData(encrypted, passphrase, tamperedMeta)).rejects.toThrow();
    });
});

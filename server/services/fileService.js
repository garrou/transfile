import fs from "fs/promises";
import path from "path";
import ServiceError from "../models/serviceError.js";
import {
    ID_REGEX,
    MIN_EXPIRATION_HOURS,
    MAX_EXPIRATION_HOURS,
    MAX_FILENAME_LENGTH,
    MAX_TYPE_LENGTH,
    MAX_UPLOAD_MB,
} from "../config/constants.js";

export default class FileService {
    constructor(storageDir = path.join(path.resolve(), "storage")) {
        this._storageDir = storageDir;
    }

    #ensureStorage = async () => {
        try {
            await fs.access(this._storageDir);
        } catch (_) {
            await fs.mkdir(this._storageDir);
        }
    }

    #validateId = (id) => {
        if (typeof id !== "string" || !ID_REGEX.test(id)) {
            throw new ServiceError(400, "Invalid id");
        }
    }

    #clampExpirationHours = (expirationHours) => {
        const hours = Number(expirationHours);
        if (!Number.isFinite(hours)) return MAX_EXPIRATION_HOURS;
        return Math.min(Math.max(hours, MIN_EXPIRATION_HOURS), MAX_EXPIRATION_HOURS);
    }

    #safeUnlink = async (filePath) => {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    deleteFile = async (id) => {
        this.#validateId(id);

        const dataPath = path.join(this._storageDir, `${id}.bin`);
        const metaPath = path.join(this._storageDir, `${id}.json`);

        try {
            await fs.access(dataPath);
            await fs.access(metaPath);
        } catch (_) {
            throw new ServiceError(404, "File not found");
        }
        await this.#safeUnlink(metaPath);
        await this.#safeUnlink(dataPath);
    }

    uploadFile = async (payload) => {
        if (typeof payload !== "object" || payload === null) {
            throw new ServiceError(400, "Invalid payload");
        }

        const { fileId, data, filename, type, expirationHours, deleteAfterDownload, kind } = payload;

        if (!fileId || typeof data !== "string" || data.length === 0) {
            throw new ServiceError(400, "Missing fields");
        }
        this.#validateId(fileId);

        const buffer = Buffer.from(data, "base64");
        if (buffer.byteLength > MAX_UPLOAD_MB * 1024 * 1024) {
            throw new ServiceError(413, "File too large");
        }

        await this.#ensureStorage();

        const dataPath = path.join(this._storageDir, `${fileId}.bin` );
        await fs.writeFile(dataPath, buffer);

        const expiresAt = new Date(Date.now() + this.#clampExpirationHours(expirationHours) * 60 * 60 * 1000).toISOString();

        const metadata = {
            filename: typeof filename === "string" ? filename.slice(0, MAX_FILENAME_LENGTH) : "",
            type: typeof type === "string" ? type.slice(0, MAX_TYPE_LENGTH) : "",
            size: buffer.byteLength,
            uploadedAt: new Date().toISOString(),
            expiresAt,
            deleteAfterDownload: Boolean(deleteAfterDownload),
            kind,
        };

        const metaPath = path.join(this._storageDir, `${fileId}.json`);
        await fs.writeFile(metaPath, JSON.stringify(metadata), "utf8");
    }

    fetchFile = async (id) => {
        this.#validateId(id);

        const dataPath = path.join(this._storageDir, `${id}.bin`);
        const metaPath = path.join(this._storageDir, `${id}.json`);

        let metadata;
        let buffer;
        try {
            await fs.access(dataPath);
            await fs.access(metaPath);

            const metaContent = await fs.readFile(metaPath, "utf8");
            metadata = JSON.parse(metaContent);

            if (new Date(metadata.expiresAt) < new Date()) {
                await this.#safeUnlink(metaPath);
                await this.#safeUnlink(dataPath);
                throw new ServiceError(404, "File not found");
            }

            buffer = await fs.readFile(dataPath);
        } catch (err) {
            // A concurrent request may have deleted the file between the checks
            // above and here: treat that race the same as "not found" instead of
            // leaking a raw fs error (and its absolute path) to the client.
            if (err instanceof ServiceError) throw err;
            if (err.code === "ENOENT") throw new ServiceError(404, "File not found");
            throw err;
        }

        const data = buffer.toString("base64");

        if (metadata.deleteAfterDownload) {
            await this.#safeUnlink(metaPath);
            await this.#safeUnlink(dataPath);
        }
        return { data, metadata };
    }
}
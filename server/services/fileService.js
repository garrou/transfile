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
    constructor() {
        this._storageDir = path.join(path.resolve(), "storage");
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
        await fs.unlink(metaPath);
        await fs.unlink(dataPath);
    }

    uploadFile = async (payload) => {
        const { fileId, data, filename, type, expirationHours, deleteAfterDownload, kind } = payload;

        if (!fileId || !data) throw new ServiceError(400, "Missing fields");
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

        try {
            await fs.access(dataPath);
            await fs.access(metaPath);
        } catch (_) {
            throw new ServiceError(404, "File not found");
        }
        const metaContent = await fs.readFile(metaPath, "utf8");
        const metadata = JSON.parse(metaContent);

        if (new Date(metadata.expiresAt) < new Date()) {
            await fs.unlink(metaPath).catch(() => {});
            await fs.unlink(dataPath).catch(() => {});
            throw new ServiceError(404, "File not found");
        }

        const buffer = await fs.readFile(dataPath);
        const data = buffer.toString("base64");

        if (metadata.deleteAfterDownload) {
            await fs.unlink(metaPath);
            await fs.unlink(dataPath);
        }
        return { data, metadata };
    }
}
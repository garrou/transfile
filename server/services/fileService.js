import fs from "fs/promises";
import path from "path";
import ServiceError from "../models/serviceError.js";

export default class FileService {
    constructor() {
        this._storageDir = path.join(path.resolve(), "storage");
        this._encoding = "utf8";
    }

    uploadFile = async (payload) => {
        const { fileId, data, filename, type, size, uploadedAt, deleteAfterDownload } = payload;

        if (!fileId || !data) throw new ServiceError(400, "Missing fields");

        const dataPath = path.join(this._storageDir, `${fileId}.bin`);
        const buffer = Buffer.from(data, "base64");
        await fs.writeFile(dataPath, buffer);

        const metaPath = path.join(this._storageDir, `${fileId}.meta.json`);
        const metadata = { filename, type, size, uploadedAt, deleteAfterDownload };
        await fs.writeFile(metaPath, JSON.stringify(metadata), this._encoding);
    }

    fetchFile = async (id) => {
        const dataPath = path.join(this._storageDir, `${id}.bin`);
        const metaPath = path.join(this._storageDir, `${id}.meta.json`);

        try {
            await fs.access(dataPath);
            await fs.access(metaPath);
        } catch (_) {
            throw new ServiceError(404, "File not found");
        }
        const buffer = await fs.readFile(dataPath);
        const data = buffer.toString("base64");

        const metaContent = await fs.readFile(metaPath, this._encoding);
        const metadata = JSON.parse(metaContent);

        if (metadata.deleteAfterDownload) {
            await fs.rm(metaPath);
            await fs.rm(dataPath);
        }
        return { data, metadata };
    }
}
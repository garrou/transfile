import FileService from "../services/fileService.js";

export default class FileController {
    constructor() {
        this._fileService = new FileService();
    }

    uploadFile = async (req, res, next) => {
        try {
            await this._fileService.uploadFile(req.body);
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    }

    fetchFile = async (req, res, next) => {
        try {
            const { data, metadata } = await this._fileService.fetchFile(req.params.id);
            res.json({ data, ...metadata });
        } catch (e) {
            next(e);
        }
    }
}

import {Router} from "express";
import FileController from "../controllers/fileController.js";

const router = new Router();
const fileController = new FileController();

router.post("/", fileController.uploadFile);

router.get("/:id", fileController.fetchFile);

router.delete("/:id", fileController.deleteFile);

export default router;
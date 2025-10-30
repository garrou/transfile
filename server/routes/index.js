import {Router} from "express";
import fileRoutes from "./fileRoutes.js";

const router = new Router();

router.use("/files", fileRoutes);

export default router;
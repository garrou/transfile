import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "../routes/index.js";
import dotenv from 'dotenv';
import {errorHandler} from "../middlewares/error.js";
import {MAX_UPLOAD_MB, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX} from "./constants.js";

class App {
    constructor() {
        dotenv.config();

        this._app = express();
        this._port = process.env.PORT || 8080;
        this.#setupCors();
        this.#setupRateLimit();
        this.#setupMiddleware();
        this.#setupRoutes();
        this.#setupErrorHandler();
    }

    #setupErrorHandler() {
        this._app.use(errorHandler);
    }

    #setupMiddleware() {
        this._app.use(express.json({ limit: `${MAX_UPLOAD_MB}mb` }));
    }

    #setupCors() {
        const origins = (process.env.ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

        this._app.use(cors({
            origin: origins,
            allowedHeaders: ["Authorization", "Content-Type"],
            exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"]
        }));
    }

    #setupRateLimit() {
        this._app.use(rateLimit({
            windowMs: RATE_LIMIT_WINDOW_MS,
            max: RATE_LIMIT_MAX,
            standardHeaders: true,
            legacyHeaders: false,
        }));
    }

    #setupRoutes() {
        this._app.use("/", routes);
    }

    listen() {
        this._app.listen(this._port, () => console.log(`Server listening on ${this._port}`));
    }
}

export default new App();
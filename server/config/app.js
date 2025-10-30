import express from "express";
import cors from "cors";
import routes from "../routes/index.js";
import dotenv from 'dotenv';
import {errorHandler} from "../middlewares/error.js";

class App {
    constructor() {
        dotenv.config();

        this._app = express();
        this._port = process.env.PORT || 8080;
        this.#setupCors();
        this.#setupMiddleware();
        this.#setupRoutes();
        this.#setupErrorHandler();
    }

    #setupErrorHandler() {
        this._app.use(errorHandler);
    }

    #setupMiddleware() {
        this._app.use(express.json({ limit: "500mb" }));
    }

    #setupCors() {
        this._app.use(cors({
            origins: [process.env.ORIGIN],
            allowedHeaders: ["Authorization", "Content-Type"],
            exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"]
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
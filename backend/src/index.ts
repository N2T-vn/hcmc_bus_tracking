/**
 * Express application entry point.
 */

import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response,
} from "express";
import { config } from "./config/env";
import { BusController } from "./controllers/BusController";
import { connectDB } from "./db/connection";
import { MssqlBusRepository } from "./repositories/MssqlBusRepository";
import { createBusRouter } from "./routes/buses";
import { BusService } from "./services/BusService";

const app: Express = express();
const busRepository = new MssqlBusRepository();
const busService = new BusService(busRepository);
const busController = new BusController(busService);

app.use(express.json());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
  }),
);
app.use((req, res, next): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[request] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`,
    );
  });

  next();
});

app.get("/health", (_req: Request, res: Response): void => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/buses", createBusRouter(busController));

const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  console.error("Unhandled request error", error);
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

async function startServer(): Promise<void> {
  await connectDB();

  app.listen(config.PORT);
  console.log(`Server listening on port ${config.PORT}`);
}

void startServer();

export default app;

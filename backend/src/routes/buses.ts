/**
 * Express route handlers for bus lookup and trajectory endpoints.
 */

import { Router } from "express";
import type { BusController } from "../controllers/BusController";

export function createBusRouter(busController: BusController): Router {
  const router = Router();

  router.get("/next", busController.getNextBatch);
  router.post("/reset", busController.resetPlayback);
  router.get("/:vehicleId/trajectory", busController.getTrajectory);

  return router;
}

/**
 * Express route handlers for route statistics endpoints.
 */

import { Router } from "express";
import type { BusController } from "../controllers/BusController";

export function createStatsRouter(busController: BusController): Router {
  const router = Router();

  router.get("/", busController.getStats);
  router.get("/summary", busController.getStats);
  router.get("/routes", busController.getRoutes);

  return router;
}

/**
 * Express controller methods for playback and trajectory endpoints.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { BusService, ServiceError } from "../services/BusService";

interface ErrorResponse {
  error: string;
}

export class BusController {
  public constructor(private readonly busService: BusService) {}

  public getNextBatch: RequestHandler = async (req, res, next) => {
    try {
      const response = await this.busService.getNextWindow();
      res.json(response);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public resetPlayback: RequestHandler = async (_req, res, next) => {
    try {
      const cursorTimestamp = await this.busService.resetPlayback();
      res.json({
        cursorTimestamp,
        cursorIso: new Date(cursorTimestamp).toISOString(),
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public getTrajectory: RequestHandler = async (req, res, next) => {
    try {
      const response = await this.busService.getTrajectory(
        req.params.vehicleId,
        req.query.targetTimestamp,
        req.query.limit,
      );
      res.json({ data: response });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  private handleError(
    error: unknown,
    res: Response<ErrorResponse>,
    next: NextFunction,
  ): void {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    next(error);
  }
}

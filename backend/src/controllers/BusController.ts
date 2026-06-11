/**
 * Express controller methods for bus and statistics endpoints.
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
      const response = await this.busService.getNextSnapshot(
        req.query.elapsedSeconds,
      );
      res.json(response);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public getLatestBuses: RequestHandler = async (_req, res, next) => {
    try {
      const response = await this.busService.getLatestBuses();
      res.json({ data: response });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public resetPlayback: RequestHandler = async (_req, res, next) => {
    try {
      const playbackElapsedSeconds = await this.busService.resetPlayback();
      res.json({
        playbackElapsedSeconds,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public getTrajectory: RequestHandler = async (req, res, next) => {
    try {
      const response = await this.busService.getTrajectory(
        req.params.vehicleId,
        req.query.limit,
      );
      res.json({ data: response });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  public getStats: RequestHandler = async (_req, res, next) => {
    try {
      const response = await this.busService.getStats();
      res.json(response);
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

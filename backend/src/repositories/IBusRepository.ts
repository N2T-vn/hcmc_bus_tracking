/**
 * Defines repository contracts for indexed bus data access.
 */

import type { BusRecord, PlaybackRange } from "../models/types";

export interface IBusRepository {
  fetchPlaybackRange(): Promise<PlaybackRange | undefined>;
  fetchWindow(startTimestamp: number, endTimestamp: number): Promise<BusRecord[]>;
  fetchTrajectory(
    vehicleId: string,
    targetTimestamp: number,
    windowSeconds: number,
    limit: number,
  ): Promise<BusRecord[]>;
}

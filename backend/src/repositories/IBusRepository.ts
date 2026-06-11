/**
 * Defines repository and strategy contracts for bus data access.
 */

import type {
  BusRecord,
  StatsSummary,
} from "../models/types";

export interface IBusRepository {
  fetchPlaybackDurationSeconds(): Promise<number | undefined>;
  fetchSnapshot(
    playbackElapsedSeconds: number,
    activeWindowSeconds: number,
  ): Promise<BusRecord[]>;
  fetchLatest(): Promise<BusRecord[]>;
  fetchTrajectory(vehicleId: string, limit: number): Promise<BusRecord[]>;
  fetchStats(): Promise<StatsSummary>;
}

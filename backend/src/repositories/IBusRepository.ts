/**
 * Defines repository and strategy contracts for bus data access.
 */

import type {
  BusRecord,
  RouteInfo,
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
  fetchRoutes(): Promise<RouteInfo[]>;
  fetchStats(): Promise<StatsSummary>;
}

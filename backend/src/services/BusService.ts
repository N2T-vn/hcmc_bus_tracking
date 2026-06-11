/**
 * Bus business logic service that receives a repository through constructor injection.
 */

import type {
  BusRecord,
  BusRecordResponse,
  PlaybackResponse,
  RouteInfo,
  StatsSummary,
} from "../models/types";
import { config } from "../config/env";
import type { IBusRepository } from "../repositories/IBusRepository";

const DEFAULT_TRAJECTORY_LIMIT = 200;
const MAX_TRAJECTORY_LIMIT = 1000;

export class ServiceError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function normalizeLimit(
  value: unknown,
  defaultLimit: number,
  maxLimit: number,
): number {
  if (value === undefined) {
    return defaultLimit;
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ServiceError("limit must be a positive integer", 400);
  }

  return Math.min(limit, maxLimit);
}

function toDateTimeIso(datetime: number): string {
  const milliseconds = datetime < 10_000_000_000 ? datetime * 1000 : datetime;
  return new Date(milliseconds).toISOString();
}

function toBusRecordResponse(record: BusRecord): BusRecordResponse {
  return {
    ...record,
    datetime_iso: toDateTimeIso(record.datetime),
  };
}

export class BusService {
  private playbackDurationSeconds: number | undefined;

  public constructor(private readonly busRepository: IBusRepository) {}

  public async getNextSnapshot(
    elapsedSecondsValue?: unknown,
  ): Promise<PlaybackResponse<BusRecordResponse>> {
    const durationSeconds = await this.ensurePlaybackDuration();
    const elapsedSeconds = this.normalizePlaybackElapsedSeconds(
      elapsedSecondsValue,
      durationSeconds,
    );
    const records = await this.busRepository.fetchSnapshot(
      elapsedSeconds,
      config.PLAYBACK_ACTIVE_WINDOW_SECONDS,
    );
    const candidateElapsedSeconds =
      elapsedSeconds + config.PLAYBACK_STEP_SECONDS;
    const hasMore = candidateElapsedSeconds <= durationSeconds;
    const nextPlaybackElapsedSeconds = hasMore ? candidateElapsedSeconds : 0;

    console.log(
      `[playback] snapshot elapsed=${elapsedSeconds}s vehicles=${records.length} next=${nextPlaybackElapsedSeconds}s hasMore=${hasMore}`,
    );

    return {
      data: records.map(toBusRecordResponse),
      playbackElapsedSeconds: elapsedSeconds,
      nextPlaybackElapsedSeconds,
      hasMore,
    };
  }

  public async resetPlayback(): Promise<number> {
    await this.ensurePlaybackDuration(true);
    console.log("[playback] elapsed time reset to 0s");
    return 0;
  }

  public async getLatestBuses(): Promise<BusRecordResponse[]> {
    const records = await this.busRepository.fetchLatest();
    return records.map(toBusRecordResponse);
  }

  public async getTrajectory(
    vehicleId: unknown,
    limitValue?: unknown,
  ): Promise<BusRecordResponse[]> {
    if (typeof vehicleId !== "string" || vehicleId.trim() === "") {
      throw new ServiceError("vehicleId is required", 400);
    }

    const limit = normalizeLimit(
      limitValue,
      DEFAULT_TRAJECTORY_LIMIT,
      MAX_TRAJECTORY_LIMIT,
    );
    const records = await this.busRepository.fetchTrajectory(vehicleId.trim(), limit);

    if (records.length === 0) {
      throw new ServiceError("vehicle trajectory not found", 404);
    }

    return records.map(toBusRecordResponse);
  }

  public async getRoutes(): Promise<RouteInfo[]> {
    return this.busRepository.fetchRoutes();
  }

  public async getStats(): Promise<StatsSummary> {
    const stats = await this.busRepository.fetchStats();

    if (stats === undefined) {
      throw new ServiceError("statistics are unavailable", 503);
    }

    return stats;
  }

  private async ensurePlaybackDuration(refresh = false): Promise<number> {
    if (refresh || this.playbackDurationSeconds === undefined) {
      this.playbackDurationSeconds =
        await this.busRepository.fetchPlaybackDurationSeconds();
    }

    if (this.playbackDurationSeconds === undefined) {
      throw new ServiceError("playback dataset is empty", 503);
    }

    return this.playbackDurationSeconds;
  }

  private normalizePlaybackElapsedSeconds(
    value: unknown,
    durationSeconds: number,
  ): number {
    if (value === undefined) {
      return 0;
    }

    const elapsedSeconds = Number(value);
    if (
      !Number.isInteger(elapsedSeconds) ||
      elapsedSeconds < 0 ||
      elapsedSeconds > durationSeconds
    ) {
      throw new ServiceError("elapsedSeconds is outside the playback range", 400);
    }

    return elapsedSeconds;
  }
}

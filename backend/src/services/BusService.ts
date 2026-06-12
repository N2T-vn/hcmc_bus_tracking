/**
 * Global time-window playback service.
 */

import { config } from "../config/env";
import type {
  BusRecord,
  BusRecordResponse,
  PlaybackRange,
  PlaybackResponse,
} from "../models/types";
import type { IBusRepository } from "../repositories/IBusRepository";

const DEFAULT_TRAJECTORY_LIMIT = 200; // Keeps the default Leaflet polyline lightweight.
const MAX_TRAJECTORY_LIMIT = 1000; // Prevents unbounded trajectory responses.

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
  return new Date(datetime).toISOString();
}

function toBusRecordResponse(record: BusRecord): BusRecordResponse {
  return {
    ...record,
    datetime_iso: toDateTimeIso(record.datetime),
  };
}

export class BusService {
  private cursorTimestamp: number | undefined; // Simulated dataset time shared by clients.
  private playbackRange: PlaybackRange | undefined; // Cached static MIN/MAX timestamps.
  private resetOnNextTick = false; // Clears stale client positions after replay wraps.

  public constructor(private readonly busRepository: IBusRepository) {}

  public async getNextWindow(): Promise<PlaybackResponse<BusRecordResponse>> {
    const range = await this.ensurePlaybackRange();
    let reset = this.resetOnNextTick; // Included in the response so clients clear old markers.

    if (
      this.cursorTimestamp === undefined ||
      this.cursorTimestamp > range.endTimestamp
    ) {
      // Always initialize T from the earliest database timestamp.
      this.cursorTimestamp = range.startTimestamp;
      reset = true;
    }

    this.resetOnNextTick = false;
    const windowStartTimestamp = this.cursorTimestamp;
    // Each one-second frontend poll advances simulated time by this many seconds.
    const requestedWindowEnd =
      windowStartTimestamp + config.SPEED_MULTIPLIER * 1000;
    // fetchWindow uses [start, end), so one millisecond includes the final ping.
    const windowEndTimestamp = Math.min(
      requestedWindowEnd,
      range.endTimestamp + 1,
    );
    const records = await this.busRepository.fetchWindow(
      windowStartTimestamp,
      windowEndTimestamp,
    );

    const hasMore = requestedWindowEnd <= range.endTimestamp;
    // Advance T by time, never by row count, OFFSET, or LIMIT.
    this.cursorTimestamp = hasMore
      ? requestedWindowEnd
      : range.endTimestamp + 1;
    this.resetOnNextTick = !hasMore;

    return {
      data: records.map(toBusRecordResponse),
      windowStartTimestamp,
      windowStartIso: toDateTimeIso(windowStartTimestamp),
      windowEndTimestamp,
      windowEndIso: toDateTimeIso(windowEndTimestamp),
      nextCursorTimestamp: this.cursorTimestamp,
      reset,
      hasMore,
    };
  }

  public async resetPlayback(): Promise<number> {
    const range = await this.ensurePlaybackRange(true);
    this.cursorTimestamp = range.startTimestamp;
    this.resetOnNextTick = true;
    return this.cursorTimestamp;
  }

  public async getTrajectory(
    vehicleId: unknown,
    targetTimestampValue?: unknown,
    limitValue?: unknown,
  ): Promise<BusRecordResponse[]> {
    if (typeof vehicleId !== "string" || vehicleId.trim() === "") {
      throw new ServiceError("vehicleId is required", 400);
    }

    const targetTimestamp = Number(targetTimestampValue);
    if (!Number.isFinite(targetTimestamp)) {
      throw new ServiceError("targetTimestamp is required", 400);
    }

    const limit = normalizeLimit(
      limitValue,
      DEFAULT_TRAJECTORY_LIMIT,
      MAX_TRAJECTORY_LIMIT,
    );
    const records = await this.busRepository.fetchTrajectory(
      vehicleId.trim(),
      targetTimestamp,
      config.TRAJECTORY_WINDOW_SECONDS,
      limit,
    );

    if (records.length === 0) {
      throw new ServiceError("vehicle trajectory not found", 404);
    }

    return records.map(toBusRecordResponse);
  }

  private async ensurePlaybackRange(refresh = false): Promise<PlaybackRange> {
    if (refresh || this.playbackRange === undefined) {
      // A reset refreshes the range in case the source table was replaced.
      this.playbackRange = await this.busRepository.fetchPlaybackRange();
    }

    if (this.playbackRange === undefined) {
      throw new ServiceError("playback dataset is empty", 503);
    }

    return this.playbackRange;
  }
}

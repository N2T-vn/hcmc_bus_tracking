/**
 * TypeScript interfaces for bus records and playback API payloads.
 */

export interface BusRecord {
  vehicle: string;
  speed: number | null;
  datetime: number;
  x: number;
  y: number;
  heading: number | null;
  ignition: boolean | null;
  aircon: boolean | null;
}

export interface BusRecordResponse extends BusRecord {
  datetime_iso: string;
}

export interface PlaybackRange {
  startTimestamp: number;
  endTimestamp: number;
}

export interface PlaybackResponse<T> {
  data: T[];
  windowStartTimestamp: number;
  windowStartIso: string;
  windowEndTimestamp: number;
  windowEndIso: string;
  nextCursorTimestamp: number;
  reset: boolean;
  hasMore: boolean;
}

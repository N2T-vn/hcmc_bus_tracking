/**
 * Shared frontend interfaces mirroring backend API models.
 */

export interface BusRecord {
  vehicle: string;
  speed: number | null;
  datetime: number;
  datetime_iso: string;
  x: number;
  y: number;
  heading: number | null;
  ignition: boolean | null;
  aircon: boolean | null;
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

export interface CollectionResponse<T> {
  data: T[];
}

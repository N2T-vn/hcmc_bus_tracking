/**
 * TypeScript interfaces for backend bus records, dataset statistics, and API payloads.
 */

export interface BusRecord {
  vehicle: string;
  driver: string;
  speed: number;
  datetime: number;
  x: number;
  y: number;
  heading: number;
  ignition: boolean;
  aircon: boolean;
  door_up: boolean;
  door_down: boolean;
  working: boolean;
}

export interface BusRecordResponse extends BusRecord {
  datetime_iso: string;
}

export interface StatsSummary {
  totalRecords: number;
  totalVehicles: number;
  avgSpeed: number;
  activeVehicles: number;
}

export interface PlaybackResponse<T> {
  data: T[];
  playbackElapsedSeconds: number;
  nextPlaybackElapsedSeconds: number;
  hasMore: boolean;
}

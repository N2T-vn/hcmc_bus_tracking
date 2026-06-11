/**
 * TypeScript interfaces for backend bus records, route statistics, and API payloads.
 */

export interface BusRecord {
  vehicle: string;
  route: string;
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
  sos: boolean;
  working: boolean;
}

export interface BusRecordResponse extends BusRecord {
  datetime_iso: string;
}

export interface RouteInfo {
  route: string;
  vehicleCount: number;
  recordCount: number;
}

export interface StatsSummary {
  totalRecords: number;
  totalVehicles: number;
  avgSpeed: number;
  activeVehicles: number;
  sosCount: number;
}

export interface PlaybackResponse<T> {
  data: T[];
  playbackElapsedSeconds: number;
  nextPlaybackElapsedSeconds: number;
  hasMore: boolean;
}

/**
 * Typed frontend API client for fetch calls to the backend.
 */

import type {
  BusRecord,
  CollectionResponse,
  PlaybackResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"; // Backend origin.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function query(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const value = searchParams.toString();
  return value === "" ? "" : `?${value}`;
}

export const api = {
  getNextBuses(): Promise<PlaybackResponse<BusRecord>> {
    return request("/api/buses/next");
  },

  resetPlayback(): Promise<{ cursorTimestamp: number; cursorIso: string }> {
    return request("/api/buses/reset", { method: "POST" });
  },

  getTrajectory(
    vehicleId: string,
    targetTimestamp: number,
    limit = 200,
  ): Promise<CollectionResponse<BusRecord>> {
    return request(
      `/api/buses/${encodeURIComponent(vehicleId)}/trajectory${query({
        targetTimestamp,
        limit,
      })}`,
    );
  },
};

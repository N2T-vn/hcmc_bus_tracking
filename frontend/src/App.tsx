/**
 * Root React component for global time-window playback.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BusMap } from "./components/BusMap";
import { StatsPanel } from "./components/StatsPanel";
import { usePolling } from "./hooks/usePolling";
import { api } from "./services/api";
import type { BusRecord } from "./types";

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 1000); // Real-time tick rate.

export default function App() {
  const [selectedBus, setSelectedBus] = useState<BusRecord | null>(null);
  const [trajectory, setTrajectory] = useState<BusRecord[]>([]); // Selected bus rolling trail.
  const [busByVehicle, setBusByVehicle] = useState<Map<string, BusRecord>>(
    () => new Map(),
  ); // Last known state for every vehicle seen during this replay.
  const [isPolling, setIsPolling] = useState(true);
  const [isPlaybackReady, setIsPlaybackReady] = useState(false); // Blocks polling until reset.
  const [sideError, setSideError] = useState<string | null>(null); // Non-polling API errors.

  const fetchNextBuses = useCallback(() => api.getNextBuses(), []);
  const {
    data: batch,
    error: pollingError,
    isLoading,
    lastUpdated,
    refresh,
  } = usePolling(fetchNextBuses, POLL_INTERVAL_MS, isPolling && isPlaybackReady);

  useEffect(() => {
    let isMounted = true; // Prevents state updates after this effect is disposed.

    async function initializePlayback(): Promise<void> {
      try {
        await api.resetPlayback();

        if (isMounted) {
          setBusByVehicle(new Map());
          setSelectedBus(null);
          setTrajectory([]);
          setSideError(null);
          setIsPlaybackReady(true);
        }
      } catch (caught) {
        if (isMounted) {
          setSideError(
            caught instanceof Error ? caught.message : "Failed to initialize playback",
          );
          setIsPlaybackReady(true);
        }
      }
    }

    void initializePlayback();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (batch === null) {
      return;
    }

    setBusByVehicle((previous) => {
      // A replay reset removes positions retained from the previous dataset cycle.
      const next = batch.reset ? new Map<string, BusRecord>() : new Map(previous);

      // Rows are chronological, so repeated pings leave the latest state in the map.
      batch.data.forEach((bus) => next.set(bus.vehicle, bus));
      return next;
    });

    setSelectedBus((current) => {
      if (current === null || batch.reset) {
        return null;
      }

      // Keep the selected marker and popup synchronized with its newest ping.
      return (
        [...batch.data]
          .reverse()
          .find((bus) => bus.vehicle === current.vehicle) ?? current
      );
    });
  }, [batch]);

  useEffect(() => {
    if (selectedBus === null || batch === null) {
      setTrajectory([]);
      return;
    }

    let isMounted = true; // Ignores a late trajectory response after selection changes.
    // Refresh the server-bounded rolling trail as simulated time advances.
    api
      .getTrajectory(selectedBus.vehicle, batch.windowEndTimestamp, 120)
      .then((response) => {
        if (isMounted) {
          setTrajectory(response.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTrajectory([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [batch?.windowEndTimestamp, selectedBus?.vehicle]);

  const buses = useMemo(
    () => Array.from(busByVehicle.values()),
    [busByVehicle],
  );
  const activeSnapshotCount = buses.filter(
    (bus) => bus.ignition === true,
  ).length;
  // Missing speed is unreported data and must not reduce the calculated average.
  const availableSpeeds = buses.flatMap((bus) =>
    bus.speed === null ? [] : [bus.speed],
  );
  const averageSnapshotSpeed =
    availableSpeeds.length === 0
      ? null
      : availableSpeeds.reduce((total, speed) => total + speed, 0) /
        availableSpeeds.length;

  const error = pollingError ?? sideError;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>HCMC Bus GPS Visualization</h1>
          <p>Static GPS records replayed through a global time window.</p>
        </div>
        <button className="primary-action" onClick={() => void refresh()} type="button">
          Refresh
        </button>
      </header>

      <div className="content-grid">
        <StatsPanel
          activeSnapshotCount={activeSnapshotCount}
          averageSnapshotSpeed={averageSnapshotSpeed}
          isPolling={isPolling}
          lastUpdated={lastUpdated}
          onPollingChange={setIsPolling}
          playbackTimestampIso={batch?.windowEndIso ?? null}
          selectedVehicle={selectedBus?.vehicle ?? null}
          totalSnapshotCount={buses.length}
        />

        <section className="map-area">
          {error ? <div className="alert">{error}</div> : null}
          {isLoading && buses.length === 0 ? (
            <div className="loading-panel">Waiting for the first vehicle pings...</div>
          ) : null}
          <BusMap
            buses={buses}
            onSelectBus={setSelectedBus}
            selectedBus={selectedBus}
            trajectory={trajectory}
          />
        </section>
      </div>
    </main>
  );
}

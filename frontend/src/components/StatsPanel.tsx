/**
 * Statistics panel component for dataset and playback metrics.
 */

import { formatDatasetDateTime } from "../utils/dateTime";
import type { StationaryAlert } from "../types";

interface StatsPanelProps {
  totalSnapshotCount: number;
  visibleSnapshotCount: number;
  activeSnapshotCount: number;
  averageSnapshotSpeed: number | null;
  playbackTimestampIso: string | null;
  lastUpdated: Date | null;
  isPolling: boolean;
  selectedVehicle: string | null;
  vehicleSearch: string;
  stationaryAlerts: StationaryAlert[];
  stationaryDurationMinutes: number;
  stationaryRadiusMeters: number;
  onPollingChange: (enabled: boolean) => void;
  onVehicleSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onInspectAlert: (vehicle: string) => void;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function StatsPanel({
  totalSnapshotCount,
  visibleSnapshotCount,
  activeSnapshotCount,
  averageSnapshotSpeed,
  playbackTimestampIso,
  lastUpdated,
  isPolling,
  selectedVehicle,
  vehicleSearch,
  stationaryAlerts,
  stationaryDurationMinutes,
  stationaryRadiusMeters,
  onPollingChange,
  onVehicleSearchChange,
  onClearSearch,
  onInspectAlert,
}: StatsPanelProps) {
  const hasSearch = vehicleSearch.trim() !== "";

  return (
    <aside className="side-panel">
      <section className="panel-section">
        <div className="panel-heading">
          <span>Live snapshot</span>
          <button
            className={isPolling ? "toggle toggle--on" : "toggle"}
            onClick={() => onPollingChange(!isPolling)}
            type="button"
          >
            {isPolling ? "Pause" : "Resume"}
          </button>
        </div>

        <div className="metric-grid">
          <div>
            <span>Vehicles</span>
            <strong>
              {hasSearch
                ? `${visibleSnapshotCount} / ${totalSnapshotCount}`
                : totalSnapshotCount}
            </strong>
          </div>
          <div>
            <span>Average speed</span>
            <strong>
              {averageSnapshotSpeed === null
                ? "-"
                : `${averageSnapshotSpeed.toFixed(1)} km/h`}
            </strong>
          </div>
          <div>
            <span>Ignition on</span>
            <strong>{activeSnapshotCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel-section search-section">
        <div className="panel-heading">
          <span>Find vehicle</span>
          <button
            className="text-action"
            disabled={!hasSearch}
            onClick={onClearSearch}
            type="button"
          >
            Clear
          </button>
        </div>

        <label className="field">
          <span>Vehicle ID</span>
          <input
            onChange={(event) => onVehicleSearchChange(event.target.value)}
            placeholder="Search vehicle ID"
            type="search"
            value={vehicleSearch}
          />
        </label>
        {hasSearch && visibleSnapshotCount === 0 ? (
          <p className="search-empty">No vehicle matches this ID.</p>
        ) : null}
      </section>

      <section className="panel-section alert-section">
        <div className="panel-heading">
          <span>Stationary alerts</span>
          <span className="alert-count">{stationaryAlerts.length}</span>
        </div>
        <p className="section-description">
          Vehicles remaining within {stationaryRadiusMeters} m for at least{" "}
          {stationaryDurationMinutes} dataset minutes.
        </p>

        {stationaryAlerts.length === 0 ? (
          <p className="alert-empty">No active stationary alerts.</p>
        ) : (
          <div className="stationary-alert-list">
            {stationaryAlerts.map((alert) => (
              <button
                className="stationary-alert-card"
                key={alert.vehicle}
                onClick={() => onInspectAlert(alert.vehicle)}
                type="button"
              >
                <span className="stationary-alert-header">
                  <strong>{alert.vehicle}</strong>
                  <span>{alert.occurrenceCount} alert(s)</span>
                </span>
                <span>
                  Stationary for {formatDuration(alert.durationSeconds)}
                </span>
                <span>
                  Since {formatDatasetDateTime(
                    new Date(alert.sinceTimestamp).toISOString(),
                  )}
                </span>
                <span className="inspect-label">Search and inspect</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedVehicle ? (
        <section className="panel-section">
          <div className="status-list">
            <div>
              <span>Live trail</span>
              <strong>{selectedVehicle}</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel-section">
        <div className="status-list">
          <div>
            <span>Playback time</span>
            <strong>
              {playbackTimestampIso === null
                ? "-"
                : formatDatasetDateTime(playbackTimestampIso)}
            </strong>
          </div>
          <div>
            <span>Last update</span>
            <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}

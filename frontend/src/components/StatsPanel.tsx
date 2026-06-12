/**
 * Statistics panel component for dataset and playback metrics.
 */

interface StatsPanelProps {
  totalSnapshotCount: number;
  activeSnapshotCount: number;
  averageSnapshotSpeed: number | null;
  playbackTimestampIso: string | null;
  lastUpdated: Date | null;
  isPolling: boolean;
  selectedVehicle: string | null;
  onPollingChange: (enabled: boolean) => void;
}

export function StatsPanel({
  totalSnapshotCount,
  activeSnapshotCount,
  averageSnapshotSpeed,
  playbackTimestampIso,
  lastUpdated,
  isPolling,
  selectedVehicle,
  onPollingChange,
}: StatsPanelProps) {
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
            <strong>{totalSnapshotCount}</strong>
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
                : new Date(playbackTimestampIso).toLocaleTimeString()}
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

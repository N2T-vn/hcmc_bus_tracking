/**
 * Leaflet map component responsible for rendering bus markers.
 */

import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import type { BusRecord } from "../types";
import { BusMarker } from "./BusMarker";

const HCMC_CENTER: [number, number] = [10.7769, 106.7009]; // Default map viewport.

interface BusMapProps {
  buses: BusRecord[];
  selectedBus: BusRecord | null;
  trajectory: BusRecord[];
  onSelectBus: (bus: BusRecord) => void;
}

export function BusMap({
  buses,
  selectedBus,
  trajectory,
  onSelectBus,
}: BusMapProps) {
  return (
    <MapContainer
      center={HCMC_CENTER}
      className="bus-map"
      maxZoom={18}
      minZoom={10}
      scrollWheelZoom
      zoom={12}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {trajectory.length > 1 ? (
        <Polyline
          // A rolling 15-minute static polyline keeps the query and Leaflet
          // workload bounded; refreshing it each tick adds motion without a
          // separate path-animation system.
          pathOptions={{ color: "#2563eb", opacity: 0.72, weight: 4 }}
          positions={trajectory.map((point) => [point.y, point.x])}
        />
      ) : null}

      {buses.map((bus) => (
        <BusMarker
          bus={bus}
          isSelected={selectedBus?.vehicle === bus.vehicle}
          key={bus.vehicle}
          onSelect={onSelectBus}
        />
      ))}
    </MapContainer>
  );
}

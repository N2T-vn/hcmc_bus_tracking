/**
 * Individual bus marker component for map display.
 */

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { BusRecord } from "../types";

interface BusMarkerProps {
  bus: BusRecord;
  isSelected: boolean;
  onSelect: (bus: BusRecord) => void;
}

function createBusIcon(bus: BusRecord, isSelected: boolean): L.DivIcon {
  const classes = [
    "bus-marker",
    bus.ignition === true ? "bus-marker--active" : "bus-marker--inactive",
    isSelected ? "bus-marker--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "bus-marker-shell",
    // Leave unknown headings unrotated instead of implying a northbound direction.
    html: `<span class="${classes}"${
      bus.heading === null ? "" : ` style="transform: rotate(${bus.heading}deg)"`
    }></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export function BusMarker({ bus, isSelected, onSelect }: BusMarkerProps) {
  return (
    <Marker
      eventHandlers={{
        click: () => onSelect(bus),
      }}
      icon={createBusIcon(bus, isSelected)}
      // Leaflet expects [latitude, longitude]; the API exposes y=lat and x=lng.
      position={[bus.y, bus.x]}
    >
      <Popup>
        <div className="marker-popup">
          <strong>{bus.vehicle}</strong>
          <span>
            Speed: {bus.speed === null ? "unavailable" : `${bus.speed.toFixed(1)} km/h`}
          </span>
          <span>
            Ignition: {bus.ignition === null ? "unavailable" : bus.ignition ? "on" : "off"}
          </span>
          <span>
            Aircon: {bus.aircon === null ? "unavailable" : bus.aircon ? "on" : "off"}
          </span>
          <span>{new Date(bus.datetime_iso).toLocaleString()}</span>
        </div>
      </Popup>
    </Marker>
  );
}

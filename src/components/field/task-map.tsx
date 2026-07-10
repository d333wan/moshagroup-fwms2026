import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

// Fix default marker icons for bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type TaskPin = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  address?: string | null;
};

function FitBounds({ pins }: { pins: TaskPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [pins, map]);
  return null;
}

export function TaskMap({ pins, height = 320 }: { pins: TaskPin[]; height?: number }) {
  const center: [number, number] =
    pins.length > 0 ? [pins[0].lat, pins[0].lon] : [-6.2, 106.8]; // Jakarta default
  return (
    <div style={{ height }} className="overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lon]}>
            <Popup>
              <div className="text-sm font-medium">{p.title}</div>
              {p.address && (
                <div className="text-xs text-muted-foreground">{p.address}</div>
              )}
              <a
                className="text-xs text-primary underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
              >
                Buka rute Google Maps
              </a>
            </Popup>
          </Marker>
        ))}
        <FitBounds pins={pins} />
      </MapContainer>
    </div>
  );
}

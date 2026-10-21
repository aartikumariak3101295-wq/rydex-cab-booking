
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitRoute({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [35, 35] });
    }
  }, [map, points]);

  return null;
}

export default function RideMap({ route }) {
  if (!route?.pickupCoords || !route?.dropoffCoords) {
    return (
      <div className="ride-map-placeholder">
        Enter pickup and destination to preview your route on the map.
      </div>
    );
  }

  const start = [
    route.pickupCoords.lat,
    route.pickupCoords.lon,
  ];

  const end = [
    route.dropoffCoords.lat,
    route.dropoffCoords.lon,
  ];

  const points = [start, end];

  return (
    <div className="ride-map-wrapper">
      <MapContainer
        center={start}
        zoom={12}
        scrollWheelZoom
        style={{ height: "350px", width: "100%", borderRadius: "16px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRoute points={points} />

        <Marker position={start} icon={pickupIcon}>
          <Popup>Pickup location</Popup>
        </Marker>

        <Marker position={end} icon={destinationIcon}>
          <Popup>Destination</Popup>
        </Marker>

        <Polyline positions={points} pathOptions={{ color: "#0d9862", weight: 5 }} />
      </MapContainer>
    </div>
  );
}

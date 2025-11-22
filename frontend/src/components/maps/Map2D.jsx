import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom AQI Marker Icon
const createAQIIcon = (aqi, category) => {
  let color = '#00e400';
  if (aqi > 300) color = '#7e0023';
  else if (aqi > 200) color = '#8f3f97';
  else if (aqi > 150) color = '#ff0000';
  else if (aqi > 100) color = '#ff7e00';
  else if (aqi > 50) color = '#ffff00';

  return L.divIcon({
    className: 'custom-aqi-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
      color: ${aqi > 100 ? 'white' : 'black'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${aqi}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Component to recenter map
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 10);
    }
  }, [center, map]);
  return null;
}

const Map2D = ({ center, aqiStations, cycloneTrack, rainfallData, showLayers }) => {
  const [mapCenter, setMapCenter] = useState(center || [20.5937, 78.9629]); // Default: India

  useEffect(() => {
    if (center) {
      setMapCenter(center);
    }
  }, [center]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <MapRecenter center={mapCenter} />
      
      {/* Base Map Layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Center Location Marker */}
      {center && (
        <Marker position={center}>
          <Popup>
            <div className="text-sm">
              <strong>Selected Location</strong>
              <br />
              Lat: {center[0].toFixed(4)}
              <br />
              Lon: {center[1].toFixed(4)}
            </div>
          </Popup>
        </Marker>
      )}

      {/* AQI Station Markers */}
      {showLayers?.aqi && aqiStations && aqiStations.length > 0 && aqiStations.map((station, index) => (
        station.lat && station.lon && (
          <Marker
            key={`aqi-${index}`}
            position={[station.lat, station.lon]}
            icon={createAQIIcon(station.aqi, station.category)}
          >
            <Popup>
              <div className="text-sm">
                <strong>{station.name}</strong>
                <br />
                AQI: <span style={{ color: station.color, fontWeight: 'bold' }}>{station.aqi}</span>
                <br />
                Category: {station.category}
                {station.pollutants && (
                  <>
                    <br />
                    <br />
                    <strong>Pollutants:</strong>
                    {station.pollutants.pm25 && <><br />PM2.5: {station.pollutants.pm25.toFixed(1)} µg/m³</>}
                    {station.pollutants.pm10 && <><br />PM10: {station.pollutants.pm10.toFixed(1)} µg/m³</>}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )
      ))}

      {/* Rainfall Zones (circles) */}
      {showLayers?.rainfall && rainfallData && rainfallData.length > 0 && rainfallData.map((zone, index) => {
        const intensity = zone.intensity || 0;
        const amount = zone.amount || 0;
        const radius = Math.max(intensity * 5000, 1000); // Minimum 1km radius
        
        return zone.lat && zone.lon && !isNaN(zone.lat) && !isNaN(zone.lon) && !isNaN(radius) ? (
          <Circle
            key={`rain-${index}`}
            center={[zone.lat, zone.lon]}
            radius={radius}
            pathOptions={{
              color: 'blue',
              fillColor: '#3b82f6',
              fillOpacity: Math.min(0.3 * (intensity / 100), 0.5),
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>Rainfall Zone</strong>
                <br />
                Intensity: {intensity}%
                <br />
                Amount: {amount}mm
              </div>
            </Popup>
          </Circle>
        ) : null;
      })}

      {/* Cyclone Track Path */}
      {showLayers?.cyclone && cycloneTrack && cycloneTrack.length > 0 && (
        <>
          <Polyline
            positions={cycloneTrack.filter(point => point.lat && point.lon && !isNaN(point.lat) && !isNaN(point.lon)).map(point => [point.lat, point.lon])}
            pathOptions={{
              color: '#dc2626',
              weight: 3,
              dashArray: '10, 10',
            }}
          />
          {cycloneTrack.map((point, index) => {
            const intensity = point.intensity || 50;
            const radius = Math.max(intensity * 1000, 5000); // Minimum 5km radius
            
            return point.lat && point.lon && !isNaN(point.lat) && !isNaN(point.lon) && !isNaN(radius) ? (
              <Circle
                key={`cyclone-${index}`}
                center={[point.lat, point.lon]}
                radius={radius}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 0.3,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Cyclone Position</strong>
                    <br />
                    Time: {point.time || 'Unknown'}
                    <br />
                    Intensity: {intensity}
                    <br />
                    Wind Speed: {point.wind_speed || 'N/A'} km/h
                  </div>
                </Popup>
              </Circle>
            ) : null;
          })}
        </>
      )}
    </MapContainer>
  );
};

export default Map2D;

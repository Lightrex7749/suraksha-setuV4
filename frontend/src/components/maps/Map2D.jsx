import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// AQI Heat Map Layer Component
function AQIHeatMap({ stations }) {
  const map = useMap();

  useEffect(() => {
    if (!stations || stations.length === 0) return;

    // Create canvas overlay for heat map effect
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const bounds = map.getBounds();
    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';
    
    // Draw heat circles for each station
    stations.forEach(station => {
      if (!station.lat || !station.lon) return;
      
      const point = map.latLngToContainerPoint([station.lat, station.lon]);
      const aqi = station.aqi || 0;
      
      // Determine color based on AQI
      let color;
      if (aqi <= 50) color = 'rgba(0, 228, 0, 0.4)';
      else if (aqi <= 100) color = 'rgba(255, 255, 0, 0.4)';
      else if (aqi <= 150) color = 'rgba(255, 126, 0, 0.4)';
      else if (aqi <= 200) color = 'rgba(255, 0, 0, 0.4)';
      else if (aqi <= 300) color = 'rgba(143, 63, 151, 0.4)';
      else color = 'rgba(126, 0, 35, 0.4)';
      
      // Draw gradient circle
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 50);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Add canvas to map pane
    const mapPane = map.getPane('overlayPane');
    mapPane.appendChild(canvas);
    
    // Cleanup on unmount or stations change
    return () => {
      if (mapPane.contains(canvas)) {
        mapPane.removeChild(canvas);
      }
    };
  }, [stations, map]);

  return null;
}

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

// Custom alert marker icon
const createAlertIcon = (severity) => {
  const color = severity === 'critical' || severity === 'red' ? '#EF4444'
    : severity === 'warning' || severity === 'orange' ? '#F59E0B'
    : '#3B82F6';
  return L.divIcon({
    className: 'custom-alert-marker',
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">!</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Component to recenter map
function MapRecenter({ center, searchRadius }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const zoom = searchRadius ? 12 : 6;
      map.setView(center, zoom);
    }
  }, [center, searchRadius, map]);
  return null;
}

const Map2D = ({ center, aqiStations, cycloneTrack, rainfallData, showLayers, searchRadius, alerts }) => {
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
      <MapRecenter center={mapCenter} searchRadius={searchRadius} />
      
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

      {/* AQI Heat Map Overlay */}
      {showLayers?.aqiHeatMap && aqiStations && aqiStations.length > 0 && (
        <AQIHeatMap stations={aqiStations} />
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

      {/* 10km Search Radius Circle */}
      {searchRadius && center && (
        <Circle
          center={center}
          radius={searchRadius}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.06,
            weight: 2,
            dashArray: '8, 4',
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>Search Area</strong>
              <br />
              Radius: {(searchRadius / 1000).toFixed(0)} km
            </div>
          </Popup>
        </Circle>
      )}

      {/* Alert Markers */}
      {alerts && alerts.length > 0 && alerts.map((alert, index) => {
        const lat = alert.coordinates?.lat || alert.position?.lat;
        const lon = alert.coordinates?.lon || alert.coordinates?.lng || alert.position?.lng || alert.position?.lon;
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
        return (
          <Marker key={`alert-${alert.id || index}`} position={[lat, lon]} icon={createAlertIcon(alert.severity)}>
            <Popup>
              <div className="text-sm">
                <strong>{alert.title || alert.type || 'Alert'}</strong>
                <br />
                {alert.severity && <><span style={{color: alert.severity === 'critical' ? '#EF4444' : '#F59E0B', fontWeight: 'bold'}}>{alert.severity}</span><br/></>}
                {alert.description || alert.location || ''}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default Map2D;

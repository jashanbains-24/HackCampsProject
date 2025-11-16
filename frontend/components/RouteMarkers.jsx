import React, { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet (only run once)
let iconFixed = false;
if (!iconFixed) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
  iconFixed = true;
}

const RouteMarkers = memo(function RouteMarkers({ start, end, startLabel = 'Start', endLabel = 'End' }) {
  return (
    <>
      {start && (
        <Marker position={start}>
          <Popup>{startLabel}</Popup>
        </Marker>
      )}
      {end && (
        <Marker position={end}>
          <Popup>{endLabel}</Popup>
        </Marker>
      )}
    </>
  );
});

export default RouteMarkers;


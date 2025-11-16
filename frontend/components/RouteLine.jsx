import React, { memo } from 'react';
import { Polyline } from 'react-leaflet';

const RouteLine = memo(function RouteLine({ route, color, weight = 6, opacity = 0.7 }) {
  if (!route || route.length === 0) {
    return null;
  }

  return (
    <Polyline
      positions={route}
      pathOptions={{
        color: color,
        weight: weight,
        opacity: opacity
      }}
    />
  );
});

export default RouteLine;


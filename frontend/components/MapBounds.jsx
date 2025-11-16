import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

function MapBounds({ fastestRoute, safestRoute, start, end }) {
  const map = useMap();
  const prevDataRef = useRef('');

  useEffect(() => {
    // Create a string representation of the data to compare
    const currentData = JSON.stringify({
      fastestLength: fastestRoute?.length || 0,
      safestLength: safestRoute?.length || 0,
      start: start,
      end: end
    });

    // Only fit bounds if data actually changed
    if (currentData !== prevDataRef.current) {
      prevDataRef.current = currentData;

      if ((fastestRoute && fastestRoute.length > 0) || (safestRoute && safestRoute.length > 0) || start || end) {
        const bounds = [];
        
        if (start) bounds.push(start);
        if (end) bounds.push(end);
        if (fastestRoute && fastestRoute.length > 0) {
          fastestRoute.forEach(coord => bounds.push(coord));
        }
        if (safestRoute && safestRoute.length > 0) {
          safestRoute.forEach(coord => bounds.push(coord));
        }

        if (bounds.length > 0) {
          // Use setTimeout to debounce and prevent lag
          setTimeout(() => {
            try {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            } catch (e) {
              console.warn('Error fitting bounds:', e);
            }
          }, 100);
        }
      }
    }
  }, [map, fastestRoute, safestRoute, start, end]);

  return null;
}

export default MapBounds;


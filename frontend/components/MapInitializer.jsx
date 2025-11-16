import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Component to initialize map and fix rendering issues
function MapInitializer() {
  const map = useMap();

  useEffect(() => {
    // Invalidate size after a short delay to ensure container is properly sized
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default MapInitializer;


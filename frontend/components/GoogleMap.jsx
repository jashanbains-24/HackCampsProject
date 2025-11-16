import React, { useEffect, useRef, useState } from 'react';

// Get API key from environment variable
// Set VITE_GOOGLE_MAPS_API_KEY in your .env file
// IMPORTANT: Do not commit your real API key to version control!
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error('VITE_GOOGLE_MAPS_API_KEY is not set in .env file');
}

// Default center (Vancouver)
const DEFAULT_CENTER = { lat: 49.28, lng: -123.12 };
const DEFAULT_ZOOM = 14;

// Convert array coordinates to Google Maps format
const convertToGoogleFormat = (coords) => {
  if (!coords || coords.length === 0) return [];
  // If already in Google format (objects with lat/lng), return as is
  if (coords[0] && typeof coords[0] === 'object' && 'lat' in coords[0]) {
    return coords;
  }
  // Convert from [lat, lng] array format
  return coords.map(coord => ({
    lat: Array.isArray(coord) ? coord[0] : coord.lat,
    lng: Array.isArray(coord) ? coord[1] : coord.lng
  }));
};

function GoogleMap({ fastestRoute, safestRoute, start, end, startLabel = 'Start', endLabel = 'End' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fastestPolylineRef = useRef(null);
  const safestPolylineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const startInfoWindowRef = useRef(null);
  const endInfoWindowRef = useRef(null);

  // Load Google Maps script
  useEffect(() => {
    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load the script with Places library
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in .env file');
      setIsLoaded(false);
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps API. Please check your API key in .env file');
      alert('Failed to load Google Maps. Please check your API key in .env file.');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        // Don't remove it as other components might need it
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
  }, [isLoaded]);

  // Update fastest route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !fastestRoute || fastestRoute.length === 0) {
      if (fastestPolylineRef.current) {
        fastestPolylineRef.current.setMap(null);
        fastestPolylineRef.current = null;
      }
      return;
    }

    const path = convertToGoogleFormat(fastestRoute);

    if (fastestPolylineRef.current) {
      fastestPolylineRef.current.setPath(path);
    } else {
      fastestPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#0000FF', // Blue
        strokeOpacity: 0.7,
        strokeWeight: 6,
        map: mapInstanceRef.current
      });
    }
  }, [fastestRoute, mapInstanceRef.current]);

  // Update safest route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !safestRoute || safestRoute.length === 0) {
      if (safestPolylineRef.current) {
        safestPolylineRef.current.setMap(null);
        safestPolylineRef.current = null;
      }
      return;
    }

    const path = convertToGoogleFormat(safestRoute);

    if (safestPolylineRef.current) {
      safestPolylineRef.current.setPath(path);
    } else {
      safestPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#00FF00', // Green
        strokeOpacity: 0.7,
        strokeWeight: 6,
        map: mapInstanceRef.current
      });
    }
  }, [safestRoute, mapInstanceRef.current]);

  // Update start marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (start) {
      const position = convertToGoogleFormat([start])[0];
      
      if (startMarkerRef.current) {
        startMarkerRef.current.setPosition(position);
        // Update info window content if label changed
        if (startInfoWindowRef.current) {
          startInfoWindowRef.current.setContent(`<div><strong>Start</strong><br/>${startLabel}</div>`);
        }
      } else {
        startMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          label: 'S',
          title: startLabel,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00FF00',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });
        
        // Add info window for start marker
        startInfoWindowRef.current = new window.google.maps.InfoWindow({
          content: `<div><strong>Start</strong><br/>${startLabel}</div>`
        });
        startMarkerRef.current.addListener('click', () => {
          startInfoWindowRef.current.open(mapInstanceRef.current, startMarkerRef.current);
        });
      }
    } else {
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
        startMarkerRef.current = null;
      }
    }
  }, [start, startLabel, mapInstanceRef.current]);

  // Update end marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (end) {
      const position = convertToGoogleFormat([end])[0];
      
      if (endMarkerRef.current) {
        endMarkerRef.current.setPosition(position);
        // Update info window content if label changed
        if (endInfoWindowRef.current) {
          endInfoWindowRef.current.setContent(`<div><strong>End</strong><br/>${endLabel}</div>`);
        }
      } else {
        endMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          label: 'E',
          title: endLabel,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FF0000',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });
        
        // Add info window for end marker
        endInfoWindowRef.current = new window.google.maps.InfoWindow({
          content: `<div><strong>End</strong><br/>${endLabel}</div>`
        });
        endMarkerRef.current.addListener('click', () => {
          endInfoWindowRef.current.open(mapInstanceRef.current, endMarkerRef.current);
        });
      }
    } else {
      if (endMarkerRef.current) {
        endMarkerRef.current.setMap(null);
        endMarkerRef.current = null;
      }
    }
  }, [end, endLabel, mapInstanceRef.current]);

  // Fit bounds to show all routes and markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    // Add fastest route
    if (fastestRoute && fastestRoute.length > 0) {
      const path = convertToGoogleFormat(fastestRoute);
      path.forEach(point => {
        bounds.extend(point);
        hasBounds = true;
      });
    }

    // Add safest route
    if (safestRoute && safestRoute.length > 0) {
      const path = convertToGoogleFormat(safestRoute);
      path.forEach(point => {
        bounds.extend(point);
        hasBounds = true;
      });
    }

    // Add start marker
    if (start) {
      const position = convertToGoogleFormat([start])[0];
      bounds.extend(position);
      hasBounds = true;
    }

    // Add end marker
    if (end) {
      const position = convertToGoogleFormat([end])[0];
      bounds.extend(position);
      hasBounds = true;
    }

    if (hasBounds) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 50
      });
    }
  }, [fastestRoute, safestRoute, start, end, mapInstanceRef.current]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '100%', 
        width: '100%',
        minHeight: 0
      }} 
    />
  );
}

export default GoogleMap;


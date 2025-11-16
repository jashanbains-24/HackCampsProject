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

function GoogleMap({ fastestRoute, safestRoute, start, end, startLabel = 'Start', endLabel = 'End', selectedRoute = 'safest', onRouteSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fastestPolylineRef = useRef(null);
  const fastestClickPolylineRef = useRef(null); // Invisible polyline for larger hitbox
  const safestPolylineRef = useRef(null);
  const safestClickPolylineRef = useRef(null); // Invisible polyline for larger hitbox
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

    // Ultra Dark Mode style configuration
    const darkModeStyles = [
      { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }, { weight: 2 }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8e8e93' }] },
      {
        featureType: 'all',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8e8e93' }]
      },
      {
        featureType: 'administrative',
        elementType: 'geometry',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#a8a8a8' }]
      },
      {
        featureType: 'administrative.neighborhood',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6e6e6e' }]
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6e6e6e' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#1a2a1a' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#4a6a4a' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#2a2a2a' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8e8e93' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#3a3a3a' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#a8a8a8' }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#2a2a2a' }]
      },
      {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [{ color: '#1f1f1f' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'geometry',
        stylers: [{ color: '#2a2a2a' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8e8e93' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0a0a0a' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#4a4a4a' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#0a0a0a' }]
      }
    ];

    const map = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: false,        // Remove map type selector
      streetViewControl: false,     // Remove street view button
      fullscreenControl: false,     // Remove fullscreen button
      zoomControl: false,           // Remove zoom buttons (+/-)
      scaleControl: false,          // Remove scale bar
      rotateControl: false,         // Remove rotate control
      panControl: false,           // Remove pan control
      clickableIcons: false,        // Disable clicking on POIs
      keyboardShortcuts: false,     // Disable keyboard shortcuts
      styles: darkModeStyles,
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
      if (fastestClickPolylineRef.current) {
        fastestClickPolylineRef.current.setMap(null);
        fastestClickPolylineRef.current = null;
      }
      return;
    }

    const path = convertToGoogleFormat(fastestRoute);
    const isSelected = selectedRoute === 'fastest';
    const opacity = isSelected ? 0.85 : 0.595; // 30% reduction when not selected (0.85 * 0.7)

    // Update or create visible polyline (original thickness)
    if (fastestPolylineRef.current) {
      fastestPolylineRef.current.setPath(path);
      fastestPolylineRef.current.setOptions({
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        clickable: false, // Disable clicks on visible line
        icons: [], // Remove arrows
      });
    } else {
      fastestPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#0572f7', // Apple Blue
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        map: mapInstanceRef.current,
        clickable: false, // Disable clicks on visible line
        icons: [], // No arrows
      });
    }

    // Create or update invisible clickable polyline with larger hitbox
    if (fastestClickPolylineRef.current) {
      fastestClickPolylineRef.current.setPath(path);
    } else {
      fastestClickPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#0A84FF',
        strokeOpacity: 0, // Completely invisible
        strokeWeight: 20, // Large hitbox for easy clicking
        map: mapInstanceRef.current,
        clickable: true,
        zIndex: 1 // Behind visible polyline
      });
      
      // Make invisible polyline handle clicks
      fastestClickPolylineRef.current.addListener('click', () => {
        if (onRouteSelect) onRouteSelect('fastest');
      });
    }
  }, [fastestRoute, mapInstanceRef.current, selectedRoute]);

  // Update safest route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !safestRoute || safestRoute.length === 0) {
      if (safestPolylineRef.current) {
        safestPolylineRef.current.setMap(null);
        safestPolylineRef.current = null;
      }
      if (safestClickPolylineRef.current) {
        safestClickPolylineRef.current.setMap(null);
        safestClickPolylineRef.current = null;
      }
      return;
    }

    const path = convertToGoogleFormat(safestRoute);
    const isSelected = selectedRoute === 'safest';
    const opacity = isSelected ? 0.85 : 0.595; // 30% reduction when not selected (0.85 * 0.7)

    // Update or create visible polyline (original thickness)
    if (safestPolylineRef.current) {
      safestPolylineRef.current.setPath(path);
      safestPolylineRef.current.setOptions({
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        clickable: false, // Disable clicks on visible line
        icons: [], // Remove arrows
      });
    } else {
      safestPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#00FF7F', // Spring Green
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        map: mapInstanceRef.current,
        clickable: false, // Disable clicks on visible line
        icons: [], // No arrows
      });
    }

    // Create or update invisible clickable polyline with larger hitbox
    if (safestClickPolylineRef.current) {
      safestClickPolylineRef.current.setPath(path);
    } else {
      safestClickPolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#00FF7F',
        strokeOpacity: 0, // Completely invisible
        strokeWeight: 20, // Large hitbox for easy clicking
        map: mapInstanceRef.current,
        clickable: true,
        zIndex: 1 // Behind visible polyline
      });
      
      // Make invisible polyline handle clicks
      safestClickPolylineRef.current.addListener('click', () => {
        if (onRouteSelect) onRouteSelect('safest');
      });
    }
  }, [safestRoute, mapInstanceRef.current, selectedRoute]);

  // Update start marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (start) {
      const position = convertToGoogleFormat([start])[0];
      
      if (startMarkerRef.current) {
        startMarkerRef.current.setPosition(position);
        // Update info window content if label changed
        if (startInfoWindowRef.current) {
          startInfoWindowRef.current.setContent(`<div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; padding: 8px 12px; font-size: 14px; color: #1C1C1E;"><strong style="font-weight: 600;">Start</strong><br/><span style="color: #636366;">${startLabel}</span></div>`);
        }
      } else {
        startMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          title: startLabel,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#30D158', // Apple Green
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
            anchor: new window.google.maps.Point(0, 0)
          },
          zIndex: 1000,
          optimized: false
        });
        
        // Add info window for start marker (Apple-style)
        startInfoWindowRef.current = new window.google.maps.InfoWindow({
          content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; padding: 8px 12px; font-size: 14px; color: #1C1C1E;"><strong style="font-weight: 600;">Start</strong><br/><span style="color: #636366;">${startLabel}</span></div>`
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
          endInfoWindowRef.current.setContent(`<div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; padding: 8px 12px; font-size: 14px; color: #1C1C1E;"><strong style="font-weight: 600;">End</strong><br/><span style="color: #636366;">${endLabel}</span></div>`);
        }
      } else {
        // Create circular checker flag icon
        const createCheckerFlagIcon = () => {
          const size = 36;
          const radius = size / 2 - 2;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Create clipping path for circle
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, radius, 0, 2 * Math.PI);
          ctx.clip();
          
          // Draw white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);
          
          // Draw checker pattern (6x6 grid)
          const checkSize = size / 6;
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
              if ((row + col) % 2 === 0) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(col * checkSize, row * checkSize, checkSize, checkSize);
              }
            }
          }
          
          // Draw circle border
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          return {
            url: canvas.toDataURL(),
            scaledSize: new window.google.maps.Size(size, size),
            anchor: new window.google.maps.Point(size / 2, size / 2)
          };
        };
        
        endMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          title: endLabel,
          icon: createCheckerFlagIcon(),
          zIndex: 1000,
          optimized: false
        });
        
        // Add info window for end marker (Apple-style)
        endInfoWindowRef.current = new window.google.maps.InfoWindow({
          content: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; padding: 8px 12px; font-size: 14px; color: #1C1C1E;"><strong style="font-weight: 600;">End</strong><br/><span style="color: #636366;">${endLabel}</span></div>`
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


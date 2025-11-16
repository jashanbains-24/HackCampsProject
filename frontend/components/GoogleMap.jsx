import React, { useEffect, useRef, useState } from 'react';

// Get API key from environment variable
// Set VITE_GOOGLE_MAPS_API_KEY in your .env file
// IMPORTANT: Do not commit your real API key to version control!
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Debug logging (remove in production)
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ VITE_GOOGLE_MAPS_API_KEY is not set in .env file');
  console.log('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
} else {
  console.log('✅ Google Maps API key loaded (length:', GOOGLE_MAPS_API_KEY.length, 'chars)');
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
  const [containerReady, setContainerReady] = useState(false);
  const fastestPolylineRef = useRef(null);
  const fastestClickPolylineRef = useRef(null); // Invisible polyline for larger hitbox
  const safestPolylineRef = useRef(null);
  const safestClickPolylineRef = useRef(null); // Invisible polyline for larger hitbox
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const startInfoWindowRef = useRef(null);
  const endInfoWindowRef = useRef(null);
  const fastestAnimationRef = useRef(null);
  const safestAnimationRef = useRef(null);
  const isInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef(null);

  // Simplify path using distance-based algorithm for performance
  const simplifyPath = (path, tolerance = 0.0001) => {
    if (!path || path.length <= 2) return path;
    
    // Simple distance-based simplification for performance
    const simplified = [path[0]];
    let lastPoint = path[0];
    
    for (let i = 1; i < path.length - 1; i++) {
      const point = path[i];
      const distance = Math.sqrt(
        Math.pow(point.lat - lastPoint.lat, 2) + 
        Math.pow(point.lng - lastPoint.lng, 2)
      );
      
      if (distance > tolerance) {
        simplified.push(point);
        lastPoint = point;
      }
    }
    
    // Always include the last point
    simplified.push(path[path.length - 1]);
    return simplified;
  };

  // Load Google Maps script
  useEffect(() => {
    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      // Wait for it to load and window.google to be available
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('✅ Google Maps API is available (script was already loading)');
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          clearInterval(checkLoaded);
          console.error('❌ Google Maps API did not become available');
        }
      }, 10000);
      
      return () => clearInterval(checkLoaded);
    }

    // Load the script with Places library
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in .env file');
      setIsLoaded(false);
      return;
    }
    
    const script = document.createElement('script');
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places&loading=async`;
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps script loaded, waiting for API to be available...');
      // Wait for window.google to actually be available (can take a moment after script loads)
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('✅ Google Maps API is now available');
          clearInterval(checkGoogle);
          setIsLoaded(true);
        }
      }, 50);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          clearInterval(checkGoogle);
          console.error('❌ Google Maps API did not become available after script load');
          console.error('This might indicate an API key issue or API not enabled');
          setIsLoaded(false);
        }
      }, 10000);
    };
    script.onerror = (error) => {
      console.error('❌ Failed to load Google Maps API script');
      console.error('Error details:', error);
      console.error('Script URL:', scriptUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
      console.error('Please check:');
      console.error('1. API key is correct in .env file');
      console.error('2. API key has Maps JavaScript API enabled');
      console.error('3. API key restrictions allow your domain');
      console.error('4. You have internet connectivity');
      alert('Failed to load Google Maps. Please check the browser console for details.');
      setIsLoaded(false);
    };
    console.log('📡 Loading Google Maps script...');
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        // Don't remove it as other components might need it
      }
    };
  }, []);

  // Check if container is ready (has dimensions)
  useEffect(() => {
    if (!mapRef.current || containerReady) return;
    
    const checkContainer = () => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      console.log('📐 Container dimensions:', { width: rect.width, height: rect.height });
      if (rect.width > 0 && rect.height > 0) {
        console.log('✅ Container is ready with dimensions');
        setContainerReady(true);
      } else {
        console.warn('⚠️ Container has zero dimensions');
      }
    };
    
    // Check immediately
    checkContainer();
    
    // If not ready, check after next frame
    if (!containerReady) {
      requestAnimationFrame(checkContainer);
      // Also check after a delay
      const timeoutId = setTimeout(checkContainer, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [containerReady]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current || !containerReady) {
      if (!isLoaded) console.log('⏳ Waiting for Google Maps script to load...');
      if (!mapRef.current) console.log('⏳ Waiting for map container ref...');
      if (mapInstanceRef.current) console.log('⏳ Map already initialized');
      if (!containerReady) console.log('⏳ Waiting for container to have dimensions...');
      return;
    }
    
    // Safety check: ensure Google Maps API is actually available
    // If not available yet, wait a bit and retry
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.warn('⚠️ Google Maps API not available yet, waiting...');
      console.log('window.google:', window.google);
      
      // Wait for window.google to become available
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(checkGoogle);
          console.log('✅ Google Maps API is now available, initializing map...');
          // Trigger re-initialization by forcing a re-render
          // The useEffect will run again and window.google will be available
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkGoogle);
        if (!window.google || !window.google.maps) {
          console.error('❌ Google Maps API is still not available after waiting');
          console.error('This usually means:');
          console.error('1. The API key is invalid or restricted');
          console.error('2. Maps JavaScript API is not enabled for this key');
          console.error('3. There is a network issue');
        }
      }, 5000);
      
      return;
    }
    
    console.log('🗺️ Initializing Google Map...');

    try {
    // Ultra Dark Mode style configuration
    const darkModeStyles = [
      { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
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
        stylers: [{ color: '#1a1a1a' }, { visibility: 'on' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#a8a8a8' }, { visibility: 'on' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'on' }, { saturation: 0 }]
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
      // Keep My Location button but we'll style it in dark mode
      disableDefaultUI: false,      // Allow default UI so we can style it
      // Performance optimizations
      maxZoom: 20,                  // Limit max zoom for performance
      minZoom: 10,                  // Limit min zoom
    });

    // Track map interactions for performance optimization
    const handleInteractionStart = () => {
      isInteractingRef.current = true;
      // Simplify polylines during interaction by enabling optimization
      if (fastestPolylineRef.current) {
        fastestPolylineRef.current.setOptions({ optimized: true });
        // Get current path and simplify if it's long
        const currentPath = fastestPolylineRef.current.getPath();
        if (currentPath && currentPath.getLength() > 100) {
          const pathArray = Array.from(currentPath.getArray());
          const simplified = simplifyPath(pathArray.map(p => ({ lat: p.lat(), lng: p.lng() })), 0.0001);
          fastestPolylineRef.current.setPath(simplified);
        }
      }
      if (safestPolylineRef.current) {
        safestPolylineRef.current.setOptions({ optimized: true });
        // Get current path and simplify if it's long
        const currentPath = safestPolylineRef.current.getPath();
        if (currentPath && currentPath.getLength() > 100) {
          const pathArray = Array.from(currentPath.getArray());
          const simplified = simplifyPath(pathArray.map(p => ({ lat: p.lat(), lng: p.lng() })), 0.0001);
          safestPolylineRef.current.setPath(simplified);
        }
      }
    };

    const handleInteractionEnd = () => {
      // Clear any existing timeout
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      // Delay restoring full detail to avoid lag
      interactionTimeoutRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        // Restore full polyline detail after interaction
        // The useEffect hooks will handle restoring the full paths
        if (fastestPolylineRef.current) {
          fastestPolylineRef.current.setOptions({ optimized: true });
        }
        if (safestPolylineRef.current) {
          safestPolylineRef.current.setOptions({ optimized: true });
        }
      }, 300);
    };

    // Listen for map interactions
    map.addListener('dragstart', handleInteractionStart);
    map.addListener('zoom_changed', handleInteractionStart);
    map.addListener('dragend', handleInteractionEnd);
    map.addListener('idle', handleInteractionEnd);

    // Style My Location button to dark mode
    setTimeout(() => {
      const myLocationButtons = document.querySelectorAll(
        'button[title*="My Location"], ' +
        'button[title*="Your location"], ' +
        'button[aria-label*="My Location"], ' +
        'button[aria-label*="Your location"], ' +
        'button[data-value="My Location"], ' +
        '.gm-control-active[title*="location" i]'
      );
      myLocationButtons.forEach(btn => {
        // Apply dark mode styling
        btn.style.backgroundColor = 'rgba(28, 28, 30, 0.9)';
        btn.style.border = '0.5px solid rgba(255, 255, 255, 0.1)';
        btn.style.borderRadius = '12px';
        btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        btn.style.backdropFilter = 'blur(20px)';
        btn.style.webkitBackdropFilter = 'blur(20px)';
        
        // Style the icon inside
        const icon = btn.querySelector('img, svg, div[style*="background"]');
        if (icon) {
          icon.style.filter = 'invert(1) brightness(0.9)';
        }
        
        // Hover state
        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = 'rgba(44, 44, 46, 0.95)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = 'rgba(28, 28, 30, 0.9)';
        });
      });
    }, 500);

    mapInstanceRef.current = map;
    console.log('✅ Google Map initialized successfully');
    
    // Trigger resize to ensure map renders correctly after initialization
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (window.google && window.google.maps && map) {
        window.google.maps.event.trigger(map, 'resize');
        console.log('🔄 Triggered map resize (requestAnimationFrame)');
      }
    });
    
    // Also trigger resize after a short delay to handle any async layout
    setTimeout(() => {
      if (window.google && window.google.maps && map) {
        window.google.maps.event.trigger(map, 'resize');
        console.log('🔄 Triggered map resize (setTimeout)');
      }
    }, 200);
    
    } catch (error) {
      console.error('❌ Error initializing Google Map:', error);
      console.error('Error stack:', error.stack);
      setIsLoaded(false);
    }
  }, [isLoaded, containerReady]);
  
  // Handle window resize to update map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const handleResize = () => {
      if (window.google && window.google.maps && mapInstanceRef.current) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapInstanceRef.current]);

  // Animate polyline drawing
  const animatePolyline = (polylineRef, fullPath, duration = 2000) => {
    return new Promise((resolve) => {
      if (!polylineRef.current || !fullPath || fullPath.length === 0) {
        resolve();
        return;
      }

      // Cancel any existing animation
      if (polylineRef.current.animationFrame) {
        cancelAnimationFrame(polylineRef.current.animationFrame);
      }

      const startTime = Date.now();
      const totalPoints = fullPath.length;
      let currentPoints = 1;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        currentPoints = Math.max(1, Math.floor(easedProgress * totalPoints));
        const animatedPath = fullPath.slice(0, currentPoints);
        
        polylineRef.current.setPath(animatedPath);

        if (progress < 1) {
          polylineRef.current.animationFrame = requestAnimationFrame(animate);
        } else {
          // Ensure full path is set at the end
          polylineRef.current.setPath(fullPath);
          resolve();
        }
      };

      // Start with empty path
      polylineRef.current.setPath([]);
      polylineRef.current.animationFrame = requestAnimationFrame(animate);
    });
  };

  // Update fastest route polyline
  useEffect(() => {
    if (!window.google || !window.google.maps) return;
    if (!mapInstanceRef.current || !fastestRoute || fastestRoute.length === 0) {
      // Cancel animation if route is cleared
      if (fastestAnimationRef.current) {
        cancelAnimationFrame(fastestAnimationRef.current);
        fastestAnimationRef.current = null;
      }
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

    // Simplify path during interaction for better performance
    const simplifiedPath = isInteractingRef.current && path.length > 100
      ? simplifyPath(path, 0.0001) // Simplify when interacting
      : path;

    // Create or update visible polyline
    if (!fastestPolylineRef.current) {
      fastestPolylineRef.current = new window.google.maps.Polyline({
        path: [], // Start with empty path for animation
        geodesic: true,
        strokeColor: '#0572f7', // Apple Blue
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        map: mapInstanceRef.current,
        clickable: false, // Disable clicks on visible line
        icons: [], // No arrows
        optimized: true, // Optimize rendering
      });
    } else {
      fastestPolylineRef.current.setOptions({
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3,
        clickable: false,
        icons: [],
        optimized: !isInteractingRef.current, // Optimize during interaction
      });
      // Update path with simplified version if interacting
      if (isInteractingRef.current && path.length > 100) {
        fastestPolylineRef.current.setPath(simplifiedPath);
      }
    }

    // Create or update invisible clickable polyline with larger hitbox
    if (!fastestClickPolylineRef.current) {
      fastestClickPolylineRef.current = new window.google.maps.Polyline({
        path: path, // Full path for click detection
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
    } else {
      fastestClickPolylineRef.current.setPath(path);
    }

    // Animate the visible polyline (only if not currently interacting)
    if (!isInteractingRef.current) {
      animatePolyline(fastestPolylineRef, path, 2000).then(() => {
        fastestAnimationRef.current = null;
      });
    } else {
      // If interacting, just set the path directly without animation
      fastestPolylineRef.current.setPath(simplifiedPath);
    }
  }, [fastestRoute, mapInstanceRef.current, selectedRoute]);

  // Update safest route polyline
  useEffect(() => {
    if (!window.google || !window.google.maps) return;
    if (!mapInstanceRef.current || !safestRoute || safestRoute.length === 0) {
      // Cancel animation if route is cleared
      if (safestAnimationRef.current) {
        cancelAnimationFrame(safestAnimationRef.current);
        safestAnimationRef.current = null;
      }
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

    // Simplify path during interaction for better performance
    const simplifiedPath = isInteractingRef.current && path.length > 100
      ? simplifyPath(path, 0.0001) // Simplify when interacting
      : path;

    // Create or update visible polyline
    if (!safestPolylineRef.current) {
      safestPolylineRef.current = new window.google.maps.Polyline({
        path: [], // Start with empty path for animation
        geodesic: true,
        strokeColor: '#00FF7F', // Spring Green
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3, // Thinner lines
        map: mapInstanceRef.current,
        clickable: false, // Disable clicks on visible line
        icons: [], // No arrows
        optimized: true, // Optimize rendering
      });
    } else {
      safestPolylineRef.current.setOptions({
        strokeOpacity: opacity,
        strokeWeight: isSelected ? 4 : 3,
        clickable: false,
        icons: [],
        optimized: !isInteractingRef.current, // Optimize during interaction
      });
      // Update path with simplified version if interacting
      if (isInteractingRef.current) {
        safestPolylineRef.current.setPath(simplifiedPath);
      }
    }

    // Create or update invisible clickable polyline with larger hitbox
    if (!safestClickPolylineRef.current) {
      safestClickPolylineRef.current = new window.google.maps.Polyline({
        path: path, // Full path for click detection
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
    } else {
      safestClickPolylineRef.current.setPath(path);
    }

    // Animate the visible polyline (only if not currently interacting)
    if (!isInteractingRef.current) {
      animatePolyline(safestPolylineRef, path, 2000).then(() => {
        safestAnimationRef.current = null;
      });
    } else {
      // If interacting, just set the path directly without animation
      safestPolylineRef.current.setPath(simplifiedPath);
    }
  }, [safestRoute, mapInstanceRef.current, selectedRoute]);

  // Update start marker
  useEffect(() => {
    if (!window.google || !window.google.maps) return;
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
        // Note: google.maps.Marker is deprecated in favor of AdvancedMarkerElement
        // but still works. Consider migrating in the future.
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
          optimized: true // Optimize marker rendering for better performance
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
    if (!window.google || !window.google.maps) return;
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
        
        // Note: google.maps.Marker is deprecated in favor of AdvancedMarkerElement
        // but still works. Consider migrating in the future.
        endMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          title: endLabel,
          icon: createCheckerFlagIcon(),
          zIndex: 1000,
          optimized: true // Optimize marker rendering for better performance
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
  // Only fit bounds when both locations are set AND routes exist
  useEffect(() => {
    if (!window.google || !window.google.maps) return;
    if (!mapInstanceRef.current) return;

    // Only fit bounds if both start and end are set AND we have routes
    const hasRoutes = (fastestRoute && fastestRoute.length > 0) || (safestRoute && safestRoute.length > 0);
    const hasBothLocations = start && end;

    // Don't fit bounds if we only have one location (let user keep current zoom)
    if (!hasBothLocations || !hasRoutes) {
      return;
    }

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

  // Show error message if API key is missing
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div 
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          color: '#8e8e93',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          padding: '20px',
          textAlign: 'center'
        }} 
      >
        <div>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Google Maps API key is missing</p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>Please set VITE_GOOGLE_MAPS_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '100%', 
        width: '100%',
        minHeight: '100%',
        position: 'relative'
      }} 
    />
  );
}

export default GoogleMap;


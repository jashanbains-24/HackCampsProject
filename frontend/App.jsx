import React, { useState, useEffect } from 'react';
import GoogleMap from './components/GoogleMap';
import LocationSearch from './components/LocationSearch';

// Get API base URL from environment variable, fallback to default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Known areas with specific safety characteristics
const AREA_DESCRIPTIONS = {
  eastHastings: {
    bounds: { 
      latMin: 49.270, latMax: 49.290, 
      lngMin: -123.130, lngMax: -123.100 
    },
    warnings: [
      '⚠️ Passes through East Hastings - high crime area, poor lighting, avoid at night'
    ],
    safeFeatures: []
  },
  downtown: {
    bounds: { 
      latMin: 49.275, latMax: 49.285, 
      lngMin: -123.130, lngMax: -123.115 
    },
    warnings: [],
    safeFeatures: [
      '✅ Safe route through downtown core with excellent infrastructure and lighting',
      '✅ Well-lit downtown area with active street life',
      '✅ Good pedestrian infrastructure and safe havens nearby'
    ]
  },
  yaletown: {
    bounds: { 
      latMin: 49.270, latMax: 49.280, 
      lngMin: -123.135, lngMax: -123.120 
    },
    warnings: [],
    safeFeatures: [
      '✅ Excellent route: Well-lit path through Yaletown with parks and safe havens nearby',
      '✅ Residential Yaletown area with good sidewalks and lighting',
      '✅ Route through quiet neighborhoods with low crime'
    ]
  },
  gastown: {
    bounds: { 
      latMin: 49.280, latMax: 49.290, 
      lngMin: -123.125, lngMax: -123.115 
    },
    warnings: [],
    safeFeatures: [
      'Well-lit historic Gastown area with active street life and nearby fire hall',
      '✅ Safe area with good lighting and pedestrian infrastructure'
    ]
  }
};

// Function to check if coordinates are within bounds
function isInBounds(coord, bounds) {
  return coord.lat >= bounds.latMin && coord.lat <= bounds.latMax &&
         coord.lng >= bounds.lngMin && coord.lng <= bounds.lngMax;
}

// Function to analyze route and generate specific descriptions
function analyzeRoute(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) {
    return [];
  }

  const descriptions = [];
  const areasPassed = new Set();
  
  // Check each coordinate in the route
  routeCoords.forEach(coord => {
    for (const [areaName, areaData] of Object.entries(AREA_DESCRIPTIONS)) {
      if (isInBounds(coord, areaData.bounds)) {
        areasPassed.add(areaName);
      }
    }
  });

  // Generate descriptions based on areas passed through
  if (areasPassed.has('eastHastings')) {
    descriptions.push(...AREA_DESCRIPTIONS.eastHastings.warnings);
  }
  
  if (areasPassed.has('downtown')) {
    descriptions.push(AREA_DESCRIPTIONS.downtown.safeFeatures[0]);
  }
  
  if (areasPassed.has('yaletown')) {
    descriptions.push(AREA_DESCRIPTIONS.yaletown.safeFeatures[0]);
  }
  
  if (areasPassed.has('gastown')) {
    descriptions.push(AREA_DESCRIPTIONS.gastown.safeFeatures[0]);
  }

  // If no specific areas detected, check for general characteristics
  if (descriptions.length === 0) {
    // Analyze route length and characteristics
    const routeLength = routeCoords.length;
    if (routeLength > 200) {
      descriptions.push('Longer route through multiple neighborhoods');
    } else {
      descriptions.push('Direct route with moderate safety considerations');
    }
  }

  return descriptions;
}

function App() {
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [departureTimeEnabled, setDepartureTimeEnabled] = useState(false);
  const [departureTime, setDepartureTime] = useState(() => {
    // Default to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [fastestRoute, setFastestRoute] = useState([]);
  const [safestRoute, setSafestRoute] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendReady, setBackendReady] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('safest'); // Default to safest route
  const [expandedRoute, setExpandedRoute] = useState(null); // Track which route card is expanded
  const [fastestRouteDescriptions, setFastestRouteDescriptions] = useState([]);
  const [safestRouteDescriptions, setSafestRouteDescriptions] = useState([]);

  // Check backend status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusRes = await fetch(`${API_BASE_URL}/status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (!status.loaded && status.loading) {
            setError('Backend is loading street data... Please wait.');
            // Poll until ready
            const pollInterval = setInterval(async () => {
              const pollRes = await fetch(`${API_BASE_URL}/status`);
              if (pollRes.ok) {
                const pollStatus = await pollRes.json();
                if (pollStatus.loaded) {
                  clearInterval(pollInterval);
                  setError(null);
                  setBackendReady(true);
                } else if (pollStatus.error) {
                  clearInterval(pollInterval);
                  setError(`Backend error: ${pollStatus.error}`);
                }
              }
            }, 1000);
            return () => clearInterval(pollInterval);
          } else if (status.loaded) {
            setError(null);
            setBackendReady(true);
          } else if (status.error) {
            setError(`Backend error: ${status.error}`);
          }
        } else {
          setError('Cannot connect to backend. Make sure the server is running on port 3001.');
        }
      } catch (err) {
        console.error('Status check failed:', err);
        setError('Cannot connect to backend. Make sure the server is running on port 3001.');
      }
    };
    
    checkStatus();
  }, []);

  const fetchRoutes = async () => {
    if (!startLocation || !endLocation) {
      setError('Please select both start and end locations.');
      return;
    }
    
    // Validate coordinates
    if (typeof startLocation.lat !== 'number' || typeof startLocation.lng !== 'number' ||
        typeof endLocation.lat !== 'number' || typeof endLocation.lng !== 'number') {
      setError('Invalid coordinates. Please select valid locations.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setShowResults(false);
    
    try {
      // Format coordinates as lat,lng (URL encode to handle special characters)
      const startStr = encodeURIComponent(`${startLocation.lat},${startLocation.lng}`);
      const endStr = encodeURIComponent(`${endLocation.lat},${endLocation.lng}`);
      
      // Convert departure time to ISO timestamp if enabled
      let url = `${API_BASE_URL}/route?start=${startStr}&end=${endStr}`;
      if (departureTimeEnabled && departureTime) {
        const departureTimestamp = new Date(departureTime).toISOString();
        url += `&departure=${encodeURIComponent(departureTimestamp)}`;
      }
      console.log('Fetching route from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch routes';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Route data received:', {
        fastestPoints: data.fastestRoute?.length || 0,
        safestPoints: data.safestRoute?.length || 0,
        start: data.start,
        end: data.end
      });
      
      if (!data.fastestRoute || !data.safestRoute) {
        throw new Error('Invalid route data received from server');
      }
      
      setFastestRoute(data.fastestRoute || []);
      setSafestRoute(data.safestRoute || []);
      setStartCoords(data.start);
      setEndCoords(data.end);
      setSelectedRoute('safest'); // Reset to safest route by default
      setShowResults(true);
      
      // Analyze routes and store descriptions
      const fastestDescriptions = analyzeRoute(data.fastestRoute);
      const safestDescriptions = analyzeRoute(data.safestRoute);
      
      // Store descriptions in state (we'll add state for this)
      setFastestRouteDescriptions(fastestDescriptions);
      setSafestRouteDescriptions(safestDescriptions);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError(err.message || 'Failed to fetch routes. Please check that the backend is running.');
      setFastestRoute([]);
      setSafestRoute([]);
      setStartCoords(null);
      setEndCoords(null);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRoutes();
  };

  // Auto-refetch routes when departure time changes (if locations are set and toggle is enabled)
  useEffect(() => {
    // Only auto-refetch if:
    // 1. Both locations are set
    // 2. Departure time toggle is enabled
    // 3. We have routes already (to avoid fetching on initial mount)
    if (startLocation && endLocation && departureTimeEnabled && (fastestRoute.length > 0 || safestRoute.length > 0)) {
      fetchRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departureTime, departureTimeEnabled]); // Refetch when departure time or toggle changes

  const canSearch = startLocation && endLocation && backendReady && !loading;

  return (
    <div className="app-container">
      {/* Full-screen Map Background - Edge to Edge */}
      <div className="map-container">
        <GoogleMap
          fastestRoute={fastestRoute}
          safestRoute={safestRoute}
          start={startCoords}
          end={endCoords}
          startLabel={startLocation?.address || 'Start'}
          endLabel={endLocation?.address || 'End'}
          selectedRoute={selectedRoute}
          onRouteSelect={setSelectedRoute}
        />
      </div>

      {/* Frosted Glass Floating Panel */}
      <div className="control-panel">
        <div className="panel-header">
          <h1 className="app-title">SafeWalk</h1>
          <p className="app-subtitle">Vancouver Route Planner</p>
        </div>

        {error && !backendReady && (
          <div className="alert alert-error">
            <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="route-form">
          <div className="form-group">
            <LocationSearch
              label="Start Location"
              placeholder="Search for start location..."
              value={startLocation}
              onChange={(location) => {
                setStartLocation(location);
                if (location) {
                  setStartCoords({ lat: location.lat, lng: location.lng });
                } else {
                  setStartCoords(null);
                }
              }}
              disabled={loading || !backendReady}
            />
          </div>

          <div className="form-group">
            <LocationSearch
              label="End Location"
              placeholder="Search for end location..."
              value={endLocation}
              onChange={(location) => {
                setEndLocation(location);
                if (location) {
                  setEndCoords({ lat: location.lat, lng: location.lng });
                } else {
                  setEndCoords(null);
                }
              }}
              disabled={loading || !backendReady}
            />
          </div>

          <div className="form-group">
            <div className="toggle-group">
              <label htmlFor="departure-toggle" className="toggle-label">
                <span className="toggle-label-text">Departure Time</span>
                <span className="toggle-label-subtitle">Specify when you'll be traveling</span>
              </label>
              <label className="apple-toggle">
                <input
                  id="departure-toggle"
                  type="checkbox"
                  checked={departureTimeEnabled}
                  onChange={(e) => setDepartureTimeEnabled(e.target.checked)}
                  disabled={loading || !backendReady}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {departureTimeEnabled && (
              <div className="datetime-wrapper">
                <input
                  id="departure-time"
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  disabled={loading || !backendReady}
                  className="form-input datetime-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSearch}
            className={`find-route-btn ${!canSearch ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                  <path className="spinner-path" fill="none" stroke="currentColor" strokeWidth="4" d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                </svg>
                Finding Routes...
              </>
            ) : (
              <>
                <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Find Route
              </>
            )}
          </button>
        </form>

        {/* Route Results - Apple Cards */}
        {showResults && (fastestRoute.length > 0 || safestRoute.length > 0) && !loading && (
          <div className="route-results">
            <h2 className="results-title">Route Options</h2>
            
            {fastestRoute.length > 0 && (
              <div 
                className={`route-card route-fastest ${selectedRoute === 'fastest' ? 'selected' : ''} ${expandedRoute === 'fastest' ? 'expanded' : ''}`}
                onClick={(e) => {
                  // Only toggle expansion if clicking on the card itself, not the expand button
                  if (e.target.closest('.route-expand-btn')) {
                    setExpandedRoute(expandedRoute === 'fastest' ? null : 'fastest');
                  } else {
                    setSelectedRoute('fastest');
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="route-header">
                  <div className="route-icon route-icon-fastest">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="route-header-content">
                    <div>
                      <h3 className="route-name">Fastest Route</h3>
                      <p className="route-points">{fastestRoute.length} waypoints</p>
                    </div>
                  </div>
                  <div className={`route-selected-indicator ${selectedRoute === 'fastest' ? 'visible' : ''}`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <button 
                    className="route-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRoute(expandedRoute === 'fastest' ? null : 'fastest');
                    }}
                    aria-label="Toggle route details"
                  >
                    <svg 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      className={`expand-icon ${expandedRoute === 'fastest' ? 'expanded' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className={`route-details ${expandedRoute === 'fastest' ? 'expanded' : ''}`}>
                  <div className="route-details-content">
                    <h4 className="route-details-title">Route Considerations</h4>
                    <ul className="route-details-list">
                      {fastestRouteDescriptions.length > 0 ? (
                        fastestRouteDescriptions.map((desc, idx) => (
                          <li key={idx}>{desc}</li>
                        ))
                      ) : (
                        <>
                          <li>Shorter distance for quicker travel</li>
                          <li>May include busier streets with higher traffic</li>
                          <li>Potentially fewer safety features (lighting, sidewalks)</li>
                          <li>May cross high-traffic intersections</li>
                          <li>Less optimized for pedestrian safety infrastructure</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {safestRoute.length > 0 && (
              <div 
                className={`route-card route-safest ${selectedRoute === 'safest' ? 'selected' : ''} ${expandedRoute === 'safest' ? 'expanded' : ''}`}
                onClick={(e) => {
                  // Only toggle expansion if clicking on the card itself, not the expand button
                  if (e.target.closest('.route-expand-btn')) {
                    setExpandedRoute(expandedRoute === 'safest' ? null : 'safest');
                  } else {
                    setSelectedRoute('safest');
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="route-header">
                  <div className="route-icon route-icon-safest">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="route-header-content">
                    <div>
                      <h3 className="route-name">Safest Route</h3>
                      <p className="route-points">{safestRoute.length} waypoints</p>
                    </div>
                  </div>
                  <div className={`route-selected-indicator ${selectedRoute === 'safest' ? 'visible' : ''}`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <button 
                    className="route-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRoute(expandedRoute === 'safest' ? null : 'safest');
                    }}
                    aria-label="Toggle route details"
                  >
                    <svg 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      className={`expand-icon ${expandedRoute === 'safest' ? 'expanded' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className={`route-details ${expandedRoute === 'safest' ? 'expanded' : ''}`}>
                  <div className="route-details-content">
                    <h4 className="route-details-title">Why This Route is Safer</h4>
                    <ul className="route-details-list">
                      {safestRouteDescriptions.length > 0 ? (
                        safestRouteDescriptions.map((desc, idx) => (
                          <li key={idx}>{desc}</li>
                        ))
                      ) : (
                        <>
                          <li>Optimized for pedestrian safety infrastructure</li>
                          <li>Better street lighting coverage</li>
                          <li>Lower crime risk areas</li>
                          <li>Well-maintained sidewalks and pathways</li>
                          <li>Avoids high-traffic intersections where possible</li>
                          <li>Prioritizes dedicated bike lanes and pedestrian zones</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && backendReady && (
          <div className="alert alert-error">
            <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

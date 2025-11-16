import React, { useState, useEffect } from 'react';
import GoogleMap from './components/GoogleMap';
import LocationSearch from './components/LocationSearch';

// Get API base URL from environment variable, fallback to default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function App() {
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [hour, setHour] = useState(12);
  const [fastestRoute, setFastestRoute] = useState([]);
  const [safestRoute, setSafestRoute] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
                } else if (pollStatus.error) {
                  clearInterval(pollInterval);
                  setError(`Backend error: ${pollStatus.error}`);
                }
              }
            }, 1000);
            return () => clearInterval(pollInterval);
          } else if (status.loaded) {
            setError(null);
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

  // Fetch routes when start/end/hour changes
  useEffect(() => {
    if (startLocation && endLocation && 
        startLocation.lat && startLocation.lng && 
        endLocation.lat && endLocation.lng) {
      fetchRoutes();
    } else {
      setFastestRoute([]);
      setSafestRoute([]);
      setStartCoords(null);
      setEndCoords(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLocation, endLocation, hour]);

  const fetchRoutes = async () => {
    if (!startLocation || !endLocation) return;
    
    // Validate coordinates
    if (typeof startLocation.lat !== 'number' || typeof startLocation.lng !== 'number' ||
        typeof endLocation.lat !== 'number' || typeof endLocation.lng !== 'number') {
      setError('Invalid coordinates. Please select valid locations.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Format coordinates as lat,lng (URL encode to handle special characters)
      const startStr = encodeURIComponent(`${startLocation.lat},${startLocation.lng}`);
      const endStr = encodeURIComponent(`${endLocation.lat},${endLocation.lng}`);
      
      const url = `${API_BASE_URL}/route?start=${startStr}&end=${endStr}&hour=${hour}`;
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
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError(err.message || 'Failed to fetch routes. Please check that the backend is running.');
      setFastestRoute([]);
      setSafestRoute([]);
      setStartCoords(null);
      setEndCoords(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar (Controls) */}
      <div className="flex-none w-1/3 bg-blue-900 text-white p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6">SafeWalk Vancouver</h1>
        
        {/* Route Inputs */}
        <div className="space-y-4 mb-6">
          <LocationSearch
            label="Start Location:"
            placeholder="Search for start location..."
            value={startLocation}
            onChange={(location) => {
              setStartLocation(location);
              if (location) {
                setStartCoords({ lat: location.lat, lng: location.lng });
              }
            }}
            disabled={loading}
          />
          <div className="mt-4">
            <LocationSearch
              label="End Location:"
              placeholder="Search for end location..."
              value={endLocation}
              onChange={(location) => {
                setEndLocation(location);
                if (location) {
                  setEndCoords({ lat: location.lat, lng: location.lng });
                }
              }}
              disabled={loading}
            />
          </div>
          {startLocation && (
            <p className="text-xs text-gray-400 mt-1">
              Start: {startLocation.address || `${startLocation.lat?.toFixed(4)}, ${startLocation.lng?.toFixed(4)}`}
            </p>
          )}
          {endLocation && (
            <p className="text-xs text-gray-400 mt-1">
              End: {endLocation.address || `${endLocation.lat?.toFixed(4)}, ${endLocation.lng?.toFixed(4)}`}
            </p>
          )}
        </div>

        {/* Time Slider */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            Time of Day: <span className="text-blue-300">{formatTime(hour)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="23"
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Route Details Panel */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Route Details</h2>
          <div className="bg-blue-800 rounded-lg p-4 min-h-[200px]">
            {loading && <p className="text-gray-300">Loading routes...</p>}
            {error && <p className="text-red-400">{error}</p>}
            {!loading && !error && (fastestRoute.length > 0 || safestRoute.length > 0) && (
              <div>
                {safestRoute.length > 0 && (
                  <div className="p-4 bg-green-800 rounded-lg mb-4">
                    <h3 className="text-lg font-bold text-green-400 mb-2">🛡️ Safest Route</h3>
                    <p className="text-sm text-gray-300">
                      Points: <span className="font-semibold">{safestRoute.length}</span>
                    </p>
                    {startCoords && endCoords && (
                      <p className="text-xs text-gray-400 mt-1">
                        From: {startCoords.lat?.toFixed(4)}, {startCoords.lng?.toFixed(4)}
                      </p>
                    )}
                  </div>
                )}
                {fastestRoute.length > 0 && (
                  <div className="p-4 bg-blue-800 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-300 mb-2">⚡ Fastest Route</h3>
                    <p className="text-sm text-gray-300">
                      Points: <span className="font-semibold">{fastestRoute.length}</span>
                    </p>
                    {startCoords && endCoords && (
                      <p className="text-xs text-gray-400 mt-1">
                        To: {endCoords.lat?.toFixed(4)}, {endCoords.lng?.toFixed(4)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {!loading && !error && fastestRoute.length === 0 && safestRoute.length === 0 && (
              <p className="text-gray-300">
                {!startLocation || !endLocation 
                  ? "Search for start and end locations to see routes." 
                  : "Calculating routes..."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area (Map) */}
      <div className="flex-grow bg-gray-200 relative overflow-hidden" style={{ minHeight: 0 }}>
        <GoogleMap
          fastestRoute={fastestRoute}
          safestRoute={safestRoute}
          start={startCoords}
          end={endCoords}
          startLabel={startLocation?.address || 'Start'}
          endLabel={endLocation?.address || 'End'}
        />
      </div>
    </div>
  );
}

export default App;


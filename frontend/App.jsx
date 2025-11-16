import React, { useState, useEffect } from 'react';
import GoogleMap from './components/GoogleMap';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [startNode, setStartNode] = useState('A');
  const [endNode, setEndNode] = useState('F');
  const [hour, setHour] = useState(12);
  const [fastestRoute, setFastestRoute] = useState([]);
  const [safestRoute, setSafestRoute] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available nodes on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/nodes`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Loaded nodes:', data);
        setNodes(data);
        // Set default values if nodes are loaded and no defaults set
        if (data.length > 0) {
          if (!startNode || startNode === '') {
            setStartNode(data[0].id);
          }
          if (data.length > 1 && (!endNode || endNode === '')) {
            setEndNode(data[data.length - 1].id);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching nodes:', err);
        setError(`Failed to load locations: ${err.message}`);
      });
  }, []);

  // Fetch routes when start/end/hour changes
  useEffect(() => {
    if (startNode && endNode && startNode !== endNode) {
      fetchRoutes();
    } else {
      setFastestRoute([]);
      setSafestRoute([]);
      setStartCoords(null);
      setEndCoords(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNode, endNode, hour]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/route?start=${startNode}&end=${endNode}&hour=${hour}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch routes');
      }
      
      const data = await response.json();
      setFastestRoute(data.fastestRoute || []);
      setSafestRoute(data.safestRoute || []);
      setStartCoords(data.start);
      setEndCoords(data.end);
    } catch (err) {
      setError(err.message);
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
          <div>
            <label htmlFor="start-node" className="block text-sm font-medium mb-2">
              Start Location:
            </label>
            <select
              id="start-node"
              value={startNode}
              onChange={(e) => setStartNode(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black px-3 py-2"
              disabled={loading || nodes.length === 0}
            >
              <option value="">Select start location...</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name || `(${node.coordinates?.[0]?.toFixed(4)}, ${node.coordinates?.[1]?.toFixed(4)})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="end-node" className="block text-sm font-medium mb-2 mt-4">
              End Location:
            </label>
            <select
              id="end-node"
              value={endNode}
              onChange={(e) => setEndNode(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black px-3 py-2"
              disabled={loading || nodes.length === 0}
            >
              <option value="">Select end location...</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name || `(${node.coordinates?.[0]?.toFixed(4)}, ${node.coordinates?.[1]?.toFixed(4)})`}
                </option>
              ))}
            </select>
          </div>
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
              <p className="text-gray-300">Select start and end locations to see routes.</p>
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
        />
      </div>
    </div>
  );
}

export default App;


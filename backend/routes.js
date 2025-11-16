const express = require('express');
const router = express.Router();
const {
  loadStreetData,
  buildGraph,
  findClosestNode,
  findFastestPath,
  findSafestPath,
  pathToCoordinates,
  testNodes,
  calculateDistance
} = require('./dataProcessor');

// Cache loaded data
let streetData = null;
let graphData = null;
let graph = null;
let nodeMap = null;
let isLoading = false;
let loadPromise = null;
let loadError = null;

// Initialize data - can be called multiple times safely
function initializeData() {
  // If already loaded, return immediately
  if (streetData && graph) {
    return Promise.resolve();
  }
  
  // If currently loading, return the existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  // If there was an error, throw it
  if (loadError) {
    return Promise.reject(loadError);
  }
  
  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    try {
      console.log('Loading street data from CSV files...');
      const startTime = Date.now();
      
      streetData = loadStreetData();
      console.log(`Loaded ${streetData.length} street segments in ${Date.now() - startTime}ms`);
      
      const buildStart = Date.now();
      const built = buildGraph(streetData);
      graph = built.graph;
      nodeMap = built.nodeMap;
      console.log(`Built graph with ${Object.keys(graph).length} nodes in ${Date.now() - buildStart}ms`);
      
      isLoading = false;
      resolve();
    } catch (error) {
      console.error('Error loading data:', error);
      isLoading = false;
      loadError = error;
      reject(error);
    }
  });
  
  return loadPromise;
}

// Pre-load data when module is loaded (non-blocking)
setImmediate(() => {
  initializeData().catch(err => {
    console.error('Background data loading failed:', err);
  });
});

// GET /status endpoint to check loading status
router.get('/status', (req, res) => {
  res.json({
    loaded: !!(streetData && graph),
    loading: isLoading,
    segments: streetData ? streetData.length : 0,
    nodes: graph ? Object.keys(graph).length : 0,
    error: loadError ? loadError.message : null
  });
});

// GET /route endpoint
router.get('/route', async (req, res) => {
  try {
    // Wait for data to be loaded
    await initializeData();
    
    const { start, end, hour } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ 
        error: 'Missing required parameters: start and end' 
      });
    }

    const currentHour = hour || 12;
    
    // Handle test node IDs (A-F) or coordinates
    let startCoord, endCoord;
    const startUpper = start.toUpperCase().trim();
    const endUpper = end.toUpperCase().trim();
    
    if (testNodes[startUpper]) {
      startCoord = testNodes[startUpper];
    } else {
      // Try to parse as coordinates (handle URL encoding)
      const decodedStart = decodeURIComponent(start);
      const parts = decodedStart.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (isNaN(lat) || isNaN(lng)) {
          return res.status(400).json({ 
            error: `Invalid start coordinates: ${decodedStart}. Expected format: lat,lng` 
          });
        }
        startCoord = [lat, lng];
      } else {
        return res.status(400).json({ 
          error: `Invalid start: ${decodedStart}. Use node ID (A-F) or lat,lng coordinates` 
        });
      }
    }
    
    if (testNodes[endUpper]) {
      endCoord = testNodes[endUpper];
    } else {
      // Try to parse as coordinates (handle URL encoding)
      const decodedEnd = decodeURIComponent(end);
      const parts = decodedEnd.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (isNaN(lat) || isNaN(lng)) {
          return res.status(400).json({ 
            error: `Invalid end coordinates: ${decodedEnd}. Expected format: lat,lng` 
          });
        }
        endCoord = [lat, lng];
      } else {
        return res.status(400).json({ 
          error: `Invalid end: ${decodedEnd}. Use node ID (A-F) or lat,lng coordinates` 
        });
      }
    }
    
    // Validate coordinates are in reasonable range (Vancouver area)
    if (startCoord[0] < 49 || startCoord[0] > 50 || startCoord[1] < -124 || startCoord[1] > -122 ||
        endCoord[0] < 49 || endCoord[0] > 50 || endCoord[1] < -124 || endCoord[1] > -122) {
      return res.status(400).json({ 
        error: 'Coordinates are outside Vancouver area. Please select locations in Vancouver, BC.' 
      });
    }
    
    // Find closest nodes in graph
    const startNode = findClosestNode(startCoord, graph);
    const endNode = findClosestNode(endCoord, graph);
    
    if (!startNode || !endNode) {
      return res.status(400).json({ 
        error: 'Could not find nearby street segments for the given coordinates. Please try locations closer to bike routes.' 
      });
    }
    
    // Find paths
    const fastestPathNodes = findFastestPath(graph, startNode, endNode);
    const safestPathNodes = findSafestPath(graph, startNode, endNode, currentHour);
    
    if (fastestPathNodes.length === 0 && safestPathNodes.length === 0) {
      return res.status(404).json({ 
        error: 'No route found between the specified locations' 
      });
    }
    
    // Convert to coordinates
    const fastestRouteCoords = fastestPathNodes.length > 0 
      ? pathToCoordinates(fastestPathNodes, graph)
      : [];
    const safestRouteCoords = safestPathNodes.length > 0
      ? pathToCoordinates(safestPathNodes, graph)
      : [];
    
    // Ensure routes start and end at exact coordinates
    if (fastestRouteCoords.length > 0) {
      fastestRouteCoords[0] = startCoord;
      fastestRouteCoords[fastestRouteCoords.length - 1] = endCoord;
    }
    if (safestRouteCoords.length > 0) {
      safestRouteCoords[0] = startCoord;
      safestRouteCoords[safestRouteCoords.length - 1] = endCoord;
    }
    
    // Convert to Google Maps format: [{ lat, lng }, ...]
    const convertToGoogleFormat = (coords) => {
      return coords.map(coord => ({
        lat: Array.isArray(coord) ? coord[0] : coord.lat || coord[0],
        lng: Array.isArray(coord) ? coord[1] : coord.lng || coord[1]
      }));
    };
    
    res.json({
      fastestRoute: convertToGoogleFormat(fastestRouteCoords),
      safestRoute: convertToGoogleFormat(safestRouteCoords),
      start: { lat: startCoord[0], lng: startCoord[1] },
      end: { lat: endCoord[0], lng: endCoord[1] }
    });
  } catch (error) {
    console.error('Error in /route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /nodes endpoint to get available test nodes
router.get('/nodes', (req, res) => {
  const nodeList = Object.keys(testNodes).map(id => ({
    id,
    coordinates: testNodes[id],
    name: id
  }));
  res.json(nodeList);
});

module.exports = router;

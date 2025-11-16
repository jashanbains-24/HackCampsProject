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

// Initialize data on first request
function initializeData() {
  if (!streetData) {
    try {
      console.log('Loading street data from CSV files...');
      streetData = loadStreetData();
      console.log(`Loaded ${streetData.length} street segments`);
      
      const built = buildGraph(streetData);
      graph = built.graph;
      nodeMap = built.nodeMap;
      console.log(`Built graph with ${Object.keys(graph).length} nodes`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
}

// GET /route endpoint
router.get('/route', (req, res) => {
  try {
    initializeData();
    
    const { start, end, hour } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ 
        error: 'Missing required parameters: start and end' 
      });
    }

    const currentHour = hour || 12;
    
    // Handle test node IDs (A-F) or coordinates
    let startCoord, endCoord;
    
    if (testNodes[start.toUpperCase()]) {
      startCoord = testNodes[start.toUpperCase()];
    } else {
      // Try to parse as coordinates
      const parts = start.split(',');
      if (parts.length === 2) {
        startCoord = [parseFloat(parts[0]), parseFloat(parts[1])];
      } else {
        return res.status(400).json({ 
          error: `Invalid start: ${start}. Use node ID (A-F) or lat,lng coordinates` 
        });
      }
    }
    
    if (testNodes[end.toUpperCase()]) {
      endCoord = testNodes[end.toUpperCase()];
    } else {
      const parts = end.split(',');
      if (parts.length === 2) {
        endCoord = [parseFloat(parts[0]), parseFloat(parts[1])];
      } else {
        return res.status(400).json({ 
          error: `Invalid end: ${end}. Use node ID (A-F) or lat,lng coordinates` 
        });
      }
    }
    
    // Find closest nodes in graph
    const startNode = findClosestNode(startCoord, graph);
    const endNode = findClosestNode(endCoord, graph);
    
    if (!startNode || !endNode) {
      return res.status(400).json({ 
        error: 'Could not find nearby street segments for the given coordinates' 
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

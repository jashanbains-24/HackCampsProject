const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Scoring Weights
const W_INFRASTRUCTURE = 2.5;
const W_LIGHTING = 2.0;
const W_AMENITY = 1.5;
const W_CRIME = -3.0;
const W_DISRUPTION = -2.0;

// Parse GeoJSON geometry from CSV
function parseGeometry(geomString) {
  if (!geomString || typeof geomString !== 'string') return [];
  
  try {
    // Handle escaped JSON strings (common in CSV)
    let cleaned = geomString.trim();
    // Remove outer quotes if present
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    // Unescape double quotes
    cleaned = cleaned.replace(/""/g, '"');
    
    const geom = JSON.parse(cleaned);
    if (geom.type === 'LineString' && geom.coordinates) {
      return geom.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
    } else if (geom.type === 'MultiLineString' && geom.coordinates) {
      // Flatten MultiLineString into single array
      return geom.coordinates.flat().map(coord => [coord[1], coord[0]]);
    }
    return [];
  } catch (e) {
    console.warn('Failed to parse geometry:', e.message, geomString?.substring(0, 50));
    return [];
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1, coord2) {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest point on a line segment to a given point
function findClosestPointOnSegment(point, segmentStart, segmentEnd) {
  const [px, py] = point;
  const [sx, sy] = segmentStart;
  const [ex, ey] = segmentEnd;
  
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) return segmentStart;
  
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  return [sx + t * dx, sy + t * dy];
}

// Find closest point in all segments to a given coordinate
function findClosestSegmentPoint(targetCoord, segments) {
  let minDistance = Infinity;
  let closestPoint = null;
  let closestSegment = null;
  
  for (const segment of segments) {
    const coords = segment.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const point = findClosestPointOnSegment(targetCoord, coords[i], coords[i + 1]);
      const dist = calculateDistance(targetCoord, point);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = point;
        closestSegment = segment;
      }
    }
  }
  
  return { point: closestPoint, segment: closestSegment, distance: minDistance };
}

// Load and parse CSV files
function loadStreetData() {
  const dataDir = path.join(__dirname, '..', 'data');
  
  // Load bikeways - optimized parsing
  const bikewaysPath = path.join(dataDir, 'bikeways.csv');
  const bikewaysContent = fs.readFileSync(bikewaysPath, 'utf-8');
  const bikewaysRecords = parse(bikewaysContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
    delimiter: ';',
    skip_records_with_error: true
    // Removed on_record callback for performance - we'll trim when needed
  });
  
  // Load sidewalk condition data - optimized
  const sidewalkPath = path.join(dataDir, 'sidewalk-condition-rating.csv');
  const sidewalkContent = fs.readFileSync(sidewalkPath, 'utf-8');
  const sidewalkRecords = parse(sidewalkContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
    delimiter: ';',
    skip_records_with_error: true
  });
  
  // Load street lighting - optimized
  const lightingPath = path.join(dataDir, 'street-lighting-poles.csv');
  const lightingContent = fs.readFileSync(lightingPath, 'utf-8');
  const lightingRecords = parse(lightingContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
    delimiter: ';',
    skip_records_with_error: true
  });
  
  // Process bikeways into segments
  const segments = [];
  const segmentMap = new Map(); // For quick lookup
  
  // Process bikeways - optimized with early filtering
  bikewaysRecords.forEach((record, index) => {
    const geomField = record.Geom || record['Geom'];
    if (!geomField) return; // Skip records without geometry
    
    const coords = parseGeometry(geomField);
    if (coords.length < 2) return;
    
    const bikewayType = (record['Bikeway type'] || '').trim();
    const segmentId = `bike_${index}`;
    const segment = {
      id: segmentId,
      coordinates: coords,
      streetName: (record['Street name'] || record['Bike route name'] || '').trim(),
      bikewayType: bikewayType,
      speedLimit: parseInt(record['Speed limit']) || 30,
      length: parseFloat(record['Segment length']) || calculateDistance(coords[0], coords[coords.length - 1]),
      start: coords[0],
      end: coords[coords.length - 1],
      // Safety scores based on bikeway type - optimized
      scores: {
        infra: bikewayType === 'Protected Bike Lanes' ? 9 : 
               bikewayType === 'Painted Lanes' ? 6 : 4,
        light: 5, // Will be enhanced with lighting data
        crime: 3, // Default
        disruption: 0,
        amenity: (record['AAA Network'] || '').trim() === 'YES' ? 8 : 4
      }
    };
    
    segments.push(segment);
    segmentMap.set(segmentId, segment);
  });
  
  // Enhance with sidewalk condition data - optimized with spatial indexing
  const sidewalkMap = new Map(); // Cache condition scores by approximate location
  sidewalkRecords.forEach((record) => {
    const geomField = record.Geom || record['Geom'];
    if (!geomField) return;
    
    const coords = parseGeometry(geomField);
    if (coords.length < 2) return;
    
    const condition = (record['Sidewalk Condition Index Rating'] || '').trim();
    const conditionScore = condition === 'Very Good' ? 9 :
                          condition === 'Good' ? 7 :
                          condition === 'Fair' ? 5 :
                          condition === 'Poor' ? 3 : 1;
    
    // Store condition for nearby segments (round to 0.001 for spatial hashing)
    const key1 = `${Math.round(coords[0][0] * 1000)},${Math.round(coords[0][1] * 1000)}`;
    const key2 = `${Math.round(coords[coords.length - 1][0] * 1000)},${Math.round(coords[coords.length - 1][1] * 1000)}`;
    sidewalkMap.set(key1, conditionScore);
    sidewalkMap.set(key2, conditionScore);
  });
  
  // Apply sidewalk conditions to segments
  segments.forEach(seg => {
    const key1 = `${Math.round(seg.start[0] * 1000)},${Math.round(seg.start[1] * 1000)}`;
    const key2 = `${Math.round(seg.end[0] * 1000)},${Math.round(seg.end[1] * 1000)}`;
    const score1 = sidewalkMap.get(key1);
    const score2 = sidewalkMap.get(key2);
    if (score1) seg.scores.infra = Math.max(seg.scores.infra, score1);
    if (score2) seg.scores.infra = Math.max(seg.scores.infra, score2);
  });
  
  // Enhance with lighting data - optimized with spatial grid
  const lightingGrid = new Map(); // Spatial grid for faster lookup
  lightingRecords.forEach(record => {
    try {
      const geomStr = record.Geom || record['Geom'];
      if (!geomStr) return;
      let cleaned = geomStr.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
          (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
      }
      cleaned = cleaned.replace(/""/g, '"');
      const geom = JSON.parse(cleaned);
      if (geom.type === 'Point' && geom.coordinates) {
        const point = [geom.coordinates[1], geom.coordinates[0]]; // [lat, lng]
        // Add to spatial grid (round to 0.01 for ~1km grid cells)
        const gridKey = `${Math.round(point[0] * 100)},${Math.round(point[1] * 100)}`;
        if (!lightingGrid.has(gridKey)) {
          lightingGrid.set(gridKey, []);
        }
        lightingGrid.get(gridKey).push(point);
      }
    } catch (e) {
      // Skip invalid records
    }
  });
  
  // Count nearby lights for each segment using grid lookup
  segments.forEach(seg => {
    let lightCount = 0;
    const gridKey = `${Math.round(seg.start[0] * 100)},${Math.round(seg.start[1] * 100)}`;
    const nearbyLights = lightingGrid.get(gridKey) || [];
    nearbyLights.forEach(lightPoint => {
      const dist = calculateDistance(seg.start, lightPoint);
      if (dist < 0.05) { // Within ~50m
        lightCount++;
      }
    });
    seg.scores.light = Math.min(10, 5 + lightCount); // Boost lighting score
  });
  
  return segments;
}

// Build graph from segments
function buildGraph(segments) {
  const graph = {};
  const nodeMap = new Map(); // Map coordinates to node IDs
  
  // Create nodes from segment endpoints
  let nodeIdCounter = 0;
  segments.forEach(segment => {
    const startKey = `${segment.start[0].toFixed(6)},${segment.start[1].toFixed(6)}`;
    const endKey = `${segment.end[0].toFixed(6)},${segment.end[1].toFixed(6)}`;
    
    if (!nodeMap.has(startKey)) {
      nodeMap.set(startKey, `node_${nodeIdCounter++}`);
    }
    if (!nodeMap.has(endKey)) {
      nodeMap.set(endKey, `node_${nodeIdCounter++}`);
    }
    
    const startNode = nodeMap.get(startKey);
    const endNode = nodeMap.get(endKey);
    
    if (!graph[startNode]) {
      graph[startNode] = { coords: segment.start, neighbors: [] };
    }
    if (!graph[endNode]) {
      graph[endNode] = { coords: segment.end, neighbors: [] };
    }
    
    // Add edge (bidirectional)
    graph[startNode].neighbors.push({
      node: endNode,
      segment: segment,
      distance: segment.length
    });
    graph[endNode].neighbors.push({
      node: startNode,
      segment: segment,
      distance: segment.length
    });
  });
  
  return { graph, nodeMap, segments };
}

// Find closest node to a coordinate
function findClosestNode(targetCoord, graph) {
  let minDistance = Infinity;
  let closestNode = null;
  
  for (const nodeId in graph) {
    const node = graph[nodeId];
    const dist = calculateDistance(targetCoord, node.coords);
    if (dist < minDistance) {
      minDistance = dist;
      closestNode = nodeId;
    }
  }
  
  return closestNode;
}

// Dijkstra's algorithm for fastest route (distance only)
function findFastestPath(graph, startNode, endNode) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  
  for (const nodeId in graph) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  }
  distances[startNode] = 0;
  
  while (unvisited.size > 0) {
    let currentNode = null;
    let smallestDistance = Infinity;
    
    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDistance) {
        smallestDistance = distances[nodeId];
        currentNode = nodeId;
      }
    }
    
    if (currentNode === null || distances[currentNode] === Infinity) break;
    if (currentNode === endNode) {
      // Reconstruct path
      const path = [];
      let node = endNode;
      while (node !== null) {
        path.unshift(node);
        node = previous[node];
      }
      return path;
    }
    
    unvisited.delete(currentNode);
    
    if (graph[currentNode] && graph[currentNode].neighbors) {
      for (const neighbor of graph[currentNode].neighbors) {
        if (!unvisited.has(neighbor.node)) continue;
        
        const alt = distances[currentNode] + neighbor.distance;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = currentNode;
        }
      }
    }
  }
  
  return [];
}

// Dijkstra's algorithm for safest route (safety-weighted)
function findSafestPath(graph, startNode, endNode, currentHour) {
  const hour = parseInt(currentHour) || 12;
  let lightWeight = W_LIGHTING;
  let crimeWeight = W_CRIME;
  const isDayTime = (hour > 6 && hour < 19);
  
  if (isDayTime) {
    lightWeight = 0.1;
  } else {
    crimeWeight = crimeWeight * 1.5;
  }
  
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  
  for (const nodeId in graph) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  }
  distances[startNode] = 0;
  
  while (unvisited.size > 0) {
    let currentNode = null;
    let smallestDistance = Infinity;
    
    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDistance) {
        smallestDistance = distances[nodeId];
        currentNode = nodeId;
      }
    }
    
    if (currentNode === null || distances[currentNode] === Infinity) break;
    if (currentNode === endNode) {
      const path = [];
      let node = endNode;
      while (node !== null) {
        path.unshift(node);
        node = previous[node];
      }
      return path;
    }
    
    unvisited.delete(currentNode);
    
    if (graph[currentNode] && graph[currentNode].neighbors) {
      for (const neighbor of graph[currentNode].neighbors) {
        if (!unvisited.has(neighbor.node)) continue;
        
        const segment = neighbor.segment;
        const scores = segment.scores;
        const safetyScore = (W_INFRASTRUCTURE * scores.infra) +
                          (lightWeight * scores.light) +
                          (W_AMENITY * scores.amenity) +
                          (crimeWeight * scores.crime) +
                          (W_DISRUPTION * scores.disruption);
        
        // Cost = distance - safety bonus (safer routes are "shorter")
        const cost = neighbor.distance - (safetyScore * 0.1);
        const finalCost = Math.max(0.1, cost);
        
        const alt = distances[currentNode] + finalCost;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = currentNode;
        }
      }
    }
  }
  
  return [];
}

// Convert path of node IDs to full coordinate array
function pathToCoordinates(pathNodeIds, graph) {
  if (!pathNodeIds || pathNodeIds.length < 2) return [];
  
  const fullPath = [];
  
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const currentNode = pathNodeIds[i];
    const nextNode = pathNodeIds[i + 1];
    
    const node = graph[currentNode];
    if (!node) continue;
    
    // Find the segment connecting these nodes
    const neighbor = node.neighbors.find(n => n.node === nextNode);
    if (neighbor && neighbor.segment) {
      const segment = neighbor.segment;
      const coords = segment.coordinates;
      
      // Check if we need to reverse the coordinates
      const startDist = calculateDistance(coords[0], node.coords);
      const endDist = calculateDistance(coords[coords.length - 1], node.coords);
      const shouldReverse = endDist < startDist;
      
      if (i === 0) {
        // First segment - add all coordinates
        if (shouldReverse) {
          fullPath.push(...coords.slice().reverse());
        } else {
          fullPath.push(...coords);
        }
      } else {
        // Subsequent segments - skip first point to avoid duplicates
        if (shouldReverse) {
          fullPath.push(...coords.slice(0, -1).reverse());
        } else {
          fullPath.push(...coords.slice(1));
        }
      }
    } else {
      // Fallback: straight line if no segment found
      const currentCoords = node.coords;
      const nextNodeData = graph[nextNode];
      if (nextNodeData) {
        if (i === 0) {
          fullPath.push(currentCoords);
        }
        fullPath.push(nextNodeData.coords);
      }
    }
  }
  
  // Ensure we end at the final node
  const lastNode = graph[pathNodeIds[pathNodeIds.length - 1]];
  if (lastNode && fullPath.length > 0) {
    const lastCoord = fullPath[fullPath.length - 1];
    const finalCoord = lastNode.coords;
    if (calculateDistance(lastCoord, finalCoord) > 0.001) {
      fullPath.push(finalCoord);
    }
  }
  
  return fullPath;
}

// Predefined test nodes (Vancouver landmarks)
const testNodes = {
  'A': [49.2827, -123.1207], // Gastown
  'B': [49.2810, -123.1190], // Waterfront Station
  'C': [49.2780, -123.1230], // Granville Street
  'D': [49.2790, -123.1250], // Vancouver Art Gallery
  'E': [49.2760, -123.1280], // Yaletown
  'F': [49.2740, -123.1200]  // Library Square
};

module.exports = {
  loadStreetData,
  buildGraph,
  findClosestNode,
  findFastestPath,
  findSafestPath,
  pathToCoordinates,
  testNodes,
  calculateDistance
};


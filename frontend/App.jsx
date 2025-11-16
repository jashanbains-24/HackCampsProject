import React, { useState, useEffect } from 'react';
import GoogleMap from './components/GoogleMap';
import LocationSearch from './components/LocationSearch';
import NavigationMode from './components/NavigationMode';

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
      '✅ Well-lit historic Gastown area with active street life and nearby fire hall',
      '✅ Safe area with good lighting and pedestrian infrastructure'
    ]
  },
  kitsilano: {
    bounds: {
      latMin: 49.265, latMax: 49.280,
      lngMin: -123.170, lngMax: -123.145
    },
    warnings: [],
    safeFeatures: [
      '✅ Route through Kitsilano - safe residential area with good lighting',
      '✅ Well-maintained sidewalks and bike lanes in Kitsilano',
      '✅ Active neighborhood with parks and community amenities nearby'
    ]
  },
  shaughnessy: {
    bounds: {
      latMin: 49.240, latMax: 49.260,
      lngMin: -123.145, lngMax: -123.120
    },
    warnings: [],
    safeFeatures: [
      '✅ Passes through Shaughnessy - upscale residential area with excellent safety',
      '✅ Quiet, well-lit streets in Shaughnessy with low traffic',
      '✅ High-quality pedestrian infrastructure in this neighborhood'
    ]
  },
  strathcona: {
    bounds: {
      latMin: 49.275, latMax: 49.290,
      lngMin: -123.100, lngMax: -123.080
    },
    warnings: [
      '⚠️ Route passes through Strathcona - mixed area, be cautious at night'
    ],
    safeFeatures: [
      '✅ Some areas of Strathcona have good community infrastructure'
    ]
  },
  ubc: {
    bounds: {
      latMin: 49.250, latMax: 49.270,
      lngMin: -123.260, lngMax: -123.230
    },
    warnings: [],
    safeFeatures: [
      '✅ Route near UBC campus - well-lit with active student presence',
      '✅ Good pedestrian infrastructure around UBC area',
      '✅ Campus security and emergency services nearby'
    ]
  },
  highway1: {
    bounds: {
      latMin: 49.200, latMax: 49.300,
      lngMin: -123.200, lngMax: -123.100
    },
    warnings: [
      '⚠️ Route passes near Highway 1 - higher traffic and noise levels',
      '⚠️ Be extra cautious when crossing or near major highways'
    ],
    safeFeatures: []
  },
  highway99: {
    bounds: {
      latMin: 49.250, latMax: 49.300,
      lngMin: -123.150, lngMax: -123.100
    },
    warnings: [
      '⚠️ Route passes near Highway 99 - busy arterial with heavy traffic',
      '⚠️ Exercise caution near highway intersections'
    ],
    safeFeatures: []
  },
  mountPleasant: {
    bounds: {
      latMin: 49.265, latMax: 49.280,
      lngMin: -123.100, lngMax: -123.080
    },
    warnings: [],
    safeFeatures: [
      '✅ Route through Mount Pleasant - vibrant neighborhood with good infrastructure',
      '✅ Well-maintained streets and active community presence'
    ]
  },
  fairview: {
    bounds: {
      latMin: 49.260, latMax: 49.275,
      lngMin: -123.130, lngMax: -123.110
    },
    warnings: [],
    safeFeatures: [
      '✅ Passes through Fairview - residential area with good lighting',
      '✅ Safe neighborhood with community amenities nearby'
    ]
  },
  westEnd: {
    bounds: {
      latMin: 49.280, latMax: 49.290,
      lngMin: -123.140, lngMax: -123.125
    },
    warnings: [],
    safeFeatures: [
      '✅ Route through West End - safe, well-lit residential area',
      '✅ Active neighborhood with good pedestrian infrastructure'
    ]
  },
  coalHarbour: {
    bounds: {
      latMin: 49.285, latMax: 49.295,
      lngMin: -123.130, lngMax: -123.120
    },
    warnings: [],
    safeFeatures: [
      '✅ Route through Coal Harbour - upscale area with excellent safety',
      '✅ Well-maintained waterfront paths and excellent lighting'
    ]
  }
};

// Major schools in Vancouver (approximate locations)
const SCHOOLS = [
  { name: 'UBC', bounds: { latMin: 49.250, latMax: 49.270, lngMin: -123.260, lngMax: -123.230 } },
  { name: 'SFU', bounds: { latMin: 49.275, latMax: 49.285, lngMin: -122.920, lngMax: -122.900 } },
  { name: 'Vancouver Technical Secondary', bounds: { latMin: 49.265, latMax: 49.275, lngMin: -123.070, lngMax: -123.060 } },
  { name: 'Lord Byng Secondary', bounds: { latMin: 49.265, latMax: 49.275, lngMin: -123.180, lngMax: -123.170 } },
  { name: 'Kitsilano Secondary', bounds: { latMin: 49.270, latMax: 49.280, lngMin: -123.160, lngMax: -123.150 } },
  { name: 'Point Grey Secondary', bounds: { latMin: 49.255, latMax: 49.265, lngMin: -123.200, lngMax: -123.190 } },
  { name: 'University Hill Secondary', bounds: { latMin: 49.250, latMax: 49.260, lngMin: -123.250, lngMax: -123.240 } }
];

// Function to check if coordinates are within bounds
function isInBounds(coord, bounds) {
  return coord.lat >= bounds.latMin && coord.lat <= bounds.latMax &&
         coord.lng >= bounds.lngMin && coord.lng <= bounds.lngMax;
}

// Function to check if coordinate is near a point (within radius)
function isNearPoint(coord, point, radiusKm = 0.5) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord.lat - point.lat) * Math.PI / 180;
  const dLng = (coord.lng - point.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point.lat * Math.PI / 180) * Math.cos(coord.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= radiusKm;
}

// Helper function to analyze route areas
function analyzeRouteAreas(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) {
    return { areasPassed: new Set(), schoolsNearby: new Set(), neighborhoods: [] };
  }

  const areasPassed = new Set();
  const schoolsNearby = new Set();
  const neighborhoods = [];
  
  // Check each coordinate in the route
  routeCoords.forEach(coord => {
    // Normalize coordinate format (handle both {lat, lng} and [lat, lng])
    const normalizedCoord = {
      lat: coord.lat || coord[0] || (Array.isArray(coord) ? coord[0] : null),
      lng: coord.lng || coord[1] || (Array.isArray(coord) ? coord[1] : null)
    };
    
    if (!normalizedCoord.lat || !normalizedCoord.lng) return;
    
    // Check neighborhoods and areas
    for (const [areaName, areaData] of Object.entries(AREA_DESCRIPTIONS)) {
      if (isInBounds(normalizedCoord, areaData.bounds)) {
        areasPassed.add(areaName);
      }
    }
    
    // Check for schools nearby
    SCHOOLS.forEach(school => {
      if (isInBounds(normalizedCoord, school.bounds)) {
        schoolsNearby.add(school.name);
      }
    });
  });

  // Neighborhood display names mapping
  const neighborhoodNames = {
    'coalHarbour': 'Coal Harbour',
    'westEnd': 'West End',
    'shaughnessy': 'Shaughnessy',
    'kitsilano': 'Kitsilano',
    'mountPleasant': 'Mount Pleasant',
    'fairview': 'Fairview',
    'yaletown': 'Yaletown',
    'downtown': 'Downtown',
    'gastown': 'Gastown',
    'strathcona': 'Strathcona',
    'eastHastings': 'East Hastings'
  };
  
  const neighborhoodOrder = [
    'coalHarbour', 'westEnd', 'shaughnessy', 'kitsilano', 'mountPleasant', 
    'fairview', 'yaletown', 'downtown', 'gastown', 'strathcona', 'eastHastings'
  ];
  
  neighborhoodOrder.forEach(areaName => {
    if (areasPassed.has(areaName)) {
      neighborhoods.push(neighborhoodNames[areaName] || areaName);
    }
  });

  return { areasPassed, schoolsNearby, neighborhoods };
}

// Function to analyze safest route - returns structured data with "Route Benefits" only (no warnings)
function analyzeSafestRoute(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) {
    return {
      benefits: ['Optimized for pedestrian safety infrastructure', 'Better street lighting coverage', 'Well-maintained sidewalks and pathways']
    };
  }

  const { areasPassed, schoolsNearby, neighborhoods } = analyzeRouteAreas(routeCoords);
  const benefits = [];

  // No warnings for safest route - only positive benefits

  // Route Benefits - always positive
  const neighborhoodOrder = [
    'coalHarbour', 'westEnd', 'shaughnessy', 'kitsilano', 'mountPleasant', 
    'fairview', 'yaletown', 'downtown', 'gastown'
  ];
  
  neighborhoodOrder.forEach(areaName => {
    if (areasPassed.has(areaName)) {
      const areaData = AREA_DESCRIPTIONS[areaName];
      if (areaData.safeFeatures && areaData.safeFeatures.length > 0) {
        // Extract positive messages (remove emojis and warnings)
        areaData.safeFeatures.forEach(feature => {
          if (!feature.includes('⚠️')) {
            benefits.push(feature.replace(/^✅\s*/, ''));
          }
        });
      }
    }
  });

  // UBC proximity
  if (areasPassed.has('ubc')) {
    benefits.push('Route near UBC campus - well-lit with active student presence');
    benefits.push('Good pedestrian infrastructure around UBC area');
  } else {
    const ubcCenter = { lat: 49.260, lng: -123.246 };
    const nearUBC = routeCoords.some(coord => {
      const normalizedCoord = {
        lat: coord.lat || coord[0] || (Array.isArray(coord) ? coord[0] : null),
        lng: coord.lng || coord[1] || (Array.isArray(coord) ? coord[1] : null)
      };
      return normalizedCoord.lat && normalizedCoord.lng && isNearPoint(normalizedCoord, ubcCenter, 2);
    });
    if (nearUBC) {
      benefits.push('Route passes near UBC campus area');
    }
  }

  // Schools detection
  if (schoolsNearby.size > 0) {
    const schoolList = Array.from(schoolsNearby).join(', ');
    if (schoolsNearby.has('UBC')) {
      benefits.push(`Route passes near ${schoolList} - active campus area with good lighting`);
    } else {
      benefits.push(`Route passes near ${schoolList} - well-monitored school zones`);
    }
  }

  // Neighborhood summary
  if (neighborhoods.length > 0) {
    if (neighborhoods.length > 1) {
      benefits.unshift(`Route passes through: ${neighborhoods.join(', ')}`);
    } else {
      benefits.unshift(`Route through ${neighborhoods[0]} neighborhood`);
    }
  }

  // Default benefits if none found
  if (benefits.length === 0) {
    benefits.push('Optimized for pedestrian safety infrastructure');
    benefits.push('Better street lighting coverage');
    benefits.push('Well-maintained sidewalks and pathways');
  }

  return { benefits };
}

// Function to analyze fastest route - returns structured data with "Route Information"
function analyzeFastestRoute(routeCoords) {
  if (!routeCoords || routeCoords.length === 0) {
    return {
      information: ['Shorter distance for quicker travel']
    };
  }

  const { areasPassed, schoolsNearby, neighborhoods } = analyzeRouteAreas(routeCoords);
  const information = [];

  // Warnings about areas
  if (areasPassed.has('eastHastings')) {
    information.push('⚠️ Passes through East Hastings - high crime area, poor lighting, avoid at night');
  }
  
  if (areasPassed.has('strathcona')) {
    information.push('⚠️ Route passes through Strathcona - mixed area, be cautious at night');
  }

  if (areasPassed.has('highway1')) {
    information.push('⚠️ Route passes near Highway 1 - higher traffic and noise levels');
  }
  
  if (areasPassed.has('highway99')) {
    information.push('⚠️ Route passes near Highway 99 - busy arterial with heavy traffic');
  }

  // Schools (as information, not necessarily negative)
  if (schoolsNearby.size > 0 && !schoolsNearby.has('UBC')) {
    const schoolList = Array.from(schoolsNearby).join(', ');
    information.push(`Route passes near ${schoolList} - be mindful of school zones`);
  }

  // Neighborhood information
  if (neighborhoods.length > 0) {
    if (neighborhoods.length > 1) {
      information.push(`Route passes through: ${neighborhoods.join(', ')}`);
    } else {
      information.push(`Route through ${neighborhoods[0]} neighborhood`);
    }
  }

  // Always have at least one line - use positive if no warnings
  if (information.length === 0) {
    if (neighborhoods.length > 0) {
      information.push(`Direct route through ${neighborhoods[0]} - shorter distance for quicker travel`);
    } else {
      information.push('Shorter distance for quicker travel');
    }
  }

  return { information };
}

function App() {
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [departureTimeEnabled, setDepartureTimeEnabled] = useState(false);
  const [departureDate, setDepartureDate] = useState('today'); // 'today' or 'tomorrow'
  const [departureTime, setDepartureTime] = useState(() => {
    // Default to current time + 1 hour, rounded to nearest 15 minutes
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const minutes = Math.round(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    return now.toTimeString().slice(0, 5); // Format: HH:mm
  });
  const [fastestRoute, setFastestRoute] = useState([]);
  const [safestRoute, setSafestRoute] = useState([]);
  const [fastestDistance, setFastestDistance] = useState(null);
  const [safestDistance, setSafestDistance] = useState(null);
  const [fastestTime, setFastestTime] = useState(null);
  const [safestTime, setSafestTime] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendReady, setBackendReady] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('safest'); // Default to safest route
  const [expandedRoute, setExpandedRoute] = useState(null); // Track which route card is expanded
  const [fastestRouteInfo, setFastestRouteInfo] = useState({ information: [] });
  const [safestRouteInfo, setSafestRouteInfo] = useState({ benefits: [] });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [navigationRouteType, setNavigationRouteType] = useState(null);

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
        // Combine date selection (today/tomorrow) with time
        const now = new Date();
        if (departureDate === 'tomorrow') {
          now.setDate(now.getDate() + 1);
        }
        const [hours, minutes] = departureTime.split(':');
        now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        const departureTimestamp = now.toISOString();
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
      setFastestDistance(data.fastestDistance !== undefined ? data.fastestDistance : null);
      setSafestDistance(data.safestDistance !== undefined ? data.safestDistance : null);
      setFastestTime(data.fastestTime !== undefined ? data.fastestTime : null);
      setSafestTime(data.safestTime !== undefined ? data.safestTime : null);
      setStartCoords(data.start);
      setEndCoords(data.end);
      setSelectedRoute('safest'); // Reset to safest route by default
      setShowResults(true);
      
      // Debug: Log the received data
      console.log('Route data received:', {
        fastestTime: data.fastestTime,
        fastestDistance: data.fastestDistance,
        safestTime: data.safestTime,
        safestDistance: data.safestDistance,
        fastestTimeType: typeof data.fastestTime,
        fastestDistanceType: typeof data.fastestDistance,
        fullData: data
      });
      
      // Analyze routes and store structured descriptions
      const fastestInfo = analyzeFastestRoute(data.fastestRoute);
      const safestInfo = analyzeSafestRoute(data.safestRoute);
      
      // Store structured info in state
      setFastestRouteInfo(fastestInfo);
      setSafestRouteInfo(safestInfo);
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

  // Clear routes when locations are cleared
  useEffect(() => {
    if (!startLocation || !endLocation) {
      setFastestRoute([]);
      setSafestRoute([]);
      setFastestDistance(null);
      setSafestDistance(null);
      setFastestTime(null);
      setSafestTime(null);
      setStartCoords(null);
      setEndCoords(null);
      setShowResults(false);
      setError(null);
      setExpandedRoute(null);
      setSelectedRoute('safest'); // Reset to default
      setFastestRouteInfo({ information: [] });
      setSafestRouteInfo({ benefits: [] });
    }
  }, [startLocation, endLocation]);

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
  }, [departureTime, departureDate, departureTimeEnabled]); // Refetch when departure time, date, or toggle changes

  const canSearch = startLocation && endLocation && backendReady && !loading;

  const handleReportSubmit = (e) => {
    e.preventDefault();
    // TODO: Send report to backend
    console.log('Report submitted:', {
      type: reportType,
      description: reportDescription,
      location: reportLocation
    });
    // Reset form and close modal
    setReportType('');
    setReportDescription('');
    setReportLocation(null);
    setShowReportModal(false);
    // Show success message (you can add a toast notification here)
    alert('Thank you for your report! We will review it shortly.');
  };

  return (
    <div className="app-container">
      {/* Report Button - Top Right */}
      <button
        className="report-button"
        onClick={() => setShowReportModal(true)}
        aria-label="Report an issue"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Report</span>
      </button>

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Report an Issue</h2>
              <button
                className="modal-close"
                onClick={() => setShowReportModal(false)}
                aria-label="Close modal"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="report-form">
              <div className="form-group">
                <label htmlFor="report-type" className="form-label">Issue Type</label>
                <select
                  id="report-type"
                  className="form-input"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  required
                >
                  <option value="">Select an issue type...</option>
                  <option value="poor-lighting">Poor Lighting</option>
                  <option value="dangerous-drivers">Dangerous Drivers</option>
                  <option value="suspicious-activity">Suspicious Activity</option>
                  <option value="broken-sidewalks">Broken Sidewalks</option>
                  <option value="construction-zones">Construction Zones</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="report-description" className="form-label">Description</label>
                <textarea
                  id="report-description"
                  className="form-input form-textarea"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide details about the issue..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="report-location" className="form-label">Location (Optional)</label>
                <LocationSearch
                  label=""
                  placeholder="Search for location..."
                  value={reportLocation}
                  onChange={(location) => setReportLocation(location)}
                  disabled={loading || !backendReady}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-screen Map Background - Edge to Edge */}
      <div className="map-container">
        <GoogleMap
          fastestRoute={fastestRoute}
          safestRoute={safestRoute}
          start={startCoords}
          end={endCoords}
          startLabel={startLocation?.address || 'Start'}
          endLabel={endLocation?.address || 'End'}
          selectedRoute={navigationMode ? navigationRouteType : selectedRoute}
          onRouteSelect={setSelectedRoute}
        />
      </div>

      {/* Navigation Mode Overlay - Full Screen */}
      {navigationMode && (
        <NavigationMode
          route={navigationRouteType === 'fastest' ? fastestRoute : safestRoute}
          routeType={navigationRouteType}
          routeInfo={navigationRouteType === 'fastest' ? fastestRouteInfo : safestRouteInfo}
          onStop={() => {
            setNavigationMode(false);
            setNavigationRouteType(null);
          }}
          onReport={(reportData) => {
            console.log('Report submitted from navigation:', reportData);
          }}
        />
      )}

      {/* Frosted Glass Floating Panel */}
      {!navigationMode && (
      <div className="control-panel">
        <div className="panel-header">
          <h1 className="app-title">SafeWalk+</h1>
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
                <div className="departure-time-selectors">
                  <select
                    id="departure-date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    disabled={loading || !backendReady}
                    className="departure-day-select"
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                  </select>
                  <input
                    id="departure-time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    disabled={loading || !backendReady}
                    className="departure-time-select"
                    step="900"
                  />
                </div>
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
                    <h4 className="route-details-title">Route Information</h4>
                    <ul className="route-details-list">
                      {fastestRouteInfo.information.length > 0 ? (
                        fastestRouteInfo.information.map((info, idx) => (
                          <li key={idx}>{info}</li>
                        ))
                      ) : (
                        <li>Shorter distance for quicker travel</li>
                      )}
                    </ul>
                  </div>
                </div>
                {selectedRoute === 'fastest' && (
                  <button 
                    className="route-start-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNavigationMode(true);
                      setNavigationRouteType('fastest');
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Navigation
                  </button>
                )}
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
                    <h4 className="route-details-title">Route Benefits</h4>
                    <ul className="route-details-list">
                      {safestRouteInfo.benefits.length > 0 ? (
                        safestRouteInfo.benefits.map((benefit, idx) => (
                          <li key={idx}>{benefit}</li>
                        ))
                      ) : (
                        <>
                          <li>Optimized for pedestrian safety infrastructure</li>
                          <li>Better street lighting coverage</li>
                          <li>Well-maintained sidewalks and pathways</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                {selectedRoute === 'safest' && (
                  <button 
                    className="route-start-btn route-start-btn-safest"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNavigationMode(true);
                      setNavigationRouteType('safest');
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Navigation
                  </button>
                )}
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
      )}
    </div>
  );
}

export default App;

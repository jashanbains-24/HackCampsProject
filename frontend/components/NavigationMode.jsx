import React, { useState, useEffect, useRef } from 'react';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat || coord1[0]) * Math.PI / 180;
  const φ2 = (coord2.lat || coord2[0]) * Math.PI / 180;
  const Δφ = ((coord2.lat || coord2[0]) - (coord1.lat || coord1[0])) * Math.PI / 180;
  const Δλ = ((coord2.lng || coord2[1]) - (coord1.lng || coord1[1])) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Calculate bearing between two coordinates
function calculateBearing(coord1, coord2) {
  const lat1 = (coord1.lat || coord1[0]) * Math.PI / 180;
  const lat2 = (coord2.lat || coord2[0]) * Math.PI / 180;
  const dLng = ((coord2.lng || coord2[1]) - (coord1.lng || coord1[1])) * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
          Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// Get direction arrow based on bearing
function getDirectionArrow(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return '↑'; // North
  if (bearing >= 22.5 && bearing < 67.5) return '↗'; // Northeast
  if (bearing >= 67.5 && bearing < 112.5) return '→'; // East
  if (bearing >= 112.5 && bearing < 157.5) return '↘'; // Southeast
  if (bearing >= 157.5 && bearing < 202.5) return '↓'; // South
  if (bearing >= 202.5 && bearing < 247.5) return '↙'; // Southwest
  if (bearing >= 247.5 && bearing < 292.5) return '←'; // West
  if (bearing >= 292.5 && bearing < 337.5) return '↖'; // Northwest
  return '→';
}

// Normalize coordinate format
function normalizeCoord(coord) {
  if (!coord) return null;
  if (typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
    return { lat: coord.lat, lng: coord.lng };
  }
  if (Array.isArray(coord) && coord.length >= 2) {
    return { lat: coord[0], lng: coord[1] };
  }
  return null;
}

// Process route to extract turn-by-turn instructions
function processRouteForNavigation(route) {
  if (!route || route.length < 2) return [];

  // Normalize all coordinates first
  const normalizedRoute = route.map(normalizeCoord).filter(coord => coord !== null);
  if (normalizedRoute.length < 2) return [];

  const instructions = [];
  const significantTurnThreshold = 15; // degrees
  const maxDistanceForStraight = 200; // meters

  // Starting point
  instructions.push({
    type: 'start',
    distance: 0,
    instruction: 'Start navigation',
    bearing: calculateBearing(normalizedRoute[0], normalizedRoute[1]),
    coordinate: normalizedRoute[0]
  });

  let accumulatedDistance = 0;
  let lastInstructionIndex = 0;

  for (let i = 1; i < normalizedRoute.length - 1; i++) {
    const prev = normalizedRoute[i - 1];
    const current = normalizedRoute[i];
    const next = normalizedRoute[i + 1];
    
    const bearing1 = calculateBearing(prev, current);
    const bearing2 = calculateBearing(current, next);
    let turnAngle = bearing2 - bearing1;
    
    // Normalize turn angle
    if (turnAngle > 180) turnAngle -= 360;
    if (turnAngle < -180) turnAngle += 360;
    
    const segmentDistance = calculateDistance(prev, current);
    accumulatedDistance += segmentDistance;
    
    // Check for significant turns
    if (Math.abs(turnAngle) > significantTurnThreshold) {
      // Add "continue straight" instruction if we've accumulated significant distance
      if (accumulatedDistance > maxDistanceForStraight && lastInstructionIndex < i - 1) {
        const straightDistance = calculateDistance(normalizedRoute[lastInstructionIndex], current);
        instructions.push({
          type: 'straight',
          distance: straightDistance,
          instruction: 'Continue straight',
          bearing: bearing1,
          coordinate: current
        });
        accumulatedDistance = 0;
        lastInstructionIndex = i;
      }
      
      // Add turn instruction
      let instruction = '';
      if (turnAngle > 0 && turnAngle < 45) {
        instruction = 'Slight right';
      } else if (turnAngle >= 45 && turnAngle < 135) {
        instruction = 'Turn right';
      } else if (turnAngle >= 135) {
        instruction = 'Sharp right';
      } else if (turnAngle < 0 && turnAngle > -45) {
        instruction = 'Slight left';
      } else if (turnAngle <= -45 && turnAngle > -135) {
        instruction = 'Turn left';
      } else if (turnAngle <= -135) {
        instruction = 'Sharp left';
      }
      
      if (instruction) {
        instructions.push({
          type: 'turn',
          distance: segmentDistance,
          instruction: instruction,
          bearing: bearing2,
          coordinate: current,
          turnAngle: turnAngle
        });
        accumulatedDistance = 0;
        lastInstructionIndex = i;
      }
    }
  }

  // Add final segment if there's accumulated distance
  if (accumulatedDistance > 50) {
    const finalDistance = calculateDistance(normalizedRoute[lastInstructionIndex], normalizedRoute[normalizedRoute.length - 2]);
    if (finalDistance > 50) {
      instructions.push({
        type: 'straight',
        distance: finalDistance,
        instruction: 'Continue straight',
        bearing: calculateBearing(normalizedRoute[normalizedRoute.length - 2], normalizedRoute[normalizedRoute.length - 1]),
        coordinate: normalizedRoute[normalizedRoute.length - 2]
      });
    }
  }

  // If we have very few instructions, add some intermediate waypoints
  if (instructions.length < 3 && normalizedRoute.length > 2) {
    const stepSize = Math.max(1, Math.floor(normalizedRoute.length / 10));
    for (let i = stepSize; i < normalizedRoute.length - 1; i += stepSize) {
      const prev = normalizedRoute[i - stepSize];
      const current = normalizedRoute[i];
      const distance = calculateDistance(prev, current);
      if (distance > 30) {
        instructions.splice(instructions.length - 1, 0, {
          type: 'waypoint',
          distance: distance,
          instruction: 'Continue on route',
          bearing: calculateBearing(prev, current),
          coordinate: current
        });
      }
    }
  }

  // Add destination
  const lastCoord = normalizedRoute[normalizedRoute.length - 1];
  const secondLastCoord = normalizedRoute[normalizedRoute.length - 2];
  const distanceToEnd = calculateDistance(secondLastCoord, lastCoord);
  
  instructions.push({
    type: 'destination',
    distance: distanceToEnd,
    instruction: 'Arrive at destination',
    bearing: calculateBearing(secondLastCoord, lastCoord),
    coordinate: lastCoord
  });

  return instructions;
}

// Format distance for display
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

function NavigationMode({ route, routeType, routeInfo, onStop, onReport }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const instructionsRef = useRef([]);

  useEffect(() => {
    if (route && route.length > 0) {
      const processed = processRouteForNavigation(route);
      instructionsRef.current = processed;
      setCurrentStep(0);
      console.log('Navigation instructions generated:', processed.length, processed);
    }
  }, [route]);

  const currentInstruction = instructionsRef.current[currentStep] || null;
  const upcomingInstructions = instructionsRef.current.slice(currentStep + 1, currentStep + 6);

  const handleNextStep = () => {
    if (currentStep < instructionsRef.current.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (reportType) {
      const reportData = {
        type: reportType,
        description: reportDescription,
        location: currentInstruction?.coordinate || route[0],
        routeType: routeType,
        timestamp: new Date().toISOString()
      };
      
      // Send to backend or store locally
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
          console.log('Report submitted successfully');
        }
      } catch (error) {
        console.error('Error submitting report:', error);
        // Store locally as fallback
        const localReports = JSON.parse(localStorage.getItem('routeReports') || '[]');
        localReports.push(reportData);
        localStorage.setItem('routeReports', JSON.stringify(localReports));
      }
      
      setShowReportSheet(false);
      setReportType('');
      setReportDescription('');
      if (onReport) onReport(reportData);
    }
  };

  if (!route || route.length === 0) {
    return null;
  }

  return (
    <div className="navigation-mode-sidebar">
      {/* Main Navigation Header */}
      <div className="navigation-header-sidebar">
        <div className="navigation-header-content-sidebar">
          {currentInstruction && (
            <>
              <div className="navigation-direction-sidebar">
                <div className="direction-arrow-sidebar" style={{ transform: `rotate(${currentInstruction.bearing}deg)` }}>
                  {getDirectionArrow(currentInstruction.bearing)}
                </div>
              </div>
              <div className="navigation-info-sidebar">
                <h2 className="navigation-instruction-sidebar">{currentInstruction.instruction}</h2>
                {currentInstruction.distance > 0 && (
                  <p className="navigation-distance-sidebar">{formatDistance(currentInstruction.distance)}</p>
                )}
              </div>
            </>
          )}
        </div>
        <button className="navigation-stop-btn-sidebar" onClick={onStop}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Stop
        </button>
      </div>

      {/* Upcoming Turns & Hazards */}
      <div className="navigation-content-sidebar">
        <div className="navigation-section-sidebar">
          <h3 className="navigation-section-title-sidebar">Upcoming Turns</h3>
          <div className="navigation-list-sidebar">
            {upcomingInstructions.length > 0 ? (
              upcomingInstructions.map((instruction, idx) => (
                <div key={idx} className="navigation-list-item-sidebar">
                  <div className="navigation-list-icon-sidebar">
                    {getDirectionArrow(instruction.bearing)}
                  </div>
                  <div className="navigation-list-content-sidebar">
                    <p className="navigation-list-instruction-sidebar">{instruction.instruction}</p>
                    <p className="navigation-list-distance-sidebar">{formatDistance(instruction.distance)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="navigation-list-item-sidebar">
                <p className="navigation-list-instruction-sidebar">No more turns</p>
              </div>
            )}
          </div>
        </div>

        {/* Route Warnings/Hazards */}
        {routeInfo && (
          <div className="navigation-section-sidebar">
            <h3 className="navigation-section-title-sidebar">Route Information</h3>
            <div className="navigation-list-sidebar">
              {routeType === 'fastest' && routeInfo.information && routeInfo.information.length > 0 ? (
                routeInfo.information.map((info, idx) => (
                  <div key={idx} className="navigation-list-item-sidebar navigation-warning-sidebar">
                    <div className="navigation-list-icon-sidebar">⚠️</div>
                    <div className="navigation-list-content-sidebar">
                      <p className="navigation-list-instruction-sidebar">{info}</p>
                    </div>
                  </div>
                ))
              ) : routeType === 'safest' && routeInfo.benefits && routeInfo.benefits.length > 0 ? (
                routeInfo.benefits.slice(0, 3).map((benefit, idx) => (
                  <div key={idx} className="navigation-list-item-sidebar navigation-benefit-sidebar">
                    <div className="navigation-list-icon-sidebar">✅</div>
                    <div className="navigation-list-content-sidebar">
                      <p className="navigation-list-instruction-sidebar">{benefit}</p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="navigation-actions-sidebar">
          <button 
            className="navigation-action-btn-sidebar"
            onClick={() => setShowReportSheet(true)}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report Issue
          </button>
          {currentStep < instructionsRef.current.length - 1 && (
            <button 
              className="navigation-action-btn-sidebar"
              onClick={handleNextStep}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Next Step
            </button>
          )}
        </div>
      </div>

      {/* Report Half-Sheet */}
      {showReportSheet && (
        <div className="report-sheet-overlay-sidebar" onClick={() => setShowReportSheet(false)}>
          <div className="report-sheet-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="report-sheet-header-sidebar">
              <h3>Report Issue</h3>
              <button 
                className="report-sheet-close-sidebar"
                onClick={() => setShowReportSheet(false)}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="report-sheet-form-sidebar">
              <div className="report-sheet-group-sidebar">
                <label>Issue Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  required
                  className="report-sheet-input-sidebar"
                >
                  <option value="">Select issue type...</option>
                  <option value="poor-lighting">Poor Lighting</option>
                  <option value="dangerous-drivers">Dangerous Drivers</option>
                  <option value="suspicious-activity">Suspicious Activity</option>
                  <option value="broken-sidewalks">Broken Sidewalks</option>
                  <option value="construction-zones">Construction Zones</option>
                </select>
              </div>
              <div className="report-sheet-group-sidebar">
                <label>Description (Optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide additional details..."
                  rows={3}
                  className="report-sheet-input-sidebar"
                />
              </div>
              <button type="submit" className="report-sheet-submit-sidebar">
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NavigationMode;


import React, { useEffect, useRef, useState } from 'react';

// Get API key from environment variable
// Set VITE_GOOGLE_MAPS_API_KEY in your .env file
// This should match the key in GoogleMap.jsx
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error('VITE_GOOGLE_MAPS_API_KEY is not set in .env file');
}

function LocationSearch({ value, onChange, placeholder, label, disabled }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Load Google Places API
  useEffect(() => {
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded (by GoogleMap component)
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // If GoogleMap hasn't loaded yet, wait a bit
    const waitForGoogleMap = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
        clearInterval(waitForGoogleMap);
      }
    }, 100);

    return () => clearInterval(waitForGoogleMap);
  }, []);

  // Initialize Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    // Define BC bounds (approximate bounding box for British Columbia)
    const bcBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(48.0, -139.0), // Southwest corner
      new window.google.maps.LatLng(60.0, -114.0)  // Northeast corner
    );

    // Note: google.maps.places.Autocomplete is deprecated in favor of PlaceAutocompleteElement
    // but still works. Consider migrating in the future.
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'], // Restrict to addresses and places
      componentRestrictions: { country: 'ca' }, // Restrict to Canada
      bounds: bcBounds, // Restrict to BC bounds
      strictBounds: true, // Only show results within bounds
      fields: ['geometry', 'formatted_address', 'name', 'place_id']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Validate that location is within BC bounds
        const isInBC = lat >= 48.0 && lat <= 60.0 && lng >= -139.0 && lng <= -114.0;
        
        if (isInBC) {
          const location = {
            lat: lat,
            lng: lng,
            address: place.formatted_address || place.name || '',
            placeId: place.place_id
          };
          
          onChange(location);
          setSearchValue(place.formatted_address || place.name || '');
        } else {
          // Location is outside BC - clear and show error
          setSearchValue('');
          onChange(null);
          console.warn('Selected location is outside British Columbia');
        }
      }
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded, onChange]);

  // Update input value when external value changes
  useEffect(() => {
    if (value && typeof value === 'object' && value.address) {
      setSearchValue(value.address);
    } else if (value && typeof value === 'string') {
      setSearchValue(value);
    } else if (!value) {
      setSearchValue('');
    }
  }, [value]);

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="location-search">
      <label htmlFor={`location-search-${label}`} className="form-label">
        {label}
      </label>
      <div className={`location-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <svg 
          className={`location-icon ${isFocused || searchValue ? 'active' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
        <input
          id={`location-search-${label}`}
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            // Clear selection if user manually edits
            if (onChange) {
              onChange(null);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Search for a location..."}
          disabled={disabled || !isLoaded}
          className="form-input location-input"
        />
        {!isLoaded && (
          <div className="loading-indicator">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        )}
      </div>
      {!isLoaded && (
        <p className="location-loading-text">Loading search...</p>
      )}
    </div>
  );
}

export default LocationSearch;

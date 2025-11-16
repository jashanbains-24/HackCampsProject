import React, { useEffect, useRef, useState } from 'react';

// TODO: Replace this placeholder with your actual Google Maps API key
// This should match the key in GoogleMap.jsx
// Option 1: Use environment variable (recommended for production)
// const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";
// Option 2: Use placeholder (for development - replace with your real key)
const GOOGLE_MAPS_API_KEY = "AIzaSyBm_H40dXUI_uukcoGHBHHxM610bEDLKjU";

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

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'], // Restrict to addresses and places
      componentRestrictions: { country: 'ca' }, // Restrict to Canada (Vancouver)
      fields: ['geometry', 'formatted_address', 'name', 'place_id']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || place.name || '',
          placeId: place.place_id
        };
        
        onChange(location);
        setSearchValue(place.formatted_address || place.name || '');
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

  return (
    <div>
      <label className="block text-sm font-medium mb-2 block">
        {label}
      </label>
      <input
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
        placeholder={placeholder || "Search for a location..."}
        disabled={disabled || !isLoaded}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black px-3 py-2 disabled:bg-gray-200 disabled:cursor-not-allowed"
      />
      {!isLoaded && (
        <p className="text-xs text-gray-400 mt-1">Loading search...</p>
      )}
    </div>
  );
}

export default LocationSearch;


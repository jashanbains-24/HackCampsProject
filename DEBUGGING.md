# Debugging Guide

## Issues Fixed

### 1. CSV Parsing Errors
- **Problem**: CSV files use semicolons (`;`) as delimiters, not commas
- **Solution**: Updated all CSV parsers to use `delimiter: ';'`
- **Added**: Error handling with `skip_records_with_error: true` to skip malformed rows

### 2. Geometry Parsing
- **Problem**: GeoJSON strings in CSV are escaped with double quotes
- **Solution**: Added cleaning logic to unescape quotes before parsing JSON

### 3. Frontend Route Display
- **Problem**: Routes not displaying on map
- **Solution**: 
  - Updated backend to return coordinates in Google Maps format: `{ lat, lng }`
  - Fixed coordinate conversion in frontend
  - Added better error handling

### 4. Node Selection
- **Problem**: Cannot select start/end locations
- **Solution**:
  - Added better error handling for node fetching
  - Improved dropdown display with coordinates
  - Added default values when nodes load

## Testing

### Test Backend Directly
```bash
# Test nodes endpoint
curl http://localhost:3001/api/nodes

# Test route endpoint
curl "http://localhost:3001/api/route?start=A&end=F&hour=12"
```

### Test Frontend
1. Make sure backend is running: `npm run backend`
2. Start frontend: `npm run frontend`
3. Open browser console to see any errors
4. Check Network tab to see API calls

### Common Issues

1. **"Internal server error"**
   - Restart the backend server
   - Check backend console for detailed error messages
   - Verify CSV files exist in `data/` directory

2. **Routes not showing**
   - Check browser console for JavaScript errors
   - Verify Google Maps API key is set
   - Check Network tab to see if API calls are successful

3. **Cannot select locations**
   - Check if `/api/nodes` endpoint returns data
   - Check browser console for fetch errors
   - Verify backend is running on port 3001

## Next Steps

1. Restart the backend server to apply CSV parsing fixes
2. Clear browser cache and reload
3. Check browser console for any remaining errors
4. Test route calculation between different nodes


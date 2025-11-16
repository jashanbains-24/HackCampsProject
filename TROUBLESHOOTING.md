# Troubleshooting Guide

## Route Not Loading

### Check Backend is Running

1. **Verify backend server is running:**
   ```bash
   curl http://localhost:3001/api/status
   ```
   Should return: `{"loaded":true,"loading":false,...}`

2. **If backend is not running:**
   ```bash
   npm run backend
   ```
   Wait for: "Built graph with X nodes"

### Check Browser Console

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### Common Issues

#### "Cannot connect to backend"
- **Solution**: Start the backend server: `npm run backend`
- **Verify**: Check `http://localhost:3001/api/status` in browser

#### "Could not find nearby street segments"
- **Cause**: Selected locations are too far from bike routes
- **Solution**: Try locations in downtown Vancouver or near bike paths
- **Test locations**:
  - Gastown: `49.2827, -123.1207`
  - Library Square: `49.2740, -123.1200`

#### "Invalid coordinates"
- **Cause**: Location search didn't return valid coordinates
- **Solution**: 
  - Clear the search field
  - Try searching again
  - Make sure to select from the dropdown suggestions

#### Routes show but map is blank
- **Cause**: Google Maps API key issue
- **Solution**:
  1. Check `.env` file exists and has `VITE_GOOGLE_MAPS_API_KEY`
  2. Restart frontend server after creating/updating `.env`
  3. Check browser console for API key errors

### Debug Steps

1. **Test backend directly:**
   ```bash
   curl "http://localhost:3001/api/route?start=49.2827,-123.1207&end=49.2740,-123.1200&hour=12"
   ```

2. **Check frontend console:**
   - Look for "Fetching route from:" log
   - Check the URL being called
   - Verify coordinates are numbers, not strings

3. **Verify coordinates format:**
   - Start/End should be objects: `{ lat: 49.28, lng: -123.12 }`
   - Not strings or arrays

### Testing Route Endpoint

```bash
# Test with coordinates
curl "http://localhost:3001/api/route?start=49.2827,-123.1207&end=49.2740,-123.1200&hour=12"

# Test with node IDs
curl "http://localhost:3001/api/route?start=A&end=F&hour=12"
```

Expected response:
```json
{
  "fastestRoute": [{ "lat": 49.28, "lng": -123.12 }, ...],
  "safestRoute": [{ "lat": 49.28, "lng": -123.12 }, ...],
  "start": { "lat": 49.2827, "lng": -123.1207 },
  "end": { "lat": 49.2740, "lng": -123.1200 }
}
```

## Still Not Working?

1. **Restart both servers:**
   ```bash
   # Stop both (Ctrl+C)
   npm run backend  # Terminal 1
   npm run frontend # Terminal 2
   ```

2. **Clear browser cache** and reload

3. **Check all console errors** in browser DevTools

4. **Verify .env file** has the correct API key


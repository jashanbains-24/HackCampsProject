# Google Maps API Setup Guide

This project uses Google Maps JavaScript API to display interactive maps with routing visualization.

## Getting Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"
4. Create an API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

## Securing Your API Key

**IMPORTANT**: Never commit your real API key to version control!

### Setting Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. The `.env` file is already in `.gitignore`, so it won't be committed.

4. **Restart your development server** after creating/updating `.env`:
   ```bash
   npm run frontend
   ```

### How It Works

- Vite automatically loads environment variables from `.env` files
- Variables prefixed with `VITE_` are exposed to client-side code
- The components (`GoogleMap.jsx` and `LocationSearch.jsx`) automatically use `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
- No code changes needed - just set the variable in `.env`

## Restricting Your API Key

For production, restrict your API key in Google Cloud Console:

1. Go to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domain(s): `localhost:8080`, `yourdomain.com`
4. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Maps JavaScript API"
5. Click "Save"

## Testing

1. Start the backend server:
   ```bash
   npm run backend
   ```

2. Start the frontend:
   ```bash
   npm run frontend
   ```

3. Open `http://localhost:8080` in your browser
4. The map should load with Google Maps tiles
5. Select start and end locations to see routes

## Troubleshooting

### Map Not Loading

- Check browser console for errors
- Verify API key is correct
- Ensure Maps JavaScript API is enabled
- Check API key restrictions (may need to allow localhost)

### Routes Not Showing

- Check backend is running on port 3001
- Verify backend `/api/route` endpoint returns data
- Check browser console for network errors

### API Key Errors

- Verify key is valid in Google Cloud Console
- Check API key restrictions allow your domain
- Ensure billing is enabled (Google Maps requires billing)

## Features

- **Interactive Google Map**
- **Fastest route** (blue polyline)
- **Safest route** (green polyline)
- **Start/End markers** with custom icons
- **Auto-fit bounds** to show all routes
- **Dynamic updates** when routes change


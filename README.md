# SafeWalk+

**A safety-first pedestrian and cyclist routing application for Vancouver, BC** that helps users navigate the city using the safest and fastest routes based on real street data, infrastructure quality, lighting conditions, and crime statistics.

![SafeWalk Vancouver](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)

---

## 🌟 Project Overview

SafeWalk Vancouver is an intelligent route planning application designed to prioritize pedestrian and cyclist safety. Unlike traditional navigation apps that focus solely on speed, SafeWalk analyzes multiple safety factors including:

- **Infrastructure Quality** - Sidewalk conditions, bike lanes, and pedestrian-friendly streets
- **Lighting Conditions** - Street lighting coverage and visibility
- **Crime Statistics** - Historical crime data by neighborhood
- **Time-of-Day Awareness** - Adjusts route recommendations based on sunrise/sunset times
- **Traffic Patterns** - Considers road closures and construction zones

The app provides two route options:
- 🛡️ **Safest Route** - Optimized for safety with detailed neighborhood and hazard information
- ⚡ **Fastest Route** - Shortest distance with warnings about potentially unsafe areas

---

## ✨ Key Features

### 🗺️ Interactive Navigation
- **Google Maps Integration** - Dark mode, Apple Maps-inspired styling
- **Real-Time Route Visualization** - Color-coded polylines (green for safest, blue for fastest)
- **Turn-by-Turn Navigation** - Full-screen navigation mode with step-by-step directions
- **Route Comparison** - Side-by-side comparison of route options

### 🔍 Smart Location Search
- **Google Places Autocomplete** - Real-time location search with BC-only results
- **Address Validation** - Ensures locations are within Vancouver area
- **Quick Selection** - Apple-style dropdown with dark mode UI

### 📊 Advanced Route Analysis
- **Neighborhood Detection** - Identifies routes through Kitsilano, Shaughnessy, Strathcona, Downtown, and more
- **School Zone Warnings** - Alerts for routes near schools and universities (UBC, SFU, etc.)
- **Highway Proximity** - Warnings for routes near major highways
- **Safety Scoring** - Multi-factor safety analysis with detailed breakdowns

### ⏰ Time-Aware Routing
- **Departure Time Selection** - Choose "Today" or "Tomorrow" with time picker
- **Day/Night Mode** - Automatically adjusts safety calculations based on sunrise/sunset
- **Dynamic Re-routing** - Routes update automatically when departure time changes

### 📱 Apple-Inspired Design
- **Frosted Glass UI** - Modern translucent panels with backdrop blur
- **Smooth Animations** - Elegant transitions and micro-interactions
- **Dark Mode** - Optimized for low-light viewing
- **Mobile Responsive** - Fully functional on desktop, tablet, and mobile devices

### 🚨 Safety Features
- **Issue Reporting** - Report poor lighting, dangerous drivers, suspicious activity, broken sidewalks, or construction zones
- **Route Warnings** - Highlighted hazards and safety considerations
- **Neighborhood Insights** - Detailed information about areas along the route

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **Google Maps API Key** (with Maps JavaScript API and Places API enabled)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HackCampsProject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

4. **Get a Google Maps API Key**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable **Maps JavaScript API** and **Places API**
   - Create credentials (API Key)
   - Restrict the key to your domain for security
   - See [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for detailed instructions

### Running the Application

**Option 1: Run both servers together (Recommended)**
```bash
npm start
```
This starts both the backend (port 3001) and frontend (port 8080) servers.

**Option 2: Run servers separately**

Terminal 1 - Backend:
```bash
npm run backend
```

Terminal 2 - Frontend:
```bash
npm run frontend
```

3. **Open your browser**
   Navigate to `http://localhost:8080`

### First-Time Setup Notes

- The backend will automatically load street data from CSV files on first startup
- Initial data loading may take 30-60 seconds (one-time process)
- Check the backend console for loading progress
- The frontend will display a loading message until data is ready

---

## 📁 Project Structure

```
HackCampsProject/
├── backend/
│   ├── server.js          # Express server setup
│   ├── routes.js          # API endpoints (/route, /status, /nodes)
│   ├── dataProcessor.js   # CSV parsing, graph building, pathfinding algorithms
│   └── safetyRouter.js    # Safety-specific routing logic
│
├── frontend/
│   ├── App.jsx            # Main React component (route selection, state management)
│   ├── main.jsx           # React entry point
│   ├── index.css          # Global styles (Apple-inspired design system)
│   ├── index.html         # HTML template
│   └── components/
│       ├── GoogleMap.jsx      # Google Maps integration with dark mode
│       ├── LocationSearch.jsx # Google Places Autocomplete component
│       └── [other components]
│
├── data/                  # Vancouver street data (CSV files)
│   ├── bikeways.csv                    # Bike route network
│   ├── sidewalk-condition-rating.csv   # Sidewalk quality data
│   ├── street-lighting-poles.csv       # Lighting infrastructure
│   ├── crimedata_csv_AllNeighbourhoods_AllYears.csv  # Crime statistics
│   ├── fire-halls.csv                  # Emergency services locations
│   └── road-ahead-current-road-closures.csv  # Road closure data
│
├── .env                   # Environment variables (not committed)
├── .env.example           # Example environment file
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies and scripts
└── start-server.js        # Concurrent server startup script
```

---

## 🔌 API Endpoints

### `GET /api/status`
Check backend data loading status.

**Response:**
```json
{
  "loaded": true,
  "loading": false,
  "segments": 12345,
  "nodes": 5678,
  "error": null
}
```

### `GET /api/route`
Get fastest and safest routes between two locations.

**Query Parameters:**
- `start` - Start location (coordinates: `lat,lng` or test node ID: `A-F`)
- `end` - End location (coordinates: `lat,lng` or test node ID: `A-F`)
- `departure` (optional) - ISO timestamp for departure time (e.g., `2024-01-15T14:30:00`)

**Example:**
```
GET /api/route?start=49.2827,-123.1207&end=49.2750,-123.1214&departure=2024-01-15T14:30:00
```

**Response:**
```json
{
  "fastestRoute": [
    { "lat": 49.2827, "lng": -123.1207 },
    { "lat": 49.2810, "lng": -123.1190 },
    ...
  ],
  "safestRoute": [
    { "lat": 49.2827, "lng": -123.1207 },
    { "lat": 49.2800, "lng": -123.1180 },
    ...
  ],
  "start": { "lat": 49.2827, "lng": -123.1207 },
  "end": { "lat": 49.2750, "lng": -123.1214 },
  "fastestDistance": 2.5,
  "safestDistance": 2.8,
  "fastestTime": 30,
  "safestTime": 34
}
```

### `GET /api/nodes`
Get available test nodes (predefined Vancouver landmarks).

**Response:**
```json
[
  { "id": "A", "coordinates": [49.2827, -123.1207], "name": "A" },
  ...
]
```

---

## 🎨 Design System

### Color Palette
- **Apple Blue**: `#0572f7` (Fastest route)
- **Spring Green**: `#00FF7F` (Safest route)
- **Dark Background**: `#000000` with frosted glass overlays
- **Text Colors**: White with varying opacity for hierarchy

### Typography
- **Font Family**: SF Pro Display / Inter (system fonts)
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Spacing
- Based on 8px grid system
- Consistent spacing scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

### Components
- **Frosted Glass Panels** - Translucent backgrounds with backdrop blur
- **Route Cards** - Expandable cards with smooth animations
- **Navigation Mode** - Full-screen turn-by-turn interface
- **Report Modal** - Half-sheet modal for issue reporting

---

## 🛠️ Development

### Available Scripts

```bash
# Start both backend and frontend
npm start

# Start only backend server (port 3001)
npm run backend

# Start only frontend dev server (port 8080)
npm run frontend

# Build for production
npm run build

# Development mode (same as npm start)
npm run dev
```

### Technology Stack

**Frontend:**
- React 19.2.0
- Vite 7.2.2
- Google Maps JavaScript API
- CSS3 (Custom Properties, Backdrop Filter)

**Backend:**
- Node.js
- Express 5.1.0
- csv-parse 6.1.0
- CORS 2.8.5

**Algorithms:**
- Dijkstra's Algorithm (for pathfinding)
- Haversine Formula (for distance calculations)
- Spatial Indexing (for efficient data lookups)

---

## 🔒 Security & Privacy

### API Key Security
- ⚠️ **Never commit your `.env` file** - It's already in `.gitignore`
- ⚠️ **Restrict your Google Maps API key** in Google Cloud Console:
  - Set HTTP referrer restrictions
  - Limit to specific APIs (Maps JavaScript API, Places API)
  - Use different keys for development and production
- ⚠️ **Monitor API usage** in Google Cloud Console to detect unauthorized access

### Data Privacy
- All route calculations are performed server-side
- No user location data is stored or transmitted to third parties
- Reports are stored locally or sent to your backend (configurable)

---

## 🐛 Troubleshooting

### Common Issues

**1. Black screen on load**
- Check that `.env` file exists with `VITE_GOOGLE_MAPS_API_KEY`
- Verify API key is valid and has required APIs enabled
- Check browser console for errors

**2. Routes not loading**
- Ensure backend server is running on port 3001
- Check backend console for data loading status
- Wait for initial data load to complete (30-60 seconds first time)

**3. "No route found" error**
- Verify locations are within Vancouver, BC area
- Try locations closer to bike routes and main streets
- Check that coordinates are valid (lat: 49.0-49.5, lng: -123.3 to -122.9)

**4. Navigation shows "No more turns"**
- This is normal for very short or straight routes
- The system generates instructions based on route complexity
- Check browser console for instruction generation logs

**5. Map not displaying**
- Verify Google Maps API key is correct
- Check that Maps JavaScript API is enabled
- Ensure API key restrictions allow your domain

### Getting Help

- Check [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for API setup details
- Review [ENV_SETUP.md](./ENV_SETUP.md) for environment variable configuration
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed troubleshooting guide

---

## 📊 Data Sources

The application uses real Vancouver street data from:

- **Vancouver Open Data Portal** - Bike route network, sidewalk conditions
- **Street Lighting Data** - City infrastructure records
- **Crime Statistics** - Historical neighborhood crime data
- **Road Closures** - Current construction and closure information

All data is processed and optimized for real-time route calculations.

---

## 🎯 Future Enhancements

Potential features for future development:

- [ ] Real-time traffic integration
- [ ] Weather-aware routing
- [ ] Community-reported safety updates
- [ ] Offline mode support
- [ ] Voice navigation
- [ ] Route sharing and favorites
- [ ] Accessibility-focused routing (wheelchair accessible paths)
- [ ] Integration with public transit

---

## 📝 License

ISC License

---

## 👥 Contributing

This is a HackCamp project. For contributions or questions, please contact the development team.

---

## 🙏 Acknowledgments

- Vancouver Open Data Portal for providing street infrastructure data
- Google Maps Platform for mapping services
- React and Vite communities for excellent tooling

---

**Built with ❤️ for safer streets in Vancouver**

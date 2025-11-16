# SafeWalk Vancouver - Route Planning App

A pedestrian and cyclist safety-first routing application for Vancouver, BC.

## Features

- 🗺️ **Interactive Google Maps** with real-time route visualization
- 🔍 **Location Search** using Google Places Autocomplete
- 🛡️ **Safest Route** calculation based on infrastructure, lighting, crime data
- ⚡ **Fastest Route** calculation based on distance
- 📊 **Real Street Data** from Vancouver's bike network and sidewalk conditions
- ⏰ **Time-of-Day Aware** routing (adjusts safety weights for day/night)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Maps API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd HackCampsProject
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

4. Get your Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable "Maps JavaScript API" and "Places API"
   - Create an API key
   - See [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for detailed instructions

### Running the Application

1. Start the backend server:
   ```bash
   npm run backend
   ```
   The backend will start on `http://localhost:3001` and begin loading street data.

2. Start the frontend (in a new terminal):
   ```bash
   npm run frontend
   ```
   The frontend will start on `http://localhost:8080`

3. Open your browser to `http://localhost:8080`

### Development Scripts

- `npm start` - Start both backend and frontend servers
- `npm run backend` - Start only the backend server
- `npm run frontend` - Start only the frontend dev server
- `npm run build` - Build the frontend for production

## Project Structure

```
HackCampsProject/
├── backend/
│   ├── server.js          # Express server
│   ├── routes.js          # API routes
│   └── dataProcessor.js   # CSV parsing and graph building
├── frontend/
│   ├── App.jsx            # Main React component
│   ├── components/
│   │   ├── GoogleMap.jsx      # Google Maps integration
│   │   └── LocationSearch.jsx # Places Autocomplete
│   └── main.jsx           # React entry point
├── data/                  # CSV data files
│   ├── bikeways.csv
│   ├── sidewalk-condition-rating.csv
│   └── street-lighting-poles.csv
├── .env                   # Environment variables (not committed)
└── .env.example           # Example environment file
```

## API Endpoints

- `GET /api/status` - Check backend loading status
- `GET /api/nodes` - Get available test nodes
- `GET /api/route?start={lat,lng}&end={lat,lng}&hour={0-23}` - Get fastest and safest routes

## Environment Variables

All environment variables use the `VITE_` prefix (required by Vite):

- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (required)
- `VITE_API_BASE_URL` - Backend API URL (optional, defaults to http://localhost:3001/api)

## Security Notes

- ⚠️ **Never commit your `.env` file** - it's already in `.gitignore`
- ⚠️ **Restrict your API key** in Google Cloud Console to your domain
- ⚠️ **Use different keys** for development and production

## Troubleshooting

See [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for detailed troubleshooting guide.

## License

ISC

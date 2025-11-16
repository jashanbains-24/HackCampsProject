# Environment Variables Setup

This project uses environment variables to securely store sensitive configuration like API keys.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your actual API key:**
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
   ```

3. **Restart your development server:**
   ```bash
   npm run frontend
   ```

## Environment Variables

### Required

- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps JavaScript API key
  - Get it from: https://console.cloud.google.com/google/maps-apis
  - Must enable: Maps JavaScript API and Places API

### Optional

- `VITE_API_BASE_URL` - Backend API URL (defaults to `http://localhost:3001/api`)

## How It Works

- Vite automatically loads `.env` files from the project root
- Only variables prefixed with `VITE_` are exposed to client-side code
- The `.env` file is in `.gitignore` and will NOT be committed
- Use `.env.example` as a template for other developers

## Security

✅ **DO:**
- Keep your `.env` file local
- Use `.env.example` to document required variables
- Restrict your API key in Google Cloud Console

❌ **DON'T:**
- Commit `.env` to version control
- Share your API key publicly
- Use the same key for development and production

## Troubleshooting

### "API key is missing" error

1. Check that `.env` file exists in the project root
2. Verify the variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`
3. Make sure there are no spaces around the `=` sign
4. Restart the dev server after creating/updating `.env`

### Map not loading

1. Check browser console for errors
2. Verify the API key is correct in `.env`
3. Ensure Maps JavaScript API and Places API are enabled
4. Check API key restrictions in Google Cloud Console


# Frontend

React, TypeScript, Vite, and Leaflet.js frontend for visualizing HCMC bus GPS data on a map.

## Local Commands

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

The app listens on `http://localhost:5173` by default.

The frontend expects the backend API at:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Realtime simulation settings:

```env
VITE_POLL_INTERVAL_MS=1000
```

The backend controls simulated speed and the selected-bus trail window through
`SPEED_MULTIPLIER` and `TRAJECTORY_WINDOW_SECONDS`.

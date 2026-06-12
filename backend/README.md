# Backend

Node.js, Express, and TypeScript API for serving HCMC bus GPS data from a local SQL Server Express database.

## Responsibilities

- Expose bus and statistics API endpoints.
- Keep query logic isolated in repository implementations.
- Use manual constructor injection for service dependencies.

## Local Commands

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run db:check
npm.cmd start
```

The API listens on `http://localhost:3001` by default.

Configuration is read from `backend/.env` when present. The current local setup uses SQL Server Express on `127.0.0.1:1433`, database `BusGPS`, table `dbo.bus_waypoints`, and SQL Authentication with the read-only app user.

## API Endpoints

```text
GET  /health
GET  /api/buses/next
POST /api/buses/reset
GET  /api/buses/:vehicleId/trajectory?targetTimestamp=<epochMilliseconds>
```

`POST /api/buses/reset` moves the global playback cursor to the earliest
dataset timestamp. Each `/next` request queries one indexed time window and
advances the cursor by `SPEED_MULTIPLIER` seconds.

For the included dataset, playback starts at `2025-03-22 03:23:02`. With
`SPEED_MULTIPLIER=30` and one frontend poll per second, each request advances
the dataset clock by 30 seconds.

Before running playback, execute
`src/data/create-playback-index.sql` using a database administrator account.
The datetime-leading index is required for global playback windows, while the
vehicle-leading index supports selected-bus trails.

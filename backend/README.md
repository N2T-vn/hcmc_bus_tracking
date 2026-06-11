# Backend

Node.js, Express, and TypeScript API for serving HCMC bus GPS data from a local SQL Server Express database.

## Responsibilities

- Expose bus and statistics API endpoints.
- Keep query logic isolated in repository implementations.
- Use manual constructor injection for service dependencies.
- Support SQL Server first, with ClickHouse as a future repository strategy.

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
GET  /api/buses/next?elapsedSeconds=<seconds>
POST /api/buses/reset
GET  /api/buses/latest
GET  /api/buses/:vehicleId/trajectory
GET  /api/stats
GET  /api/stats/routes
```

`POST /api/buses/reset` returns elapsed time `0`. The frontend owns its playback
clock and sends it to `/api/buses/next`, so concurrent clients have independent
playback sessions. Each vehicle is replayed relative to its own first GPS row
and loops independently when it reaches the end of its recorded trajectory.

Before running playback against the full dataset, execute
`src/data/create-playback-index.sql` using a database administrator account.
The application account is intentionally read-only and cannot install the
required index.

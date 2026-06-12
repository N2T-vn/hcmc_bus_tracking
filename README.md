# HCMC Bus Tracking

This project visualizes Ho Chi Minh City bus GPS data on a web map.

The backend is a Node.js, Express, and TypeScript API that reads a local SQL Server Express database. The frontend is a React, TypeScript, Vite, and Leaflet.js application that renders bus positions and dataset statistics.

## How To Run

Open two PowerShell terminals.

### 1. Backend API

```powershell
cd D:\Workspace\uni-works\252\multi_project\HCM_Bus_Tracking\backend
npm.cmd install
npm.cmd run build
npm.cmd run db:check
npm.cmd start
```

The backend listens on:

```text
http://localhost:3001
```

Useful backend checks:

```powershell
npm.cmd run typecheck
npm.cmd run db:check
```

### 2. Frontend App

```powershell
cd D:\Workspace\uni-works\252\multi_project\HCM_Bus_Tracking\frontend
npm.cmd install
npm.cmd run dev
```

The frontend listens on:

```text
http://localhost:5173
```

Useful frontend checks:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Architecture

```text
React + TypeScript + Leaflet Frontend
        |
        v
Express Route Handlers
        |
        v
BusService
        |
        v
IBusRepository
        |
        +--> MssqlBusRepository
        |
        v
SQL Server Express Database
```

## Database

The local database uses Microsoft SQL Server Express with the existing database `BusGPS` and table `dbo.bus_waypoints`.

The current local development setup uses SQL Authentication:

```env
DB_SERVER=127.0.0.1
DB_PORT=1433
DB_DATABASE=BusGPS
DB_BUS_TABLE=dbo.bus_waypoints
DB_AUTH_MODE=sql
DB_USER=bus_app
```

The simulated realtime playback is controlled by:

```env
VITE_POLL_INTERVAL_MS=1000
SPEED_MULTIPLIER=60
TRAJECTORY_WINDOW_SECONDS=900
```

The backend keeps one global cursor starting at the earliest dataset timestamp.
Each real-time tick queries `[T, T + SPEED_MULTIPLIER)` and then advances `T`.
With the default multiplier of `60`, one real second replays one dataset minute,
so an 11-hour-12-minute dataset completes in about 11 minutes 12 seconds.
The frontend retains the last known position for vehicles without a ping in the
current tick.

The live trail for a selected vehicle is limited to
`TRAJECTORY_WINDOW_SECONDS`.

Run `backend/src/data/create-playback-index.sql` once with a database account
that has `CREATE INDEX` permission. This index is required for responsive
playback on the million-row dataset; the read-only application account cannot
create it automatically.

## Patterns

- Repository Pattern: all query logic lives behind repository interfaces.
- Dependency Injection: services receive repositories through manual constructor injection.

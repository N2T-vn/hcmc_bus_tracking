# HCMC Bus Tracking

This project visualizes Ho Chi Minh City bus GPS data on a web map.

The backend is a Node.js, Express, and TypeScript API that reads a local SQL Server Express database. The frontend is a React, TypeScript, Vite, and Leaflet.js application that will render bus positions and route statistics.

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
        +--> ClickHouseBusRepository (future)
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
VITE_POLL_INTERVAL_MS=5000
PLAYBACK_STEP_SECONDS=5
PLAYBACK_ACTIVE_WINDOW_SECONDS=300
```

Each playback request returns at most one GPS position per vehicle. Because the
source trajectories do not share one continuous absolute time range, every
vehicle is synchronized relative to its own first GPS row and loops when its
trajectory ends. Vehicles without a recent row inside the active window are
excluded from that snapshot.

Run `backend/src/data/create-playback-index.sql` once with a database account
that has `CREATE INDEX` permission. This index is required for responsive
playback on the million-row dataset; the read-only application account cannot
create it automatically.

## Patterns

- Repository Pattern: all query logic lives behind repository interfaces.
- Strategy Pattern: database implementations are swappable behind the same contract.
- Dependency Injection: services receive repositories through manual constructor injection.

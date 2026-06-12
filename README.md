# HCMC Bus Tracking

This project visualizes Ho Chi Minh City bus GPS data on a web map.

The backend is a Node.js, Express, and TypeScript API that reads a local SQL Server Express database. The frontend is a React, TypeScript, Vite, and Leaflet.js application that renders bus positions and dataset statistics.

## How To Run

### Dataset prerequisite

The dataset is distributed separately because `bus_waypoints.csv` is about
166 MB and exceeds GitHub's regular 100 MB file limit.

Before running the Docker stack:

1. Download the shared dataset file.
2. Rename it to `bus_waypoints.csv` if necessary.
3. Place it at:

```text
database/bus_waypoints.csv
```

From the project root, verify that Docker will receive the expected file:

```powershell
Get-Item .\database\bus_waypoints.csv
Get-Content .\database\bus_waypoints.csv -TotalCount 2
```

The first line must be:

```text
vehicle,datetime,x,y,speed,heading,ignition,aircon,door_up,door_down,driver
```

Do not change the filename or CSV column order. The Docker database initializer
will mount this file into the SQL Server container and import it into
`BusGPS.dbo.bus_waypoints`.

### Run with Docker

Requirements:

- Docker Desktop using Linux containers.
- At least 4 GB of memory available to Docker.
- `database/bus_waypoints.csv` prepared as described above.

Create the Docker environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace both example passwords. Each SQL Server password must
contain uppercase and lowercase letters, digits, and symbols.

Build and start the complete system:

```powershell
docker compose up --build -d
```

The first startup imports about 1.05 million CSV rows and creates two indexes,
so it can take several minutes. Follow the import job:

```powershell
docker compose logs -f db-init
```

Wait until the log contains:

```text
Database initialization completed.
```

Check all services:

```powershell
docker compose ps
```

The expected long-running services are `db`, `backend`, and `frontend`.
`db-init` should show `Exited (0)` because it is a successful one-time job.

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001/health
SQL:      localhost,1433
```

Useful commands:

```powershell
docker compose logs -f backend
docker compose restart backend frontend
docker compose down
```

`docker compose down` preserves the imported SQL Server volume. To delete the
database and force a clean CSV import:

```powershell
docker compose down -v
docker compose up --build -d
```

### Run without Docker

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
SPEED_MULTIPLIER=30
TRAJECTORY_WINDOW_SECONDS=900
```

The backend keeps one global cursor starting at the earliest dataset timestamp.
Each real-time tick queries `[T, T + SPEED_MULTIPLIER)` and then advances `T`.
For the included dataset, the first cursor is `2025-03-22 03:23:02`. With the
default multiplier of `30`, the first window is `[03:23:02, 03:23:32)`, the
second is `[03:23:32, 03:24:02)`, and each real second advances the dataset
clock by 30 seconds.
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

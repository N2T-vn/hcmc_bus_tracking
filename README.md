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

Do not change the filename or CSV column order.

### 1. Create the SQL Server container

Requirements:

- Docker Desktop using Linux containers.
- `database/bus_waypoints.csv` prepared as described above.

Create a persistent database volume and SQL Server 2019 container:

```powershell
docker volume create busgps_data

docker run -d `
  --name BusGPS `
  -e "ACCEPT_EULA=Y" `
  -e "MSSQL_PID=Developer" `
  -e "MSSQL_SA_PASSWORD=BusApp@12345" `
  -p 1433:1433 `
  -v busgps_data:/var/opt/mssql `
  mcr.microsoft.com/mssql/server:2019-latest
```

Wait until SQL Server is ready:

```powershell
docker logs -f BusGPS
```

After seeing `SQL Server is now ready for client connections`, press `Ctrl+C`.

Create the import directory and copy the dataset and SQL script:

```powershell
docker exec BusGPS mkdir -p /var/opt/mssql/import
docker cp .\database\bus_waypoints.csv BusGPS:/var/opt/mssql/import/bus_waypoints.csv
docker cp .\database\initialize.sql BusGPS:/var/opt/mssql/import/initialize.sql
```

Import the CSV, create indexes, and create the read-only `bus_app` login:

```powershell
docker exec BusGPS /opt/mssql-tools18/bin/sqlcmd `
  -S localhost `
  -U sa `
  -P "BusApp@12345" `
  -C -b `
  -v APP_DB_PASSWORD="BusApp@12345" `
  -i /var/opt/mssql/import/initialize.sql
```

Expected final output includes:

```text
imported_rows: 1050694
first_record:  2025-03-22 03:23:02
```

Verify the independent database container:

```powershell
docker ps --filter "name=BusGPS"
```

### 2. Run backend and frontend

Create the application environment file:

```powershell
Copy-Item .env.example .env
```

The values of `MSSQL_SA_PASSWORD` and `APP_DB_PASSWORD` must match the
passwords used above. The backend connects to the independent database through
`host.docker.internal:1433`.

Build and start the application containers:

```powershell
docker compose up --build -d
docker compose ps
```

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
docker stop BusGPS
docker start BusGPS
```

`docker compose down` only removes backend and frontend. It does not remove the
independent `BusGPS` container or its `busgps_data` volume.

To completely recreate the database:

```powershell
docker rm -f BusGPS
docker volume rm busgps_data
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

# HCMC Bus Tracking

React, Leaflet, Express, TypeScript, and Microsoft SQL Server application for
replaying HCMC bus GPS data.

## Dataset

Download the shared CSV and place it at:

```text
database/bus_waypoints.csv
```

Required header:

```text
vehicle,datetime,x,y,speed,heading,ignition,aircon,door_up,door_down,driver
```

## Run With Docker

SQL Server runs as an independent container. Docker Compose only runs the
backend and frontend.

### 1. Create SQL Server

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

After `SQL Server is now ready for client connections`, press `Ctrl+C`.

### 2. Import The Dataset

```powershell
docker exec BusGPS mkdir -p /var/opt/mssql/import
docker cp .\database\bus_waypoints.csv BusGPS:/var/opt/mssql/import/bus_waypoints.csv
docker cp .\database\initialize.sql BusGPS:/var/opt/mssql/import/initialize.sql

docker exec BusGPS /opt/mssql-tools18/bin/sqlcmd `
  -S localhost `
  -U sa `
  -P "BusApp@12345" `
  -C -b `
  -v APP_DB_PASSWORD="BusApp@12345" `
  -i /var/opt/mssql/import/initialize.sql
```

The import should report `1050694` rows and first record
`2025-03-22 03:23:02`.

### 3. Run The Application

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001/health
```

## Run Without Docker

### 1. Install Database Tools

Install:

- Microsoft SQL Server 2019 or newer.
- SQL Server Management Studio (SSMS).
- VS Code extension `SQL Server (mssql)` by Microsoft, extension ID
  `ms-mssql.mssql`.

SSMS and the VS Code extension both connect to the same SQL Server instance.

In VS Code, run `MS SQL: Connect` from the Command Palette and use:

```text
Server:         127.0.0.1,1433
Authentication: SQL Login
User:           bus_app
Password:       BusApp@12345
Database:       BusGPS
Trust certificate: Yes
```

### 2. Enable SQL Authentication

In SSMS:

1. Connect using Windows Authentication.
2. Right-click the server and select **Properties**.
3. Open **Security**.
4. Select **SQL Server and Windows Authentication mode**.
5. Restart the SQL Server service.

In SQL Server Configuration Manager:

1. Enable TCP/IP for the SQL Server instance.
2. Set TCP port `1433` if the instance does not already expose a fixed port.
3. Restart the SQL Server service.

### 3. Import The CSV

Create the database first:

```sql
IF DB_ID(N'BusGPS') IS NULL
BEGIN
    CREATE DATABASE BusGPS;
END;
GO
```

Use the SSMS **Import Flat File** wizard to import
`database/bus_waypoints.csv`.

The application requires:

```text
Database: BusGPS
Table:    dbo.bus_waypoints
Columns:  vehicle, datetime, x, y, speed, heading, ignition, aircon
```

The extra CSV columns `door_up`, `door_down`, and `driver` are not used by the
application.

### 4. Create Login And Permissions

Run this query in SSMS as an administrator:

```sql
USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'bus_app')
BEGIN
    CREATE LOGIN bus_app
        WITH PASSWORD = 'BusApp@12345',
        CHECK_POLICY = ON;
END;
GO

USE BusGPS;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_principals
    WHERE name = N'bus_app'
)
BEGIN
    CREATE USER bus_app FOR LOGIN bus_app;
END;
GO

IF IS_ROLEMEMBER(N'db_datareader', N'bus_app') <> 1
BEGIN
    ALTER ROLE db_datareader ADD MEMBER bus_app;
END;
GO
```

### 5. Create Playback Indexes

Run:

```sql
USE BusGPS;
GO

CREATE INDEX IX_bus_waypoints_vehicle_datetime
    ON dbo.bus_waypoints (vehicle, datetime DESC)
    INCLUDE (speed, x, y, heading, ignition, aircon);
GO

CREATE INDEX IX_bus_waypoints_datetime_vehicle
    ON dbo.bus_waypoints (datetime ASC, vehicle)
    INCLUDE (speed, x, y, heading, ignition, aircon);
GO
```

If the indexes may already exist, execute
`backend/src/data/create-playback-index.sql` instead.

### 6. Configure The Backend

Create `backend/.env`:

```env
PORT=3001
DB_SERVER=127.0.0.1
DB_PORT=1433
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_DATABASE=BusGPS
DB_BUS_TABLE=dbo.bus_waypoints
DB_AUTH_MODE=sql
DB_USER=bus_app
DB_PASSWORD=BusApp@12345
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_REQUEST_TIMEOUT_MS=30000
CORS_ORIGIN=http://localhost:5173
SPEED_MULTIPLIER=30
TRAJECTORY_WINDOW_SECONDS=900
```

`DB_AUTH_MODE=sql` tells the backend to use `DB_USER` and `DB_PASSWORD`.

For Windows Authentication instead:

```env
DB_SERVER=localhost\SQLEXPRESS
DB_PORT=
DB_AUTH_MODE=windows
DB_USER=
DB_PASSWORD=
```

Windows Authentication requires `ODBC Driver 18 for SQL Server` on the local
machine.

### 7. Run Backend And Frontend

Backend:

```powershell
cd .\backend
npm.cmd install
npm.cmd run build
npm.cmd run db:check
npm.cmd start
```

Frontend, from another terminal:

```powershell
cd .\frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001/health
```

## Playback

Playback starts at the earliest dataset record, `2025-03-22 03:23:02`.
With `SPEED_MULTIPLIER=30` and one request per second, each playback window
advances the dataset clock by 30 seconds.

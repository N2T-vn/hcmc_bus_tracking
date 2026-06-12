# Database Dataset

The dataset is distributed separately from the Git repository. Download the
shared CSV and place it at:

```text
database/bus_waypoints.csv
```

The filename is required by the documented `docker cp` command and SQL import
script.

Expected CSV header:

```text
vehicle,datetime,x,y,speed,heading,ignition,aircon,door_up,door_down,driver
```

The file is about 166 MB and is ignored by Git because GitHub rejects regular
files larger than 100 MB.

Verify the file from the project root:

```powershell
Test-Path .\database\bus_waypoints.csv
Get-Item .\database\bus_waypoints.csv | Select-Object Name, Length
Get-Content .\database\bus_waypoints.csv -TotalCount 1
```

Expected result:

```text
Test-Path: True
Header: vehicle,datetime,x,y,speed,heading,ignition,aircon,door_up,door_down,driver
```

The application imports these columns:

```text
vehicle, datetime, x, y, speed, heading, ignition, aircon
```

`door_up`, `door_down`, and `driver` are not used by the current application.

SQL Server runs as an independent Docker container named `BusGPS`. Copy this
CSV and `initialize.sql` into `/var/opt/mssql/import`, then execute the script
with `sqlcmd`. The script creates `BusGPS.dbo.bus_waypoints`, imports the
dataset when the table is empty, creates playback indexes, and creates the
read-only `bus_app` login.

Docker Compose only manages the backend and frontend application containers.

# Database Dataset

The dataset is distributed separately from the Git repository. Download the
shared CSV and place it at:

```text
database/bus_waypoints.csv
```

The filename is required because the Docker database initializer will mount
this exact path into the SQL Server container.

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

On the first `docker compose up`, the CSV is mounted read-only into SQL Server.
The one-time `db-init` job creates `BusGPS.dbo.bus_waypoints`, imports the
dataset, creates playback indexes, and creates the read-only `bus_app` login.
Later starts reuse the named SQL Server volume and skip the CSV import.

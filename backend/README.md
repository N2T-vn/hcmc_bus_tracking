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

### `GET /health`

Checks whether the Express process is running.

Algorithm:

1. Express receives the request.
2. The endpoint returns `status: "ok"` and the server's current timestamp.
3. It does not execute a database query.

Example response:

```json
{
  "status": "ok",
  "timestamp": "2025-03-22T03:23:02.000Z"
}
```

This endpoint confirms process availability, not dataset availability.

### `POST /api/buses/reset`

Moves the shared playback cursor to the earliest timestamp in the dataset.

Algorithm:

1. Query `MIN(datetime)` and `MAX(datetime)` from `dbo.bus_waypoints`.
2. Convert both SQL `datetime2` values to Unix epoch milliseconds.
3. Cache this playback range in `BusService`.
4. Set the in-memory cursor to `MIN(datetime)`.
5. Mark the next playback response with `reset: true`, instructing the
   frontend to clear markers retained from an earlier playback cycle.

Example response:

```json
{
  "cursorTimestamp": 1742613782000,
  "cursorIso": "2025-03-22T03:23:02.000Z"
}
```

Possible error:

- `503`: the table contains no records.

### `GET /api/buses/next`

Returns all GPS records in the next simulated time window and advances the
global playback cursor.

Let:

```text
T = current cursor
S = SPEED_MULTIPLIER in seconds
E = maximum dataset timestamp
```

Algorithm:

1. Load and cache `MIN(datetime)` and `MAX(datetime)` if the range has not been
   loaded yet.
2. If the cursor is undefined or greater than `E`, reset it to the minimum
   dataset timestamp.
3. Calculate the requested window:

   ```text
   windowStart = T
   requestedWindowEnd = T + S seconds
   windowEnd = min(requestedWindowEnd, E + 1 millisecond)
   ```

4. Query records using the half-open interval:

   ```sql
   WHERE datetime >= @windowStart
     AND datetime <  @windowEnd
   ORDER BY datetime ASC, vehicle ASC
   ```

5. Convert SQL values into API values:

   - `datetime` becomes Unix epoch milliseconds.
   - `datetime_iso` contains the corresponding ISO representation.
   - Missing sensor values remain `null`.

6. Advance the cursor to `requestedWindowEnd`.
7. When the final window is reached, move the cursor past `E`. The next call
   starts again from the earliest record and returns `reset: true`.

Example with `SPEED_MULTIPLIER=30`:

```text
First request:  [03:23:02, 03:23:32)
Second request: [03:23:32, 03:24:02)
```

An empty `data` array is valid when no vehicle sent a GPS ping during that
specific window.

Important response fields:

```json
{
  "data": [],
  "windowStartIso": "2025-03-22T03:23:02.000Z",
  "windowEndIso": "2025-03-22T03:23:32.000Z",
  "nextCursorTimestamp": 1742613812000,
  "reset": true,
  "hasMore": true
}
```

Possible error:

- `503`: the table contains no records.

### `GET /api/buses/:vehicleId/trajectory`

Returns a bounded historical trail for one vehicle, ending at a requested
playback timestamp.

Parameters:

```text
vehicleId       Required route parameter.
targetTimestamp Required query parameter in Unix epoch milliseconds.
limit           Optional positive integer; default 200, maximum 1000.
```

Example:

```text
GET /api/buses/cf76.../trajectory?targetTimestamp=1742613812000&limit=120
```

Let:

```text
T = targetTimestamp
W = TRAJECTORY_WINDOW_SECONDS
L = normalized limit
```

Algorithm:

1. Reject an empty `vehicleId`.
2. Parse and validate `targetTimestamp`.
3. Validate `limit`, use `200` when omitted, and clamp values above `1000`.
4. Query records for the selected vehicle within:

   ```text
   (T - W, T]
   ```

5. Select the newest `L` records using `ORDER BY datetime DESC`.
6. Reorder those records by `datetime ASC` before returning them, allowing the
   frontend to draw the polyline chronologically.

The query uses `IX_bus_waypoints_vehicle_datetime` to seek by vehicle and
timestamp instead of scanning the full dataset.

Example response:

```json
{
  "data": [
    {
      "vehicle": "cf76...",
      "datetime": 1742613782000,
      "datetime_iso": "2025-03-22T03:23:02.000Z",
      "x": 106.62006,
      "y": 10.801085,
      "speed": null,
      "heading": null,
      "ignition": null,
      "aircon": null
    }
  ]
}
```

Possible errors:

- `400`: missing `vehicleId`, invalid `targetTimestamp`, or invalid `limit`.
- `404`: no trajectory records exist for that vehicle and time range.

## Playback State

The playback cursor is:

- Global: every connected client shares the same cursor.
- In memory: restarting the backend clears the cursor.
- Time-based: it advances by seconds, not by row count or SQL `OFFSET`.
- Initialized from the database's earliest timestamp.

For the included dataset, playback starts at `2025-03-22 03:23:02`. With
`SPEED_MULTIPLIER=30` and one frontend poll per second, each request advances
the dataset clock by 30 seconds.

## Query Indexes

Before running playback, execute
`src/data/create-playback-index.sql` using a database administrator account.
The datetime-leading index is required for global playback windows, while the
vehicle-leading index supports selected-bus trails.

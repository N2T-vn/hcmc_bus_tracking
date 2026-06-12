USE BusGPS;
GO

-- Supports bounded trajectory lookups for one selected vehicle.
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_bus_waypoints_vehicle_datetime'
    AND object_id = OBJECT_ID('dbo.bus_waypoints')
)
BEGIN
  CREATE INDEX IX_bus_waypoints_vehicle_datetime
    ON dbo.bus_waypoints (vehicle, datetime DESC)
    INCLUDE (speed, x, y, heading, ignition, aircon);
END;
GO

-- A vehicle-leading index cannot seek a global datetime-only playback window.
-- This datetime-leading index supports the global half-open replay window.
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_bus_waypoints_datetime_vehicle'
    AND object_id = OBJECT_ID('dbo.bus_waypoints')
)
BEGIN
  CREATE INDEX IX_bus_waypoints_datetime_vehicle
    ON dbo.bus_waypoints (datetime ASC, vehicle)
    INCLUDE (speed, x, y, heading, ignition, aircon);
END;
GO

USE BusGPS;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_bus_waypoints_vehicle_datetime'
    AND object_id = OBJECT_ID('dbo.bus_waypoints')
)
BEGIN
  CREATE INDEX IX_bus_waypoints_vehicle_datetime
    ON dbo.bus_waypoints (vehicle, datetime DESC)
    INCLUDE (driver, speed, x, y, heading, ignition, aircon, door_up, door_down, working);
END;
GO

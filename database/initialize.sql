:ON ERROR EXIT

IF DB_ID(N'BusGPS') IS NULL
BEGIN
    CREATE DATABASE BusGPS;
END;
GO

USE BusGPS;
GO

IF OBJECT_ID(N'dbo.bus_waypoints', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.bus_waypoints (
        vehicle varchar(128) NOT NULL,
        speed float NULL,
        datetime datetime2 NOT NULL,
        x float NOT NULL,
        y float NOT NULL,
        heading float NULL,
        ignition bit NULL,
        aircon bit NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.bus_waypoints)
BEGIN
    IF OBJECT_ID(N'dbo.bus_waypoints_import', N'U') IS NOT NULL
    BEGIN
        DROP TABLE dbo.bus_waypoints_import;
    END;

    CREATE TABLE dbo.bus_waypoints_import (
        vehicle varchar(128) NULL,
        datetime varchar(64) NULL,
        x varchar(64) NULL,
        y varchar(64) NULL,
        speed varchar(64) NULL,
        heading varchar(64) NULL,
        ignition varchar(16) NULL,
        aircon varchar(16) NULL,
        door_up varchar(16) NULL,
        door_down varchar(16) NULL,
        driver varchar(128) NULL
    );

    BULK INSERT dbo.bus_waypoints_import
    FROM '/import/bus_waypoints.csv'
    WITH (
        FORMAT = 'CSV',
        FIRSTROW = 2,
        FIELDQUOTE = '"',
        ROWTERMINATOR = '0x0a',
        TABLOCK
    );

    INSERT INTO dbo.bus_waypoints (
        vehicle,
        speed,
        datetime,
        x,
        y,
        heading,
        ignition,
        aircon
    )
    SELECT
        NULLIF(LTRIM(RTRIM(vehicle)), ''),
        TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(speed)), '')),
        TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(datetime)), '')),
        TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(x)), '')),
        TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(y)), '')),
        TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(heading)), '')),
        CASE LOWER(NULLIF(LTRIM(RTRIM(ignition)), ''))
            WHEN 'true' THEN 1
            WHEN '1' THEN 1
            WHEN 'false' THEN 0
            WHEN '0' THEN 0
            ELSE NULL
        END,
        CASE LOWER(NULLIF(LTRIM(RTRIM(aircon)), ''))
            WHEN 'true' THEN 1
            WHEN '1' THEN 1
            WHEN 'false' THEN 0
            WHEN '0' THEN 0
            ELSE NULL
        END
    FROM dbo.bus_waypoints_import
    WHERE NULLIF(LTRIM(RTRIM(vehicle)), '') IS NOT NULL
      AND TRY_CONVERT(datetime2, NULLIF(LTRIM(RTRIM(datetime)), '')) IS NOT NULL
      AND TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(x)), '')) IS NOT NULL
      AND TRY_CONVERT(float, NULLIF(LTRIM(RTRIM(y)), '')) IS NOT NULL;

    DROP TABLE dbo.bus_waypoints_import;
END;
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
        INCLUDE (speed, x, y, heading, ignition, aircon);
END;
GO

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

USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'bus_app')
BEGIN
    CREATE LOGIN bus_app
        WITH PASSWORD = '$(APP_DB_PASSWORD)',
        CHECK_POLICY = ON;
END;
GO

USE BusGPS;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'bus_app')
BEGIN
    CREATE USER bus_app FOR LOGIN bus_app;
END;
GO

IF IS_ROLEMEMBER(N'db_datareader', N'bus_app') <> 1
BEGIN
    ALTER ROLE db_datareader ADD MEMBER bus_app;
END;
GO

SELECT
    COUNT_BIG(*) AS imported_rows,
    MIN(datetime) AS first_record,
    MAX(datetime) AS last_record
FROM dbo.bus_waypoints;
GO

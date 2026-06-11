/**
 * Microsoft SQL Server repository implementation for bus waypoint data access.
 */

import sql from "mssql";
import { config } from "../config/env";
import pool from "../db/connection";
import type {
  BusRecord,
  StatsSummary,
} from "../models/types";
import type { IBusRepository } from "./IBusRepository";

type BusRecordRow = Omit<
  BusRecord,
  | "speed"
  | "datetime"
  | "x"
  | "y"
  | "heading"
  | "ignition"
  | "aircon"
  | "door_up"
  | "door_down"
  | "working"
> & {
  speed: number | string | null;
  datetime: number | string | null;
  x: number | string | null;
  y: number | string | null;
  heading: number | string | null;
  ignition: boolean | number | null;
  aircon: boolean | number | null;
  door_up: boolean | number | null;
  door_down: boolean | number | null;
  working: boolean | number | null;
};

type StatsSummaryRow = {
  totalRecords: number | string;
  totalVehicles: number | string;
  avgSpeed: number | string | null;
  activeVehicles: number | string;
};

type PlaybackDurationRow = {
  durationSeconds: number | string | null;
};

function resolveTableName(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(value)) {
    throw new Error(`Invalid DB_BUS_TABLE value: ${value}`);
  }

  return value
    .split(".")
    .map((part) => `[${part}]`)
    .join(".");
}

const BUS_TABLE = resolveTableName(config.DB_BUS_TABLE);
function toNumber(value: number | string | null): number {
  if (value === null || value === "") {
    return 0;
  }

  return Number(value);
}

function toBoolean(value: boolean | number | null): boolean {
  return value === true || value === 1;
}

function toBusRecord(row: BusRecordRow): BusRecord {
  return {
    ...row,
    speed: toNumber(row.speed),
    datetime: toNumber(row.datetime),
    x: toNumber(row.x),
    y: toNumber(row.y),
    heading: toNumber(row.heading),
    ignition: toBoolean(row.ignition),
    aircon: toBoolean(row.aircon),
    door_up: toBoolean(row.door_up),
    door_down: toBoolean(row.door_down),
    working: toBoolean(row.working),
  };
}

function toStatsSummary(row: StatsSummaryRow): StatsSummary {
  return {
    totalRecords: toNumber(row.totalRecords),
    totalVehicles: toNumber(row.totalVehicles),
    avgSpeed: toNumber(row.avgSpeed),
    activeVehicles: toNumber(row.activeVehicles),
  };
}

function busWaypointSelect(): string {
  return `
    CAST(vehicle AS varchar(128)) AS vehicle,
    COALESCE(CAST(driver AS varchar(128)), '') AS driver,
    COALESCE(CAST(speed AS float), 0) AS speed,
    DATEDIFF_BIG(millisecond, CONVERT(datetime2, '1970-01-01'), CAST(datetime AS datetime2)) AS datetime,
    CAST(y AS float) AS x,
    CAST(x AS float) AS y,
    COALESCE(CAST(heading AS float), 0) AS heading,
    CAST(COALESCE(ignition, 0) AS bit) AS ignition,
    CAST(COALESCE(aircon, 0) AS bit) AS aircon,
    CAST(COALESCE(door_up, 0) AS bit) AS door_up,
    CAST(COALESCE(door_down, 0) AS bit) AS door_down,
    CAST(COALESCE(working, ignition, 0) AS bit) AS working
  `;
}

export class MssqlBusRepository implements IBusRepository {
  public async fetchPlaybackDurationSeconds(): Promise<number | undefined> {
    const result = await pool.request().query<PlaybackDurationRow>(`
      SELECT MAX(durationSeconds) AS durationSeconds
      FROM (
        SELECT DATEDIFF(second, MIN(datetime), MAX(datetime)) AS durationSeconds
        FROM ${BUS_TABLE}
        GROUP BY vehicle
      ) vehicleDurations
    `);

    const row = result.recordset[0];
    if (row?.durationSeconds === null) {
      return undefined;
    }

    return toNumber(row.durationSeconds);
  }

  public async fetchSnapshot(
    playbackElapsedSeconds: number,
    activeWindowSeconds: number,
  ): Promise<BusRecord[]> {
    const result = await pool
      .request()
      .input("elapsedSeconds", sql.Int, playbackElapsedSeconds)
      .input("activeWindowSeconds", sql.Int, activeWindowSeconds)
      .query<BusRecordRow>(`
        WITH vehicleBounds AS (
          SELECT
            vehicle,
            MIN(datetime) AS startTime,
            DATEDIFF(second, MIN(datetime), MAX(datetime)) AS durationSeconds
          FROM ${BUS_TABLE}
          GROUP BY vehicle
        ),
        vehicleTargets AS (
          SELECT
            vehicle,
            DATEADD(
              second,
              CASE
                WHEN durationSeconds > 0
                  THEN @elapsedSeconds % (durationSeconds + 1)
                ELSE 0
              END,
              startTime
            ) AS targetTime
          FROM vehicleBounds
        ),
        ranked AS (
          SELECT
            bus.*,
            ROW_NUMBER() OVER (
              PARTITION BY bus.vehicle
              ORDER BY bus.datetime DESC
            ) AS row_num
          FROM ${BUS_TABLE} bus
          INNER JOIN vehicleTargets target ON target.vehicle = bus.vehicle
          WHERE bus.datetime > DATEADD(
              second,
              -@activeWindowSeconds,
              target.targetTime
            )
            AND bus.datetime <= target.targetTime
        )
        SELECT
          ${busWaypointSelect()}
        FROM ranked
        WHERE row_num = 1
        ORDER BY vehicle ASC
      `);

    console.log(
      `[query] fetchSnapshot table=${config.DB_BUS_TABLE} elapsed=${playbackElapsedSeconds}s window=${activeWindowSeconds}s vehicles=${result.recordset.length}`,
    );

    return result.recordset.map(toBusRecord);
  }

  public async fetchLatest(): Promise<BusRecord[]> {
    const result = await pool.request().query<BusRecordRow>(`
      SELECT
        ${busWaypointSelect()}
      FROM (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY vehicle ORDER BY datetime DESC) AS row_num
        FROM ${BUS_TABLE}
      ) latest
      WHERE row_num = 1
      ORDER BY datetime DESC
    `);

    console.log(`[query] fetchLatest table=${config.DB_BUS_TABLE} rows=${result.recordset.length}`);

    return result.recordset.map(toBusRecord);
  }

  public async fetchTrajectory(vehicleId: string, limit: number): Promise<BusRecord[]> {
    const result = await pool
      .request()
      .input("vehicleId", sql.VarChar(128), vehicleId)
      .input("limit", sql.Int, limit)
      .query<BusRecordRow>(`
        SELECT
          ${busWaypointSelect()}
        FROM (
          SELECT TOP (@limit)
            *
          FROM ${BUS_TABLE}
          WHERE vehicle = @vehicleId
          ORDER BY datetime DESC
        ) recent
        ORDER BY datetime ASC
      `);

    console.log(
      `[query] fetchTrajectory table=${config.DB_BUS_TABLE} vehicle=${vehicleId} limit=${limit} rows=${result.recordset.length}`,
    );

    return result.recordset.map(toBusRecord);
  }

  public async fetchStats(): Promise<StatsSummary> {
    const result = await pool.request().query<StatsSummaryRow>(`
      SELECT
        (SELECT COUNT(*) FROM ${BUS_TABLE}) AS totalRecords,
        (SELECT COUNT(DISTINCT vehicle) FROM ${BUS_TABLE}) AS totalVehicles,
        (SELECT AVG(CAST(speed AS float)) FROM ${BUS_TABLE} WHERE speed IS NOT NULL) AS avgSpeed,
        (SELECT COUNT(DISTINCT vehicle) FROM ${BUS_TABLE} WHERE COALESCE(working, ignition, 0) = 1) AS activeVehicles
    `);

    console.log(`[query] fetchStats table=${config.DB_BUS_TABLE} rows=1`);

    return toStatsSummary(result.recordset[0]);
  }
}

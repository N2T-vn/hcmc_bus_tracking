/**
 * Microsoft SQL Server repository for indexed bus waypoint access.
 */

import sql from "mssql";
import { config } from "../config/env";
import pool from "../db/connection";
import type { BusRecord, PlaybackRange } from "../models/types";
import type { IBusRepository } from "./IBusRepository";

type BusRecordRow = {
  vehicle: string;
  speed: number | string | null;
  datetime: number | string;
  x: number | string;
  y: number | string;
  heading: number | string | null;
  ignition: boolean | number | null;
  aircon: boolean | number | null;
};

type PlaybackRangeRow = {
  startTimestamp: number | string | null;
  endTimestamp: number | string | null;
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

const BUS_TABLE = resolveTableName(config.DB_BUS_TABLE); // Validated and SQL-escaped table name.
const TIME_INDEX = "IX_bus_waypoints_datetime_vehicle"; // Global datetime-window seeks.
const VEHICLE_TIME_INDEX = "IX_bus_waypoints_vehicle_datetime"; // One-bus trail seeks.

function toNumber(value: number | string): number {
  return Number(value);
}

function toNullableNumber(value: number | string | null): number | null {
  // Preserve absent sensor values instead of turning them into a misleading zero.
  return value === null || value === "" ? null : Number(value);
}

function toNullableBoolean(value: boolean | number | null): boolean | null {
  if (value === null) {
    return null;
  }

  return value === true || value === 1;
}

function toBusRecord(row: BusRecordRow): BusRecord {
  return {
    vehicle: row.vehicle,
    speed: toNullableNumber(row.speed),
    datetime: toNumber(row.datetime),
    x: toNumber(row.x),
    y: toNumber(row.y),
    heading: toNullableNumber(row.heading),
    ignition: toNullableBoolean(row.ignition),
    aircon: toNullableBoolean(row.aircon),
  };
}

function busWaypointSelect(alias = ""): string {
  const column = (name: string): string => (alias ? `${alias}.${name}` : name);

  return `
    CAST(${column("vehicle")} AS varchar(128)) AS vehicle,
    CAST(${column("speed")} AS float) AS speed,
    DATEDIFF_BIG(
      millisecond,
      CONVERT(datetime2, '1970-01-01'),
      CAST(${column("datetime")} AS datetime2)
    ) AS datetime,
    CAST(${column("x")} AS float) AS x,
    CAST(${column("y")} AS float) AS y,
    CAST(${column("heading")} AS float) AS heading,
    CAST(${column("ignition")} AS bit) AS ignition,
    CAST(${column("aircon")} AS bit) AS aircon
  `;
}

export class MssqlBusRepository implements IBusRepository {
  public async fetchPlaybackRange(): Promise<PlaybackRange | undefined> {
    const result = await pool.request().query<PlaybackRangeRow>(`
      SELECT
        DATEDIFF_BIG(
          millisecond,
          CONVERT(datetime2, '1970-01-01'),
          MIN(datetime)
        ) AS startTimestamp,
        DATEDIFF_BIG(
          millisecond,
          CONVERT(datetime2, '1970-01-01'),
          MAX(datetime)
        ) AS endTimestamp
      FROM ${BUS_TABLE} WITH (INDEX(${TIME_INDEX}))
    `);
    const row = result.recordset[0];

    if (row?.startTimestamp === null || row?.endTimestamp === null) {
      return undefined;
    }

    return {
      startTimestamp: toNumber(row.startTimestamp),
      endTimestamp: toNumber(row.endTimestamp),
    };
  }

  public async fetchWindow(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<BusRecord[]> {
    const result = await pool
      .request()
      .input("windowStart", sql.DateTime2, new Date(startTimestamp))
      .input("windowEnd", sql.DateTime2, new Date(endTimestamp))
      .query<BusRecordRow>(`
        SELECT
          ${busWaypointSelect()}
        FROM ${BUS_TABLE} WITH (INDEX(${TIME_INDEX}))
        -- A half-open range prevents a boundary ping from appearing in two ticks.
        WHERE datetime >= @windowStart
          AND datetime < @windowEnd
        -- Chronological rows let the frontend retain the last ping per vehicle.
        ORDER BY datetime ASC, vehicle ASC
      `);

    console.log(
      `[query] fetchWindow start=${new Date(startTimestamp).toISOString()} end=${new Date(endTimestamp).toISOString()} rows=${result.recordset.length}`,
    );
    return result.recordset.map(toBusRecord);
  }

  public async fetchTrajectory(
    vehicleId: string,
    targetTimestamp: number,
    windowSeconds: number,
    limit: number,
  ): Promise<BusRecord[]> {
    // Bound both time and point count to avoid loading a vehicle's full history.
    const result = await pool
      .request()
      .input("vehicleId", sql.VarChar(128), vehicleId)
      .input("targetTime", sql.DateTime2, new Date(targetTimestamp))
      .input("windowSeconds", sql.Int, windowSeconds)
      .input("limit", sql.Int, limit)
      .query<BusRecordRow>(`
        SELECT
          ${busWaypointSelect("recent")}
        FROM (
          SELECT TOP (@limit)
            *
          FROM ${BUS_TABLE} WITH (INDEX(${VEHICLE_TIME_INDEX}))
          WHERE vehicle = @vehicleId
            AND datetime > DATEADD(second, -@windowSeconds, @targetTime)
            AND datetime <= @targetTime
          ORDER BY datetime DESC
        ) recent
        ORDER BY datetime ASC
      `);

    return result.recordset.map(toBusRecord);
  }
}

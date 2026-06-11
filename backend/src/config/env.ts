/**
 * Reads environment variables and exposes typed backend configuration.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../backend/.env"), quiet: true });

export type AuthMode = "windows" | "sql";

export interface AppConfig {
  DB_SERVER: string;
  DB_DRIVER: string;
  DB_DATABASE: string;
  DB_BUS_TABLE: string;
  DB_AUTH_MODE: AuthMode;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_PORT: number | undefined;
  DB_ENCRYPT: boolean;
  DB_TRUST_CERT: boolean;
  DB_REQUEST_TIMEOUT_MS: number;
  PLAYBACK_STEP_SECONDS: number;
  PLAYBACK_ACTIVE_WINDOW_SECONDS: number;
  PORT: number;
  CORS_ORIGIN: string;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function parseServerName(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\\\\/g, "\\");
}

export const config: AppConfig = {
  DB_SERVER: parseServerName(process.env.DB_SERVER, "localhost\\SQLEXPRESS"),
  DB_DRIVER: process.env.DB_DRIVER ?? "ODBC Driver 18 for SQL Server",
  DB_DATABASE: process.env.DB_DATABASE ?? "BusGPS",
  DB_BUS_TABLE: process.env.DB_BUS_TABLE ?? "dbo.bus_waypoints",
  DB_AUTH_MODE: (process.env.DB_AUTH_MODE ?? "windows") as AuthMode,
  DB_USER: process.env.DB_USER ?? "",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "",
  DB_PORT:
    process.env.DB_PORT === undefined || process.env.DB_PORT.trim() === ""
      ? undefined
      : parseNumber(process.env.DB_PORT, 1433),
  DB_ENCRYPT: parseBoolean(process.env.DB_ENCRYPT, false),
  DB_TRUST_CERT: parseBoolean(process.env.DB_TRUST_CERT, true),
  DB_REQUEST_TIMEOUT_MS: parseNumber(process.env.DB_REQUEST_TIMEOUT_MS, 30000),
  PLAYBACK_STEP_SECONDS: parseNumber(process.env.PLAYBACK_STEP_SECONDS, 5),
  PLAYBACK_ACTIVE_WINDOW_SECONDS: parseNumber(
    process.env.PLAYBACK_ACTIVE_WINDOW_SECONDS,
    300,
  ),
  PORT: parseNumber(process.env.PORT, 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};

/*
 * backend/.env
 * DB_SERVER=localhost\SQLEXPRESS
 * DB_DRIVER=ODBC Driver 18 for SQL Server
 * DB_DATABASE=BusGPS
 * DB_BUS_TABLE=dbo.bus_waypoints
 * DB_AUTH_MODE=windows
 * PORT=3001
 * CORS_ORIGIN=http://localhost:5173
 */

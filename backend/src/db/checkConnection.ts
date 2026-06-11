/**
 * One-shot database smoke check for local Phase 1 verification.
 */

import { connectDB } from "./connection";
import pool from "./connection";
import { config } from "../config/env";

function resolveTableName(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(value)) {
    throw new Error(`Invalid DB_BUS_TABLE value: ${value}`);
  }

  return value
    .split(".")
    .map((part) => `[${part}]`)
    .join(".");
}

async function checkConnection(): Promise<void> {
  try {
    await connectDB();

    const tableName = resolveTableName(config.DB_BUS_TABLE);
    const result = await pool.request().query(`
      SELECT TOP (1)
        vehicle,
        driver,
        speed,
        datetime,
        x,
        y,
        heading,
        ignition,
        aircon,
        door_up,
        door_down,
        working
      FROM ${tableName}
      ORDER BY datetime ASC
    `);

    console.log(`Database smoke check passed. Rows returned: ${result.recordset.length}`);
  } catch (error) {
    console.error("Database smoke check failed", error);
    process.exitCode = 1;
  } finally {
    await pool.close();
  }
}

void checkConnection();

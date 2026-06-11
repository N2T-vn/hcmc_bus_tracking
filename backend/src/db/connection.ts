/**
 * Sets up the Microsoft SQL Server connection pool using .env configuration.
 */

import sql from "mssql";
import { config } from "../config/env";

function buildServerName(): string {
  if (config.DB_PORT !== undefined) {
    const [host] = config.DB_SERVER.split("\\");
    return `${host},${config.DB_PORT}`;
  }

  return config.DB_SERVER;
}

function buildSqlAuthServerName(): string {
  const [host] = config.DB_SERVER.split("\\");
  return host;
}

function buildConnectionString(): string {
  const auth =
    config.DB_AUTH_MODE === "windows"
      ? "Trusted_Connection=yes"
      : `Uid=${config.DB_USER};Pwd=${config.DB_PASSWORD}`;

  return [
    `Driver={${config.DB_DRIVER}}`,
    `Server=${buildServerName()}`,
    `Database=${config.DB_DATABASE}`,
    auth,
    `Encrypt=${config.DB_ENCRYPT ? "yes" : "no"}`,
    `TrustServerCertificate=${config.DB_TRUST_CERT ? "yes" : "no"}`,
  ].join(";");
}

const windowsAuthConfig = {
  connectionString: buildConnectionString(),
  requestTimeout: config.DB_REQUEST_TIMEOUT_MS,
} as unknown as sql.config;

const sqlAuthConfig: sql.config = {
  server: buildSqlAuthServerName(),
  database: config.DB_DATABASE,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  port: config.DB_PORT,
  requestTimeout: config.DB_REQUEST_TIMEOUT_MS,
  options: {
    encrypt: config.DB_ENCRYPT,
    trustServerCertificate: config.DB_TRUST_CERT,
  },
};

function createPool(): sql.ConnectionPool {
  if (config.DB_AUTH_MODE === "windows") {
    const msnodesql = require("mssql/msnodesqlv8") as typeof sql;
    return new msnodesql.ConnectionPool(windowsAuthConfig) as sql.ConnectionPool;
  }

  return new sql.ConnectionPool(sqlAuthConfig);
}

const pool = createPool();

export async function connectDB(): Promise<void> {
  try {
    await pool.connect();
    console.log("Connected to SQL Server");
  } catch (error) {
    console.error("Failed to connect to SQL Server", error);
    throw error;
  }
}

export default pool;

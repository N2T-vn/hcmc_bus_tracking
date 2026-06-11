/**
 * Type declaration shim for the mssql Windows Authentication driver entry point.
 */

declare module "mssql/msnodesqlv8" {
  import mssql = require("mssql");
  export = mssql;
}

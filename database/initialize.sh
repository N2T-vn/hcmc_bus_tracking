#!/bin/bash
set -euo pipefail

if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
  SQLCMD=/opt/mssql-tools18/bin/sqlcmd
else
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
fi

until "$SQLCMD" \
  -S db \
  -U sa \
  -P "$MSSQL_SA_PASSWORD" \
  -Q "SELECT 1" \
  -b \
  -C >/dev/null 2>&1; do
  echo "Waiting for SQL Server..."
  sleep 5
done

echo "Initializing BusGPS and importing the dataset when the table is empty..."

"$SQLCMD" \
  -S db \
  -U sa \
  -P "$MSSQL_SA_PASSWORD" \
  -b \
  -C \
  -v APP_DB_PASSWORD="$APP_DB_PASSWORD" \
  -i /init/initialize.sql

echo "Database initialization completed."

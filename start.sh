#!/bin/sh
set -e

# Wait for MySQL to be reachable before starting the app.
# This prevents startup failures when the VPS restarts and MySQL
# takes a few seconds longer to be ready than the app container.
node -e "
const net = require('net');
const url = process.env.DATABASE_URL || '';
const match = url.match(/@([^:/]+):?(\d+)?/);
const host = match ? match[1] : 'localhost';
const port = match && match[2] ? parseInt(match[2]) : 3306;

let attempt = 0;
function check() {
  attempt++;
  process.stdout.write('Waiting for database at ' + host + ':' + port + ' (attempt ' + attempt + ')...\n');
  const sock = net.connect({ host: host, port: port });
  sock.setTimeout(3000);
  sock.on('connect', function() {
    sock.destroy();
    process.stdout.write('Database is ready!\n');
    process.exit(0);
  });
  sock.on('error', function() {
    sock.destroy();
    setTimeout(check, 2000);
  });
  sock.on('timeout', function() {
    sock.destroy();
    setTimeout(check, 2000);
  });
}
check();
"

exec node server.js

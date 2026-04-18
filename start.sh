#!/bin/sh
set -e

# Wait for MySQL to be reachable before starting the app.
# Prevents "Service not reachable" on VPS restart when MySQL starts slower than the app.
node -e "
const net = require('net');
const url = process.env.DATABASE_URL || '';
const match = url.match(/@([^:/]+):?(\d+)?/);
const host = match ? match[1] : 'localhost';
const port = match && match[2] ? parseInt(match[2]) : 3306;
const maxWaitMs = 120000;
const startTime = Date.now();

function check() {
  const elapsed = Date.now() - startTime;
  if (elapsed >= maxWaitMs) {
    process.stdout.write('Database did not become ready within 120s, starting anyway...\n');
    process.exit(0);
  }
  const attempt = Math.floor(elapsed / 2000) + 1;
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

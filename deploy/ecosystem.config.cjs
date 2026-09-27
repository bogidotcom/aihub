// pm2 process for the Thermopolium API (hk runs everything else under pm2 too).
// Secrets live in /opt/thermopolium/server/.env; anything set here takes precedence over it.
module.exports = {
  apps: [{
    name: 'thermopolium',
    cwd: '/opt/thermopolium/server',
    script: 'index.js',
    node_args: '--disable-warning=ExperimentalWarning',   // node:sqlite is stable enough for this; keep logs readable
    env: { NODE_ENV: 'production', PORT: '3460', DB_PATH: '/var/lib/thermopolium/thermopolium.db' },
    max_restarts: 20,
    restart_delay: 3000,
    time: true,
  }],
}

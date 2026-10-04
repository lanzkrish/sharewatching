const path = require("path");

module.exports = {
  apps: [
    {
      name: "sharewatching-server",
      cwd: __dirname,
      script: path.join(__dirname, "index.js"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "3s",
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
        PORT: 5008,
      },
    },
  ],
};

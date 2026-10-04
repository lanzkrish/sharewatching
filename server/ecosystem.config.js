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
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
        PORT: 5001,
        CORS_ORIGIN: "*",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5001,
        CORS_ORIGIN: "*",
      },
      error_file: path.join(__dirname, "logs", "pm2-err.log"),
      out_file: path.join(__dirname, "logs", "pm2-out.log"),
      time: true,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "sharewatching-server",
      script: "index.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
        CORS_ORIGIN: "*",
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "aithinkers",
      script: "server.js",
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: process.env.PM2_EXEC_MODE || "fork",
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || "512M",
      time: true,
      env: {
        HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};

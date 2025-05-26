module.exports = {
  apps : [{
    name: "talinara-websocket",
    script: "server.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 8080
    },
    max_memory_restart: '200M'
  }]
}; 
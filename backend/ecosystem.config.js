export default {
  apps: [{
    name: 'gmc-audit',
    script: 'server.js',
    instances: 1,
    max_memory_restart: '500M',
    env: { PORT: 3001, NODE_ENV: 'production' },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,
  }],
};

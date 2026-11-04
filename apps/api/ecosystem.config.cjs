module.exports = {
  apps: [
    {
      name: 'stanforte-portal-api',
      script: 'dist/server.js',
      node_args: '-r ./path-alias-register.cjs',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};

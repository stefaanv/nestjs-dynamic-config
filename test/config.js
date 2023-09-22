exports.default = () => ({
  appName: '{{ENV_APP_NAME}}',
  version: '{{pkg.version}}',
  length: 100,
  database: {
    host: 'myHost',
    user: 'root',
  },
})

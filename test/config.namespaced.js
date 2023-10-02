exports.default = () =>
  registerAs('namespaced', () => ({
    host: 'hostname',
    port: 12345,
  }))

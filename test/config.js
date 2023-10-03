;(() => ({
  name: 'some-name3',
  length: 100,
  database: {
    host: '{{ENV_DATABASE_HOST}}',
    user: '{{ENV_DATABASE_USER}}',
    password: '{{ENV_DATABASE_PASSWORD}}',
    database: 'my-great-database',
    debug: '{{ENV_NODE_ENV}}'.startsWith('dev') ? true : false,
  },
  appName: '{{pkg.name}}',
  author: '{{pkg.author}}',
  version: '{{pkg.version}}',
}))()

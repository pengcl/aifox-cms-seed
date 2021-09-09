module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'mysql',
        host: env('DATABASE_HOST', '120.24.88.190'),
        port: env.int('DATABASE_PORT', 33306),
        database: env('DATABASE_NAME', 'aiFox_cms'),
        username: env('DATABASE_USERNAME', 'root'),
        password: env('DATABASE_PASSWORD', 'Aifox2019*'),
        ssl: env.bool('DATABASE_SSL', false),
      },
      options: {}
    },
  },
});

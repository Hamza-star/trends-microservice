export default (): { configuration: { databaseName: string; adminToken: string } } => ({
  configuration: {
    databaseName: process.env.CONFIG_DB_NAME ?? '',
    adminToken: process.env.CONFIG_ADMIN_TOKEN ?? '',
  },
});
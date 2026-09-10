export interface TrendsConfig {
  mongoUri: string;
}

export default (): { trends: TrendsConfig } => ({
  trends: {
    mongoUri: process.env.MONGO_URI ?? '',
  },
});

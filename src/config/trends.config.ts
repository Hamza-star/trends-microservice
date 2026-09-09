export interface TrendsConfig {
  mongoUri: string;
  databaseName: string;
  collections: string[];
  projectCollections: Record<string, string[]>;
}

function parseProjectCollections(value: string): Record<string, string[]> {
  return Object.fromEntries(
    value
      .split(',')
      .map((entry) => {
        const separatorIndex = entry.indexOf(':');
        const project = separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : '';
        const collections = separatorIndex >= 0
          ? entry.slice(separatorIndex + 1).split('|').map((collection) => collection.trim()).filter(Boolean)
          : [];

        return [project, collections] as const;
      })
      .filter(([project, collections]) => project && collections.length),
  );
}

export default (): { trends: TrendsConfig } => ({
  trends: {
    mongoUri: process.env.MONGO_URI ?? '',
    databaseName: process.env.MONGO_DB_NAME ?? '',
    collections: (process.env.TRENDS_COLLECTIONS ?? '')
      .split(',')
      .map((collection) => collection.trim())
      .filter(Boolean),
    projectCollections: parseProjectCollections(
      process.env.TRENDS_PROJECT_COLLECTIONS ?? '',
    ),
  },
});
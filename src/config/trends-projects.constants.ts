import type { ProjectConfig } from './trends.config';

export const TRENDS_PROJECTS: Record<string, ProjectConfig> = {
  packages: {
    dbName: 'Packages',
    collections: ['historical_z1', 'historical_z2', 'historical_z3'],
  },
  surajcotton: {
    dbName: 'surajcotton',
    collections: ['historical'],
  },
};
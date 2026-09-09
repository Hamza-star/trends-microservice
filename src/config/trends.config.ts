export interface ProjectConfig {
  dbName: string;
  collections: string[];
}

export interface TrendsConfig {
  mongoUri: string;
  projects: Record<string, ProjectConfig>;
}
import { TRENDS_PROJECTS } from './trends-projects.constants';

export default (): { trends: TrendsConfig } => ({
  trends: {
    mongoUri: process.env.MONGO_URI ?? '',
    projects: TRENDS_PROJECTS,
  },
});

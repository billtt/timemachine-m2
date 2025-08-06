import { format } from 'date-fns';

export const getVersionInfo = () => {
  try {
    const { gitSha, buildTime } = __BUILD_INFO__;
    const buildDate = new Date(buildTime);
    
    return {
      version: `${format(buildDate, 'yyyy.MM.dd.HHmm')}-${gitSha}`,
      buildDate: format(buildDate, 'PPpp'), // "Jan 1, 2024 at 2:30 PM"
      gitSha,
      shortVersion: `${format(buildDate, 'MMdd.HHmm')}-${gitSha}`
    };
  } catch (error) {
    console.warn('Build info not available:', error);
    return {
      version: 'dev-build',
      buildDate: 'Development',
      gitSha: 'unknown',
      shortVersion: 'dev'
    };
  }
};
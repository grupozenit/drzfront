export { useReports } from './useReports';
export { useDashboard } from './useDashboard';
export { useBaseline } from './useBaseline';
export { useOfflineStatus } from './useOfflineStatus';
export { useOfflineReports } from './useOfflineReports';
export { useWeeklyReports } from './useWeeklyReports';

// Re-exportar hooks del context
export {
  useApp,
  useProjects,
  useCompany,
  useTeam,
  useMachinery,
  useEquipment,
  useSelectedProject,
} from '@/lib/contexts/AppContext';


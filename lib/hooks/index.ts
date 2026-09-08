export { useViewMode } from './useViewMode';
export { useReports } from './useReports';
export { useDashboard } from './useDashboard';
export { useProjectTotals } from './useProjectTotals';
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
  useDrivers,
  useSelectedProject,
  usePermissions,
} from '@/lib/contexts/AppContext';


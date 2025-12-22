import { useMemo, useState } from 'react';
import type { Mission, MissionStatus } from '@/types/missions.types';

export interface UseMissionFiltersOptions {
  missions: Mission[];
}

export function useMissionFilters({ missions }: UseMissionFiltersOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

  const filteredMissions = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    return missions
      .filter((mission) => {
        const matchesSearch = normalizedSearch
          ? mission.mission_name.toLowerCase().includes(normalizedSearch) ||
            mission.notes?.toLowerCase().includes(normalizedSearch)
          : true;
        const matchesStatus = statusFilter === 'ALL' ? true : mission.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
      });
  }, [missions, searchTerm, statusFilter, sortOrder]);

  const statusCounts = useMemo(() => {
    return missions.reduce<Record<string, number>>((acc, mission) => {
      const status = mission.status || 'DRAFT';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [missions]);

  const hasFiltersApplied =
    searchTerm.trim().length > 0 || statusFilter !== 'ALL' || sortOrder !== 'recent';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortOrder('recent');
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    filteredMissions,
    statusCounts,
    hasFiltersApplied,
    resetFilters,
  };
}

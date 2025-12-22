/**
 * Global Search Service
 * 
 * This module provides search functionality across all entities in the application.
 * To extend search to include real data, uncomment and implement the search methods
 * in your respective service files.
 */

import { missionsService } from "./missions.service";
import { dronesService } from "./drones.service";
// Import other services as needed

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "missions" | "drones" | "geofences" | "checklists" | "maintenance";
  href: string;
}

/**
 * Search across missions
 * Add this method to missions.service.ts:
 * 
 * async search(query: string): Promise<Mission[]> {
 *   const response = await api.get<Mission[]>(`/missions/search?q=${encodeURIComponent(query)}`);
 *   return response.data;
 * }
 */
export async function searchMissions(query: string): Promise<SearchResultItem[]> {
  try {
    // TODO: Implement actual API search when endpoint is available
    // const missions = await missionsService.search(query);
    // return missions.map(m => ({
    //   id: m.id,
    //   title: m.mission_name,
    //   subtitle: m.notes || `Status: ${m.status}`,
    //   category: "missions" as const,
    //   href: `/missions/${m.id}`,
    // }));
    return [];
  } catch (error) {
    console.error("Mission search error:", error);
    return [];
  }
}

/**
 * Search across drones/fleet
 * Add this method to drones.service.ts:
 * 
 * async search(query: string): Promise<Drone[]> {
 *   const response = await api.get<Drone[]>(`/drones/search?q=${encodeURIComponent(query)}`);
 *   return response.data;
 * }
 */
export async function searchDrones(query: string): Promise<SearchResultItem[]> {
  try {
    // TODO: Implement actual API search when endpoint is available
    // const drones = await dronesService.search(query);
    // return drones.map(d => ({
    //   id: d.id,
    //   title: d.serial_number || d.model,
    //   subtitle: `${d.status} - ${d.model}`,
    //   category: "drones" as const,
    //   href: `/fleet/${d.id}`,
    // }));
    return [];
  } catch (error) {
    console.error("Drone search error:", error);
    return [];
  }
}

/**
 * Search across geofences
 * Add this method to geofences.service.ts:
 * 
 * async search(query: string): Promise<Geofence[]> {
 *   const response = await api.get<Geofence[]>(`/geofences/search?q=${encodeURIComponent(query)}`);
 *   return response.data;
 * }
 */
export async function searchGeofences(query: string): Promise<SearchResultItem[]> {
  try {
    // TODO: Implement actual API search when endpoint is available
    // const geofences = await geofencesService.search(query);
    // return geofences.map(g => ({
    //   id: g.id,
    //   title: g.area_name,
    //   subtitle: `Type: ${g.type}`,
    //   category: "geofences" as const,
    //   href: `/geofences?selected=${g.id}`,
    // }));
    return [];
  } catch (error) {
    console.error("Geofence search error:", error);
    return [];
  }
}

/**
 * Search across checklists
 * Add this method to checklists.service.ts:
 * 
 * async search(query: string): Promise<Checklist[]> {
 *   const response = await api.get<Checklist[]>(`/checklists/search?q=${encodeURIComponent(query)}`);
 *   return response.data;
 * }
 */
export async function searchChecklists(query: string): Promise<SearchResultItem[]> {
  try {
    // TODO: Implement actual API search when endpoint is available
    // const checklists = await checklistsService.search(query);
    // return checklists.map(c => ({
    //   id: c.id,
    //   title: c.title,
    //   subtitle: `Type: ${c.type}`,
    //   category: "checklists" as const,
    //   href: `/checklists/${c.id}`,
    // }));
    return [];
  } catch (error) {
    console.error("Checklist search error:", error);
    return [];
  }
}

/**
 * Search across maintenance logs
 * Add this method to maintenance.service.ts:
 * 
 * async search(query: string): Promise<MaintenanceLog[]> {
 *   const response = await api.get<MaintenanceLog[]>(`/maintenance/search?q=${encodeURIComponent(query)}`);
 *   return response.data;
 * }
 */
export async function searchMaintenance(query: string): Promise<SearchResultItem[]> {
  try {
    // TODO: Implement actual API search when endpoint is available
    // const logs = await maintenanceService.search(query);
    // return logs.map(l => ({
    //   id: l.id,
    //   title: `Maintenance for ${l.drone_id}`,
    //   subtitle: l.notes,
    //   category: "maintenance" as const,
    //   href: `/maintenance?log=${l.id}`,
    // }));
    return [];
  } catch (error) {
    console.error("Maintenance search error:", error);
    return [];
  }
}

/**
 * Perform global search across all categories
 */
export async function globalSearch(query: string): Promise<SearchResultItem[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const [missions, drones, geofences, checklists, maintenance] = await Promise.all([
      searchMissions(query),
      searchDrones(query),
      searchGeofences(query),
      searchChecklists(query),
      searchMaintenance(query),
    ]);

    return [...missions, ...drones, ...geofences, ...checklists, ...maintenance];
  } catch (error) {
    console.error("Global search error:", error);
    return [];
  }
}

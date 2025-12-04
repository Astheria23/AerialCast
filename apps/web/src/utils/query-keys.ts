export const queryKeys = {
  auth: ['auth'] as const,
  drones: {
    all: ['drones'] as const,
    detail: (id: string) => ['drones', id] as const,
  },
  checklists: {
    all: ['checklists'] as const,
    detail: (id: string) => ['checklists', id] as const,
  },
  missions: {
    all: ['missions'] as const,
    detail: (id: string) => ['missions', id] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    detail: (id: string) => ['sessions', id] as const,
    replay: (id: string) => ['sessions', id, 'replay'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    detail: (id: string) => ['alerts', id] as const,
    bySession: (id: string) => ['alerts', 'sessions', id] as const,
  },
  maintenance: {
    byDrone: (id: string) => ['maintenance', 'drones', id] as const,
    detail: (id: string) => ['maintenance', id] as const,
  },
  geofences: {
    all: ['geofences'] as const,
    detail: (id: string) => ['geofences', id] as const,
  },
} as const;

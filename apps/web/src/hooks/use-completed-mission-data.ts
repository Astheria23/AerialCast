import { useEffect, useState } from 'react';
import { telemetryService } from '@/services/telemetry.service';
import type { TelemetryPoint } from '@/types/telemetry.types';

export interface UseCompletedMissionDataOptions {
  missionId: string;
  isCompleted: boolean;
}

export function useCompletedMissionData({ missionId, isCompleted }: UseCompletedMissionDataOptions) {
  const [completedTrail, setCompletedTrail] = useState<TelemetryPoint[]>([]);
  const [completedLatestPoint, setCompletedLatestPoint] = useState<TelemetryPoint | undefined>(
    undefined
  );
  const [completedTrailError, setCompletedTrailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!missionId || !isCompleted) {
      setCompletedTrail([]);
      setCompletedLatestPoint(undefined);
      setCompletedTrailError(null);
      return;
    }

    let cancelled = false;
    setCompletedTrailError(null);
    setLoading(true);

    const loadReplay = async () => {
      try {
        const latestSession = await telemetryService.getLatestSessionForMission(missionId);
        if (!latestSession || !latestSession.session_id) {
          if (!cancelled) {
            setCompletedTrail([]);
            setCompletedLatestPoint(undefined);
            setLoading(false);
          }
          return;
        }
        const replay = await telemetryService.getSessionReplay(latestSession.session_id, {
          sampleEvery: 1,
        });
        if (cancelled) {
          return;
        }
        setCompletedTrail(replay ?? []);
        setCompletedLatestPoint(replay.at(-1));
        setLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.warn('Failed to load completed mission telemetry', error);
        const message =
          error instanceof Error ? error.message : 'Unable to load mission telemetry history';
        setCompletedTrailError(message);
        setCompletedTrail([]);
        setCompletedLatestPoint(undefined);
        setLoading(false);
      }
    };

    void loadReplay();

    return () => {
      cancelled = true;
    };
  }, [missionId, isCompleted]);

  return {
    completedTrail,
    completedLatestPoint,
    completedTrailError,
    loading,
  };
}

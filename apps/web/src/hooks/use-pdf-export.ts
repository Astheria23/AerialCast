import { useCallback, useState } from 'react';
import { missionsService } from '@/services/missions.service';
import type { TelemetryMapHandle } from '@/components/telemetry/telemetry-map';

export interface UsePdfExportOptions {
  missionId: string;
  mapRef: React.RefObject<TelemetryMapHandle | null>;
}

export function usePdfExport({ missionId, mapRef }: UsePdfExportOptions) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!missionId) return;
    setExporting(true);
    setExportError(null);
    try {
      let mapImage: string | undefined;
      if (mapRef.current) {
        try {
          const captureResult = await mapRef.current.captureAsDataUrl();
          if (captureResult) {
            mapImage = captureResult;
          } else {
            const container = mapRef.current.getElement();
            if (container) {
              const { toPng } = await import('html-to-image');
              const pixelRatio =
                typeof window !== 'undefined' ? Math.min(3, window.devicePixelRatio || 2) : 2;
              mapImage = await toPng(container, {
                cacheBust: true,
                pixelRatio,
                backgroundColor: '#ffffff',
                quality: 1,
              });
            }
          }
        } catch (captureError) {
          console.warn(
            'Unable to capture map screenshot, falling back to backend rendering',
            captureError
          );
        }
      }

      const blob = await missionsService.exportMissionPdf(missionId, mapImage);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mission-${missionId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export mission PDF';
      setExportError(message);
      throw err;
    } finally {
      setExporting(false);
    }
  }, [missionId, mapRef]);

  return {
    exporting,
    exportError,
    handleExport,
  };
}

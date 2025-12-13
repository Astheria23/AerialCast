import { Loader2, Play, Pause, RotateCcw, FastForward, Rewind } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { MissionReplayOptions, useMissionReplay } from '@/hooks/replay.hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TelemetryMap } from '@/components/telemetry/telemetry-map';
import { TelemetryVitals } from '@/components/telemetry/telemetry-vitals';
import { TelemetryEventFeed } from '@/components/telemetry/telemetry-event-feed';
import type { FlightSession } from '@/types/sessions.types';

type MissionReplayPanelProps = MissionReplayOptions & {
  missionName?: string;
};

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

const statusIntent: Record<string, string> = {
  LIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-slate-100 text-slate-800 border-slate-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export function MissionReplayPanel(props: MissionReplayPanelProps) {
  const { missionId, missionName, ...replayOptions } = props;

  const {
    sessionsLoading,
    replayLoading,
    error,
    selectedSession,
    replayPoints,
    currentPoint,
    stats,
    events,
    playback,
    timeline,
    missionWaypoints,
    missionGeofences,
    missionLoading,
  } = useMissionReplay({ missionId, ...replayOptions });

  const play = playback.play;
  const selectedSessionId = selectedSession?.session_id;
  const autoPlayedSessionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedSessionId) return;
    if (replayLoading) return;
    if (replayPoints.length <= 1) return;
    if (autoPlayedSessionRef.current === selectedSessionId) return;
    play();
    autoPlayedSessionRef.current = selectedSessionId;
  }, [play, replayLoading, replayPoints.length, selectedSessionId]);

  const durationLabel = useMemo(() => {
    if (!timeline) return 'No timeline data';
    const minutes = Math.floor(timeline.durationMs / 60000);
    const seconds = Math.floor((timeline.durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [timeline]);

  const progressPercent = Math.round(playback.progress * 100);
  const hasMapData = replayPoints.length > 0 || missionWaypoints.length > 0 || missionGeofences.length > 0;
  const mapBusy = (replayLoading || missionLoading) && !hasMapData;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-xl">Mission replay</CardTitle>
          <CardDescription>{missionName ? `Tracks flown by ${missionName}` : 'Playback recorded telemetry'}</CardDescription>
        </div>
        {timeline && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              Duration: <strong>{durationLabel}</strong>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <SelectedSessionSummary session={selectedSession} loading={sessionsLoading} />
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <PlaybackControls
              isPlaying={playback.isPlaying}
              onToggle={playback.toggle}
              onSeekProgress={playback.seekToProgress}
              onStepBackward={() => playback.seekToIndex(playback.cursorIndex - 1)}
              onStepForward={() => playback.seekToIndex(playback.cursorIndex + 1)}
              progress={progressPercent}
              speed={playback.speed}
              onSpeedChange={playback.setSpeed}
              disabled={!replayPoints.length || replayLoading}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-80 rounded-2xl border border-border/60 bg-card/60 p-2">
            {mapBusy ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading replay data…
              </div>
            ) : hasMapData ? (
              <TelemetryMap
                waypoints={missionWaypoints}
                geofences={missionGeofences}
                trail={replayPoints}
                latestPoint={currentPoint}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No replay data yet.</div>
            )}
          </div>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Timeline vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <TelemetryVitals stats={stats} latestPoint={currentPoint} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Alert feed</CardTitle>
              <CardDescription>Events scoped to the current playback window</CardDescription>
            </CardHeader>
            <CardContent>
              <TelemetryEventFeed events={events} />
            </CardContent>
          </Card>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SelectedSessionSummary({
  session,
  loading,
}: {
  session?: FlightSession;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }, (_, idx) => (
          <div key={idx} className="h-16 rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
        No recorded sessions are available yet. Replays will start automatically once telemetry is captured.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest session</p>
          <p className="text-lg font-semibold">Session {session.session_id.slice(0, 8)}</p>
        </div>
        {session.status && (
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusIntent[session.status] ?? statusIntent.COMPLETED)}>
            {session.status}
          </span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>
          <dt className="text-[10px] uppercase tracking-wide">Start time</dt>
          <dd className="text-sm text-foreground">{formatDateTime(session.start_time)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide">End time</dt>
          <dd className="text-sm text-foreground">{formatDateTime(session.end_time)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide">Pilot</dt>
          <dd className="text-sm text-foreground">{session.pilot_name ?? 'Unknown pilot'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide">Aircraft</dt>
          <dd className="text-sm text-foreground">{session.drone_name ?? 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide">LoRa ID</dt>
          <dd className="text-sm text-foreground">{session.drone_lora_id ?? '—'}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        The latest completed session automatically loads and starts playback as soon as telemetry data is ready.
      </p>
    </div>
  );
}

function PlaybackControls(props: {
  isPlaying: boolean;
  onToggle: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekProgress: (progress: number) => void;
  progress: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}) {
  const { isPlaying, onToggle, onStepBackward, onStepForward, onSeekProgress, progress, speed, onSpeedChange, disabled } = props;

  const handleSlider = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    onSeekProgress(value / 100);
  };

  return (
    <div className={cn('space-y-3', disabled && 'opacity-70')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onStepBackward()} disabled={disabled}>
            <Rewind className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={onToggle} disabled={disabled}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onStepForward()} disabled={disabled}>
            <FastForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          <span>{progress}%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={progress}
        onChange={handleSlider}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Speed</span>
        <select
          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-right"
          value={String(speed)}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          disabled={disabled}
        >
          {PLAYBACK_SPEEDS.map((value) => (
            <option key={value} value={String(value)}>
              {value}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

import { SOCKET_BASE_URL } from '@/config/env';
import { useAuth } from '@/hooks/auth.hooks';
import { TelemetryPoint } from '@/types/telemetry.types';

export type TelemetryConnectionState = 'disconnected' | 'connecting' | 'connected';

interface TelemetryContextValue {
  connectionState: TelemetryConnectionState;
  latestPoints: Record<string, TelemetryPoint>;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  clearTelemetry: (sessionId?: string) => void;
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

export const TelemetryProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestPoints, setLatestPoints] = useState<Record<string, TelemetryPoint>>({});

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_BASE_URL ?? '', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => {
      setIsConnected(false);
      setLatestPoints({});
    };
    const handleTelemetry = (point: TelemetryPoint) => {
      setLatestPoints((prev) => ({ ...prev, [point.session_id]: point }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('telemetry_update', handleTelemetry);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('telemetry_update', handleTelemetry);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const joinSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('join_session', { session_id: sessionId });
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('leave_session', { session_id: sessionId });
  }, []);

  const clearTelemetry = useCallback((sessionId?: string) => {
    setLatestPoints((prev) => {
      if (!sessionId) {
        return {};
      }
      const copy = { ...prev };
      delete copy[sessionId];
      return copy;
    });
  }, []);

  const connectionState = useMemo<TelemetryConnectionState>(() => {
    if (!token) {
      return 'disconnected';
    }
    return isConnected ? 'connected' : 'connecting';
  }, [isConnected, token]);

  const value = useMemo(
    () => ({
      connectionState,
      latestPoints,
      joinSession,
      leaveSession,
      clearTelemetry,
    }),
    [clearTelemetry, connectionState, joinSession, latestPoints, leaveSession]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
};

export const useTelemetryContext = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
};

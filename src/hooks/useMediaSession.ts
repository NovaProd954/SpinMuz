/**
 * useMediaSession
 * ───────────────
 * React hook that manages the full media session lifecycle:
 *  1. Checks / requests Notification Access permission
 *  2. Starts the native listener
 *  3. Subscribes to metadata + playback events
 *  4. Resolves MusicBrainz metadata (title / artist → MBID + artwork)
 *  5. Exposes typed state and a sendCommand helper
 */

import {useEffect, useRef, useState, useCallback} from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import {TrackMetadata, PlaybackState, PlaybackStatus} from '../types';
import mediaSessionBridge from '../services/MediaSessionBridge';
import musicBrainzService from '../services/MusicBrainzService';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TRACK: TrackMetadata = {
  title: 'Nothing Playing',
  artist: '—',
  album: '—',
  duration: 0,
  artworkUrl: null,
  mbid: null,
  releaseMbid: null,
};

const DEFAULT_PLAYBACK: PlaybackState = {
  status: PlaybackStatus.None,
  isPlaying: false,
  position: 0,
  speed: 1,
  progress: 0,
};

// ─── Android state constants (from PlaybackState.STATE_*) ─────────────────────

const PLAYING_STATES = new Set([
  3, // STATE_PLAYING
  4, // STATE_FAST_FORWARDING
  5, // STATE_REWINDING
]);

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseMediaSessionResult {
  track: TrackMetadata;
  playback: PlaybackState;
  hasPermission: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  sendCommand: (cmd: 'play' | 'pause' | 'skip_next' | 'skip_previous') => void;
}

export function useMediaSession(): UseMediaSessionResult {
  const [track, setTrack] = useState<TrackMetadata>(DEFAULT_TRACK);
  const [playback, setPlayback] = useState<PlaybackState>(DEFAULT_PLAYBACK);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Keep latest metadata in ref to compute progress without stale closures
  const durationRef = useRef(0);
  const resolvingRef = useRef<string | null>(null);

  // ── Permission check ──────────────────────────────────────────────────────

  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const granted = await mediaSessionBridge.hasNotificationAccess();
    setHasPermission(granted);
    return granted;
  }, []);

  const requestPermission = useCallback(async () => {
    await mediaSessionBridge.requestNotificationAccess();
    // Poll until user returns to app
    await checkPermission();
  }, [checkPermission]);

  // ── Start listening once permission is granted ─────────────────────────────

  useEffect(() => {
    if (!hasPermission) return;

    const start = async () => {
      await mediaSessionBridge.startListening();
    };
    start();

    return () => {
      mediaSessionBridge.stopListening();
    };
  }, [hasPermission]);

  // ── Metadata subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!hasPermission) return;

    const unsubMeta = mediaSessionBridge.onMetadata(async event => {
      const title = event.title ?? '';
      const artist = event.artist ?? '';
      const album = event.album ?? '';
      const duration = event.duration ?? 0;

      // Optimistic UI update with raw data first
      setTrack(prev => ({
        ...prev,
        title: title || prev.title,
        artist: artist || prev.artist,
        album: album || prev.album,
        duration,
        artworkUrl: null,
      }));
      durationRef.current = duration;

      // De-duplicate concurrent resolves for the same track
      const key = `${title}::${artist}`;
      if (resolvingRef.current === key) return;
      resolvingRef.current = key;

      if (title && artist) {
        setIsLoading(true);
        try {
          const resolved = await musicBrainzService.resolve(title, artist, album || undefined);
          // Only update if still the same track
          if (resolvingRef.current === key) {
            setTrack({
              ...resolved,
              duration: duration || resolved.duration,
            });
          }
        } catch (e) {
          console.warn('[useMediaSession] MusicBrainz resolve failed:', e);
        } finally {
          setIsLoading(false);
          if (resolvingRef.current === key) resolvingRef.current = null;
        }
      }
    });

    return unsubMeta;
  }, [hasPermission]);

  // ── Playback state subscription ───────────────────────────────────────────

  useEffect(() => {
    if (!hasPermission) return;

    const unsubPlayback = mediaSessionBridge.onPlaybackState(event => {
      const isPlaying = PLAYING_STATES.has(event.state);
      const duration = durationRef.current;
      const progress = duration > 0 ? Math.min(event.position / duration, 1) : 0;

      setPlayback({
        status: event.state as PlaybackStatus,
        isPlaying,
        position: event.position,
        speed: event.speed,
        progress,
      });
    });

    return unsubPlayback;
  }, [hasPermission]);

  // ── Re-check permission when app comes to foreground ─────────────────────

  useEffect(() => {
    let lastState = AppState.currentState;

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          nextState === 'active' &&
          (lastState === 'background' || lastState === 'inactive')
        ) {
          checkPermission();
        }
        lastState = nextState;
      },
    );

    // Initial check
    checkPermission();

    return () => subscription.remove();
  }, [checkPermission]);

  // ── Command helper ────────────────────────────────────────────────────────

  const sendCommand = useCallback(
    (cmd: 'play' | 'pause' | 'skip_next' | 'skip_previous') => {
      mediaSessionBridge.sendCommand(cmd);
    },
    [],
  );

  return {track, playback, hasPermission, isLoading, requestPermission, sendCommand};
}

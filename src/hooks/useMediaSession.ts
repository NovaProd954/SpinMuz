import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import {
  PlaybackState,
  PlaybackStatus,
  TrackMetadata,
  WidgetCommand,
} from '../types';
import mediaSessionBridge from '../services/MediaSessionBridge';
import libraryBridge from '../services/LibraryBridge';
import musicBrainzService from '../services/MusicBrainzService';

export const DEFAULT_TRACK: TrackMetadata = {
  title: 'Nothing Playing',
  artist: '—',
  album: '',
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

const PLAYING_STATES = new Set<number>([3, 4, 5]);

interface Anchor {
  position: number;
  at: number;
  speed: number;
  playing: boolean;
}

export function useMediaSession() {
  const [track, setTrack] = useState<TrackMetadata>(DEFAULT_TRACK);
  const [playback, setPlayback] = useState<PlaybackState>(DEFAULT_PLAYBACK);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localActive, setLocalActive] = useState(false);

  const durationRef = useRef(0);
  const statusRef = useRef<PlaybackStatus>(PlaybackStatus.None);
  const anchorRef = useRef<Anchor>({
    position: 0,
    at: Date.now(),
    speed: 1,
    playing: false,
  });
  const keyRef = useRef('');
  const requestRef = useRef(0);
  const sourceRef = useRef<'local' | 'system'>('system');

  const refreshPosition = useCallback(() => {
    const a = anchorRef.current;
    const duration = durationRef.current;
    let position = a.playing
      ? a.position + (Date.now() - a.at) * a.speed
      : a.position;
    if (duration > 0) {
      position = Math.min(position, duration);
    }
    position = Math.max(position, 0);
    setPlayback({
      status: statusRef.current,
      isPlaying: a.playing,
      position,
      speed: a.speed,
      progress: duration > 0 ? position / duration : 0,
    });
  }, []);

  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return false;
    }
    const granted = await mediaSessionBridge.hasNotificationAccess();
    setHasPermission(granted);
    return granted;
  }, []);

  const requestPermission = useCallback(async () => {
    await mediaSessionBridge.requestNotificationAccess();
    await checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    return mediaSessionBridge.onMetadata(event => {
      if (event.source === 'local') {
        setLocalActive(true);
      }
      const artworkUri = event.artworkUri ?? null;
      const title = event.title ?? '';
      const artist = event.artist ?? '';
      const album = event.album ?? '';
      const duration = event.duration ?? 0;
      durationRef.current = duration;

      if (!title && !artist) {
        keyRef.current = '';
        requestRef.current += 1;
        setTrack(DEFAULT_TRACK);
        setIsLoading(false);
        refreshPosition();
        return;
      }

      const key = `${title}::${artist}::${album}`.toLowerCase();
      if (key === keyRef.current) {
        setTrack(prev => ({
          ...prev,
          duration: duration || prev.duration,
          artworkUrl: artworkUri ?? prev.artworkUrl,
        }));
        refreshPosition();
        return;
      }
      keyRef.current = key;
      const request = ++requestRef.current;

      setTrack({
        ...DEFAULT_TRACK,
        title: title || DEFAULT_TRACK.title,
        artist: artist || DEFAULT_TRACK.artist,
        album,
        duration,
        artworkUrl: artworkUri,
      });
      refreshPosition();

      if (!title || !artist) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      musicBrainzService
        .resolve(title, artist, album || undefined)
        .then(resolved => {
          if (requestRef.current === request) {
            setTrack(prev => ({
              ...resolved,
              duration: duration || resolved.duration,
              artworkUrl: prev.artworkUrl ?? resolved.artworkUrl,
            }));
          }
        })
        .catch(() => {})
        .finally(() => {
          if (requestRef.current === request) {
            setIsLoading(false);
          }
        });
    });
  }, [refreshPosition]);

  useEffect(() => {
    return mediaSessionBridge.onPlaybackState(event => {
      if (event.source === 'local') {
        sourceRef.current = 'local';
        setLocalActive(true);
      } else {
        sourceRef.current = 'system';
      }
      statusRef.current = event.state as PlaybackStatus;
      anchorRef.current = {
        position: event.position,
        at: Date.now(),
        speed: event.speed || 1,
        playing: PLAYING_STATES.has(event.state),
      };
      refreshPosition();
    });
  }, [refreshPosition]);

  useEffect(() => {
    libraryBridge.sync();
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = async (attempt: number) => {
      const ok = await mediaSessionBridge.startListening();
      if (!ok && !cancelled && attempt < 6) {
        timer = setTimeout(() => start(attempt + 1), 1500);
      }
    };
    start(0);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      mediaSessionBridge.stopListening();
    };
  }, [hasPermission]);

  useEffect(() => {
    if (!playback.isPlaying) {
      return;
    }
    const id = setInterval(refreshPosition, 500);
    return () => clearInterval(id);
  }, [playback.isPlaying, refreshPosition]);

  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && last !== 'active') {
        checkPermission();
      }
      last = next;
    });
    checkPermission();
    return () => sub.remove();
  }, [checkPermission]);

  const sendCommand = useCallback((cmd: WidgetCommand) => {
    if (sourceRef.current === 'local') {
      libraryBridge.sendCommand(cmd).then(ok => {
        if (!ok) {
          mediaSessionBridge.sendCommand(cmd);
        }
      });
    } else {
      mediaSessionBridge.sendCommand(cmd);
    }
  }, []);

  return {
    track,
    playback,
    hasPermission,
    localActive,
    isLoading,
    requestPermission,
    sendCommand,
  };
}

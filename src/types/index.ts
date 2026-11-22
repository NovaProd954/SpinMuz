export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkUrl: string | null;
  mbid: string | null;
  releaseMbid: string | null;
}

export enum PlaybackStatus {
  None = 0,
  Stopped = 1,
  Paused = 2,
  Playing = 3,
  FastForwarding = 4,
  Rewinding = 5,
  Buffering = 6,
  Error = 7,
  Connecting = 8,
  SkippingToPrevious = 9,
  SkippingToNext = 10,
  SkippingToQueueItem = 11,
}

export interface PlaybackState {
  status: PlaybackStatus;
  isPlaying: boolean;
  position: number;
  speed: number;
  progress: number;
}

export interface PaletteColors {
  dominant: string;
  vibrant: string;
  darkVibrant: string;
  lightVibrant: string;
  muted: string;
  darkMuted: string;
  lightMuted: string;
  onDarkVibrant: string;
}

export interface MBRecording {
  id: string;
  title: string;
  score: number;
  releases?: MBRelease[];
  'artist-credit'?: MBArtistCredit[];
}

export interface MBRelease {
  id: string;
  title: string;
  status?: string;
  date?: string;
  'cover-art-archive'?: {artwork: boolean; front: boolean; back: boolean};
}

export interface MBArtistCredit {
  name: string;
  artist: {id: string; name: string};
}

export interface MBSearchResult {
  recordings: MBRecording[];
  count: number;
  offset: number;
}

export type WidgetCommand = 'play' | 'pause' | 'skip_next' | 'skip_previous';

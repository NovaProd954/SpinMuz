// ─── Media Metadata ──────────────────────────────────────────────────────────

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  /** Track duration in milliseconds */
  duration: number;
  /** Resolved Cover Art Archive URL (or local placeholder) */
  artworkUrl: string | null;
  /** MusicBrainz recording ID */
  mbid: string | null;
  /** MusicBrainz release (album) ID */
  releaseMbid: string | null;
}

// ─── Playback State ───────────────────────────────────────────────────────────

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
  Skipping = 9,
  SkippingToPrevious = 10,
  SkippingToNext = 11,
}

export interface PlaybackState {
  status: PlaybackStatus;
  isPlaying: boolean;
  /** Current position in milliseconds */
  position: number;
  /** Playback speed multiplier (1.0 = normal) */
  speed: number;
  /** 0.0 – 1.0 */
  progress: number;
}

// ─── Palette Colors ───────────────────────────────────────────────────────────

export interface PaletteColors {
  dominant: string;
  vibrant: string;
  darkVibrant: string;
  lightVibrant: string;
  muted: string;
  darkMuted: string;
  lightMuted: string;
  onDarkVibrant: string; // text colour for darkVibrant bg
}

// ─── MusicBrainz API ─────────────────────────────────────────────────────────

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

// ─── Widget ───────────────────────────────────────────────────────────────────

export type WidgetCommand = 'play' | 'pause' | 'skip_next' | 'skip_previous';

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  NowPlaying: undefined;
  Permissions: undefined;
};

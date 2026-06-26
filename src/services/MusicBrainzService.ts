/**
 * MusicBrainzService
 * ──────────────────
 * Free, rate-limited-compliant metadata resolution using:
 *   • MusicBrainz REST API  (https://musicbrainz.org/ws/2)
 *   • Cover Art Archive API (https://coverartarchive.org)
 *
 * Rate limit: MusicBrainz asks for ≤ 1 req/s from the same IP.
 * We enforce this with a simple async queue.
 */

import axios, {AxiosInstance} from 'axios';
import {MBSearchResult, MBRecording, MBRelease, TrackMetadata} from '../types';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'SpinVault/1.0 (github.com/spinvault/spinvault)';

// ─── Rate-limit queue (1 req / 1.1 s) ────────────────────────────────────────

type Task = () => Promise<unknown>;
class RateLimitedQueue {
  private queue: Task[] = [];
  private running = false;
  private readonly interval: number;

  constructor(intervalMs = 1100) {
    this.interval = intervalMs;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running) {
        this.drain();
      }
    });
  }

  private async drain() {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      await new Promise(r => setTimeout(r, this.interval));
    }
    this.running = false;
  }
}

// ─── Simple in-memory cache ───────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();

  constructor(private ttlMs = 5 * 60 * 1000) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: K, data: V): void {
    this.store.set(key, {data, expiresAt: Date.now() + this.ttlMs});
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

class MusicBrainzService {
  private readonly http: AxiosInstance;
  private readonly queue = new RateLimitedQueue(1100);
  private readonly metaCache = new TTLCache<string, TrackMetadata>(10 * 60 * 1000);
  private readonly artCache = new TTLCache<string, string | null>(10 * 60 * 1000);

  constructor() {
    this.http = axios.create({
      baseURL: MB_BASE,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      timeout: 8000,
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Given a raw title + artist string (e.g. from MediaSession), resolve full
   * TrackMetadata including a Cover Art Archive artwork URL.
   */
  async resolve(title: string, artist: string, album?: string): Promise<TrackMetadata> {
    const cacheKey = `${title}::${artist}::${album ?? ''}`.toLowerCase();
    const cached = this.metaCache.get(cacheKey);
    if (cached) return cached;

    const recording = await this.searchRecording(title, artist, album);

    const artworkUrl = recording
      ? await this.resolveArtwork(recording)
      : null;

    const result: TrackMetadata = {
      title: recording?.title ?? title,
      artist: recording?.['artist-credit']?.[0]?.name ?? artist,
      album: recording?.releases?.[0]?.title ?? album ?? '',
      duration: 0,
      artworkUrl,
      mbid: recording?.id ?? null,
      releaseMbid: recording?.releases?.[0]?.id ?? null,
    };

    this.metaCache.set(cacheKey, result);
    return result;
  }

  /**
   * Direct artwork resolution from a MusicBrainz release ID.
   */
  async getArtworkByReleaseMbid(releaseMbid: string): Promise<string | null> {
    const cached = this.artCache.get(releaseMbid);
    if (cached !== undefined) return cached;

    const url = await this.fetchCoverArt(releaseMbid);
    this.artCache.set(releaseMbid, url);
    return url;
  }

  // ── MusicBrainz Search ────────────────────────────────────────────────────

  private async searchRecording(
    title: string,
    artist: string,
    album?: string,
  ): Promise<MBRecording | null> {
    const query = this.buildQuery(title, artist, album);
    try {
      const data = await this.queue.enqueue<MBSearchResult>(() =>
        this.http
          .get<MBSearchResult>('/recording', {
            params: {
              query,
              limit: 5,
              inc: 'releases+artist-credits',
            },
          })
          .then(r => r.data),
      );

      if (!data.recordings?.length) return null;

      // Sort by score and prefer recordings that have associated releases
      const sorted = data.recordings
        .filter(r => r.score > 50)
        .sort((a, b) => {
          const aHasRelease = (a.releases?.length ?? 0) > 0 ? 1 : 0;
          const bHasRelease = (b.releases?.length ?? 0) > 0 ? 1 : 0;
          if (bHasRelease !== aHasRelease) return bHasRelease - aHasRelease;
          return b.score - a.score;
        });

      return sorted[0] ?? null;
    } catch (e) {
      console.warn('[MusicBrainz] Search failed:', e);
      return null;
    }
  }

  private buildQuery(title: string, artist: string, album?: string): string {
    // Escape Lucene special characters
    const esc = (s: string) => s.replace(/[+\-&|!(){}[\]^"~*?:\\]/g, '\\$&');
    let q = `recording:"${esc(title)}" AND artist:"${esc(artist)}"`;
    if (album) q += ` AND release:"${esc(album)}"`;
    return q;
  }

  // ── Cover Art Archive ─────────────────────────────────────────────────────

  private async resolveArtwork(recording: MBRecording): Promise<string | null> {
    // Find the best release (prefer one flagged as having artwork)
    const releases: MBRelease[] = recording.releases ?? [];
    const withArt = releases.find(r => r['cover-art-archive']?.front === true);
    const targetRelease = withArt ?? releases[0];
    if (!targetRelease) return null;

    return this.getArtworkByReleaseMbid(targetRelease.id);
  }

  private async fetchCoverArt(releaseMbid: string): Promise<string | null> {
    // Cover Art Archive redirect endpoint — returns 307 to the actual CDN URL
    // We use this deterministic URL directly (no rate limiting needed for CAA)
    const directUrl = `${CAA_BASE}/release/${releaseMbid}/front-500`;

    try {
      // HEAD request to verify the image exists
      const resp = await axios.head(directUrl, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: s => s < 400,
      });
      if (resp.status < 400) return directUrl;
      return null;
    } catch {
      // Fallback: try the release-group endpoint
      try {
        const fallback = `${CAA_BASE}/release-group/${releaseMbid}/front-500`;
        await axios.head(fallback, {timeout: 5000, validateStatus: s => s < 400});
        return fallback;
      } catch {
        return null;
      }
    }
  }
}

export const musicBrainzService = new MusicBrainzService();
export default musicBrainzService;

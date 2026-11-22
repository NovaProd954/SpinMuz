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
const USER_AGENT = 'SpinMuz/1.0 (https://github.com/NovaProd954/SpinMuz)';

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
      await new Promise<void>(r => setTimeout(r, this.interval));
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
    if (!entry) {
      return undefined;
    }
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
  private readonly metaCache = new TTLCache<string, TrackMetadata>(
    10 * 60 * 1000,
  );
  private readonly artCache = new TTLCache<string, string | null>(
    10 * 60 * 1000,
  );

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
  async resolve(
    title: string,
    artist: string,
    album?: string,
  ): Promise<TrackMetadata> {
    const cacheKey = `${title}::${artist}::${album ?? ''}`.toLowerCase();
    const cached = this.metaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const fallback: TrackMetadata = {
      title,
      artist,
      album: album ?? '',
      duration: 0,
      artworkUrl: null,
      mbid: null,
      releaseMbid: null,
    };

    let recording: MBRecording | null;
    try {
      recording = await this.searchRecording(title, artist, album);
    } catch {
      return fallback;
    }

    const artwork = recording ? await this.resolveArtwork(recording) : null;

    const result: TrackMetadata = {
      title: recording?.title ?? title,
      artist: recording?.['artist-credit']?.[0]?.name ?? artist,
      album: recording?.releases?.[0]?.title ?? album ?? '',
      duration: 0,
      artworkUrl: artwork?.url ?? null,
      mbid: recording?.id ?? null,
      releaseMbid: artwork?.releaseId ?? recording?.releases?.[0]?.id ?? null,
    };

    this.metaCache.set(cacheKey, result);
    return result;
  }

  /**
   * Direct artwork resolution from a MusicBrainz release ID.
   */
  async getArtworkByReleaseMbid(releaseMbid: string): Promise<string | null> {
    const cached = this.artCache.get(releaseMbid);
    if (cached !== undefined) {
      return cached;
    }

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
    const data = await this.queue.enqueue<MBSearchResult>(() =>
      this.http
        .get<MBSearchResult>('/recording', {
          params: {query, limit: 5, fmt: 'json'},
        })
        .then(r => r.data),
    );

    if (!data.recordings?.length) {
      return null;
    }

    const sorted = data.recordings
      .filter(r => r.score > 50)
      .sort((a, b) => {
        const aHasRelease = (a.releases?.length ?? 0) > 0 ? 1 : 0;
        const bHasRelease = (b.releases?.length ?? 0) > 0 ? 1 : 0;
        if (bHasRelease !== aHasRelease) {
          return bHasRelease - aHasRelease;
        }
        return b.score - a.score;
      });

    return sorted[0] ?? null;
  }

  private buildQuery(title: string, artist: string, album?: string): string {
    // Escape Lucene special characters
    const esc = (s: string) => s.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
    let q = `recording:"${esc(title)}" AND artist:"${esc(artist)}"`;
    if (album) {
      q += ` AND release:"${esc(album)}"`;
    }
    return q;
  }

  // ── Cover Art Archive ─────────────────────────────────────────────────────

  private async resolveArtwork(
    recording: MBRecording,
  ): Promise<{url: string; releaseId: string} | null> {
    const releases: MBRelease[] = recording.releases ?? [];
    const flagged = releases.filter(
      r => r['cover-art-archive']?.front === true,
    );
    const candidates = [
      ...flagged,
      ...releases.filter(r => !flagged.includes(r)),
    ].slice(0, 3);

    for (const release of candidates) {
      const url = await this.getArtworkByReleaseMbid(release.id);
      if (url) {
        return {url, releaseId: release.id};
      }
    }
    return null;
  }

  private async fetchCoverArt(releaseMbid: string): Promise<string | null> {
    const directUrl = `${CAA_BASE}/release/${releaseMbid}/front-500`;
    try {
      const resp = await axios.head(directUrl, {
        timeout: 6000,
        maxRedirects: 5,
        validateStatus: s => s < 400,
      });
      return resp.status < 400 ? directUrl : null;
    } catch {
      return null;
    }
  }
}

export const musicBrainzService = new MusicBrainzService();
export default musicBrainzService;

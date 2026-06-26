/**
 * MediaSessionBridge
 * ──────────────────
 * JavaScript bridge to the native Android MediaSessionModule
 * (NotificationListenerService + MediaSessionManager).
 *
 * Emits:
 *   • onMediaMetadata   – { title, artist, album, duration }
 *   • onPlaybackState   – { state, position, speed }
 *
 * Commands:
 *   • play / pause / skip_next / skip_previous
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {WidgetCommand} from '../types';

const {MediaSessionModule} = NativeModules;

if (Platform.OS === 'android' && !MediaSessionModule) {
  console.warn(
    '[MediaSessionBridge] Native MediaSessionModule not found. ' +
      'Ensure the module is linked and the APK is rebuilt.',
  );
}

// ─── Raw native event shapes ──────────────────────────────────────────────────

interface NativeMetadataEvent {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

interface NativePlaybackEvent {
  state: number; // Maps to PlaybackStatus enum values
  position: number;
  speed: number;
}

// ─── Typed listeners ──────────────────────────────────────────────────────────

export type MetadataListener = (event: NativeMetadataEvent) => void;
export type PlaybackListener = (event: NativePlaybackEvent) => void;

// ─── Bridge ───────────────────────────────────────────────────────────────────

class MediaSessionBridge {
  private emitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && MediaSessionModule) {
      this.emitter = new NativeEventEmitter(MediaSessionModule);
    }
  }

  /**
   * Start intercepting the system media session.
   * The app must have been granted Notification Access first.
   */
  async startListening(): Promise<boolean> {
    if (!MediaSessionModule) return false;
    try {
      return await MediaSessionModule.startListening();
    } catch (e) {
      console.error('[MediaSessionBridge] startListening error:', e);
      return false;
    }
  }

  /** Stop listening and tear down callbacks. */
  async stopListening(): Promise<void> {
    if (!MediaSessionModule) return;
    try {
      await MediaSessionModule.stopListening();
    } catch (e) {
      console.error('[MediaSessionBridge] stopListening error:', e);
    }
  }

  /**
   * Subscribe to metadata changes.
   * Returns an unsubscribe function.
   */
  onMetadata(listener: MetadataListener): () => void {
    if (!this.emitter) return () => {};
    const sub = this.emitter.addListener('onMediaMetadata', listener);
    return () => sub.remove();
  }

  /**
   * Subscribe to playback state changes.
   * Returns an unsubscribe function.
   */
  onPlaybackState(listener: PlaybackListener): () => void {
    if (!this.emitter) return () => {};
    const sub = this.emitter.addListener('onPlaybackState', listener);
    return () => sub.remove();
  }

  /**
   * Fire a transport control command at the active media session.
   */
  async sendCommand(command: WidgetCommand): Promise<boolean> {
    if (!MediaSessionModule) return false;
    try {
      return await MediaSessionModule.sendCommand(command);
    } catch (e) {
      console.error('[MediaSessionBridge] sendCommand error:', e);
      return false;
    }
  }

  /**
   * Check whether Notification Listener access has been granted.
   */
  async hasNotificationAccess(): Promise<boolean> {
    if (!MediaSessionModule) return false;
    try {
      return await MediaSessionModule.hasNotificationAccess();
    } catch {
      return false;
    }
  }

  /**
   * Open the system Notification Access settings screen.
   */
  async requestNotificationAccess(): Promise<void> {
    if (!MediaSessionModule) return;
    try {
      await MediaSessionModule.requestNotificationAccess();
    } catch (e) {
      console.error('[MediaSessionBridge] requestNotificationAccess error:', e);
    }
  }
}

export const mediaSessionBridge = new MediaSessionBridge();
export default mediaSessionBridge;

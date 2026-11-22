import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {WidgetCommand} from '../types';

const {LibraryModule} = NativeModules;

export interface LibraryTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

class LibraryBridge {
  async ensurePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    const perm =
      Number(Platform.Version) >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    if (await PermissionsAndroid.check(perm)) {
      return true;
    }
    return (
      (await PermissionsAndroid.request(perm)) ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  }

  async requestNotificationPermission(): Promise<void> {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch {}
    }
  }

  async getTracks(): Promise<LibraryTrack[]> {
    if (!LibraryModule) {
      return [];
    }
    return LibraryModule.getTracks();
  }

  async playQueue(ids: number[], startIndex: number): Promise<boolean> {
    if (!LibraryModule) {
      return false;
    }
    try {
      return await LibraryModule.playQueue(ids, startIndex);
    } catch (e) {
      console.warn('[LibraryBridge] playQueue error:', e);
      return false;
    }
  }

  async sendCommand(command: WidgetCommand): Promise<boolean> {
    if (!LibraryModule) {
      return false;
    }
    try {
      return await LibraryModule.sendCommand(command);
    } catch {
      return false;
    }
  }

  sync(): void {
    LibraryModule?.sync();
  }
}

export const libraryBridge = new LibraryBridge();
export default libraryBridge;

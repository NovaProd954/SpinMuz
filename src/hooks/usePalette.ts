import {useEffect, useState} from 'react';
import {NativeModules, Platform} from 'react-native';
import {PaletteColors} from '../types';

const {PaletteModule} = NativeModules;

export const DEFAULT_PALETTE: PaletteColors = {
  dominant: '#1A1A2E',
  vibrant: '#E94560',
  darkVibrant: '#0F3460',
  lightVibrant: '#533483',
  muted: '#2D2D2D',
  darkMuted: '#111111',
  lightMuted: '#3A3A3A',
  onDarkVibrant: '#FFFFFF',
};

export function usePalette(artworkUrl: string | null) {
  const [palette, setPalette] = useState<PaletteColors>(DEFAULT_PALETTE);

  useEffect(() => {
    if (!artworkUrl || Platform.OS !== 'android' || !PaletteModule) {
      setPalette(DEFAULT_PALETTE);
      return;
    }
    let cancelled = false;
    PaletteModule.extractFromUrl(artworkUrl)
      .then((c: Partial<PaletteColors>) => {
        if (cancelled) {
          return;
        }
        setPalette({
          dominant: c.dominant ?? DEFAULT_PALETTE.dominant,
          vibrant: c.vibrant ?? DEFAULT_PALETTE.vibrant,
          darkVibrant: c.darkVibrant ?? DEFAULT_PALETTE.darkVibrant,
          lightVibrant: c.lightVibrant ?? DEFAULT_PALETTE.lightVibrant,
          muted: c.muted ?? DEFAULT_PALETTE.muted,
          darkMuted: c.darkMuted ?? DEFAULT_PALETTE.darkMuted,
          lightMuted: c.lightMuted ?? DEFAULT_PALETTE.lightMuted,
          onDarkVibrant: '#FFFFFF',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPalette(DEFAULT_PALETTE);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

  return {palette};
}

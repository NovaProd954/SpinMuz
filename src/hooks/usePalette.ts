/**
 * usePalette
 * ──────────
 * Extracts a colour palette from an image URL using the native
 * Android Palette API (via PaletteModule bridge).
 *
 * Falls back to a neutral dark palette when:
 *   • no artwork URL is available
 *   • the native module is missing
 *   • extraction fails
 */

import {useEffect, useState} from 'react';
import {NativeModules, Platform} from 'react-native';
import {PaletteColors} from '../types';

const {PaletteModule} = NativeModules;

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PALETTE: PaletteColors = {
  dominant:       '#1A1A2E',
  vibrant:        '#E94560',
  darkVibrant:    '#0F3460',
  lightVibrant:   '#533483',
  muted:          '#2D2D2D',
  darkMuted:      '#111111',
  lightMuted:     '#3A3A3A',
  onDarkVibrant:  '#FFFFFF',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePaletteResult {
  palette: PaletteColors;
  isExtracting: boolean;
}

export function usePalette(artworkUrl: string | null): UsePaletteResult {
  const [palette, setPalette] = useState<PaletteColors>(DEFAULT_PALETTE);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (!artworkUrl || Platform.OS !== 'android' || !PaletteModule) {
      setPalette(DEFAULT_PALETTE);
      return;
    }

    let cancelled = false;
    setIsExtracting(true);

    PaletteModule.extractFromUrl(artworkUrl)
      .then((colors: Partial<PaletteColors>) => {
        if (cancelled) return;
        setPalette({
          dominant:      colors.dominant      ?? DEFAULT_PALETTE.dominant,
          vibrant:       colors.vibrant       ?? DEFAULT_PALETTE.vibrant,
          darkVibrant:   colors.darkVibrant   ?? DEFAULT_PALETTE.darkVibrant,
          lightVibrant:  colors.lightVibrant  ?? DEFAULT_PALETTE.lightVibrant,
          muted:         colors.muted         ?? DEFAULT_PALETTE.muted,
          darkMuted:     colors.darkMuted     ?? DEFAULT_PALETTE.darkMuted,
          lightMuted:    colors.lightMuted    ?? DEFAULT_PALETTE.lightMuted,
          onDarkVibrant: colors.onDarkVibrant ?? DEFAULT_PALETTE.onDarkVibrant,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.warn('[usePalette] Extraction failed:', err.message);
          setPalette(DEFAULT_PALETTE);
        }
      })
      .finally(() => {
        if (!cancelled) setIsExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

  return {palette, isExtracting};
}

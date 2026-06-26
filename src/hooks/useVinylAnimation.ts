/**
 * useVinylAnimation
 * ─────────────────
 * Returns two animated values:
 *
 *  • vinylRotation  – continuously increases by 360° when playing,
 *                     pauses (holding last angle) when stopped
 *
 *  • tonearmAngle   – maps track progress (0 → 1) to a realistic
 *                     angular sweep from the lead-out groove inward
 *                     (START_ANGLE → END_ANGLE degrees)
 *
 * Uses react-native-reanimated v3 shared values + useAnimatedStyle.
 */

import {useEffect, useRef} from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// ─── Tonearm geometry ─────────────────────────────────────────────────────────
// Real turntable tonearms sweep inward roughly 25–30° across a full side.
// 0% progress → arm points to outer groove edge
// 100% progress → arm rests near the lead-out groove at the label edge

const TONEARM_START_DEG = 22; // degrees from rest position at 0% progress
const TONEARM_END_DEG = 50;   // degrees at 100% progress

// Full vinyl revolution at 33⅓ RPM takes 1800 ms per revolution
const RPM_33 = 60_000 / 33.33; // ~1800 ms / revolution

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseVinylAnimationResult {
  /** Animated style: transform[{ rotate }] for the vinyl disc */
  vinylStyle: ReturnType<typeof useAnimatedStyle>;
  /** Animated style: transform[{ rotate }] for the tonearm */
  tonearmStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useVinylAnimation(
  isPlaying: boolean,
  progress: number,
): UseVinylAnimationResult {
  // Accumulated rotation angle (never resets, so the disc looks continuous)
  const rotation = useSharedValue(0);
  // Tonearm position (0 → 1 maps to START_ANGLE → END_ANGLE)
  const tonearmProgress = useSharedValue(progress);

  // ── Vinyl spin ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      // Spin indefinitely; each repetition adds 360° to the current value
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: RPM_33,
          easing: Easing.linear,
        }),
        -1, // infinite
        false,
      );
    } else {
      // Pause: cancel and hold the last angle
      cancelAnimation(rotation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Tonearm glide ─────────────────────────────────────────────────────────

  const lastProgressRef = useRef(progress);

  useEffect(() => {
    // Glide smoothly to the new progress position
    // Only animate forward (don't animate backward on song change)
    const delta = progress - lastProgressRef.current;
    lastProgressRef.current = progress;

    if (delta >= 0) {
      // Normal forward progress → smooth 1-second glide
      tonearmProgress.value = withTiming(progress, {
        duration: 1000,
        easing: Easing.out(Easing.quad),
      });
    } else {
      // Song skipped backward → snap immediately
      tonearmProgress.value = progress;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // ── Animated styles ───────────────────────────────────────────────────────

  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value % 360}deg`}],
  }));

  const tonearmStyle = useAnimatedStyle(() => {
    const degrees = interpolate(
      tonearmProgress.value,
      [0, 1],
      [TONEARM_START_DEG, TONEARM_END_DEG],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{rotate: `${degrees}deg`}],
    };
  });

  return {vinylStyle, tonearmStyle};
}

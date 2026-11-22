import {useEffect, useRef} from 'react';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {StageLayout} from '../utils/stageLayout';

const REV_MS = 60000 / 33.333;

export function useVinylAnimation(
  isPlaying: boolean,
  progress: number,
  armDown: boolean,
  layout: StageLayout,
) {
  const rotation = useSharedValue(0);
  const armProgress = useSharedValue(progress);
  const lift = useSharedValue(armDown ? 0 : 1);
  const lastProgress = useRef(progress);

  useEffect(() => {
    cancelAnimation(rotation);
    if (!isPlaying) {
      return;
    }
    const base = rotation.value % 360;
    rotation.value = base;
    rotation.value = withRepeat(
      withTiming(base + 360, {duration: REV_MS, easing: Easing.linear}),
      -1,
      false,
    );
  }, [isPlaying, rotation]);

  useEffect(() => {
    const delta = progress - lastProgress.current;
    lastProgress.current = progress;
    if (delta >= 0) {
      armProgress.value = withTiming(progress, {
        duration: 1000,
        easing: Easing.out(Easing.quad),
      });
    } else {
      armProgress.value = progress;
    }
  }, [progress, armProgress]);

  useEffect(() => {
    lift.value = withTiming(armDown ? 0 : 1, {
      duration: 700,
      easing: Easing.inOut(Easing.quad),
    });
  }, [armDown, lift]);

  const {
    startDeg,
    endDeg,
    restDeg,
    pivotInArmX,
    pivotInArmY,
    armWidth,
    armHeight,
  } = layout;
  const dx = pivotInArmX - armWidth / 2;
  const dy = pivotInArmY - armHeight / 2;

  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value % 360}deg`}],
  }));

  const tonearmStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.max(armProgress.value, 0), 1);
    const onRecord = startDeg + (endDeg - startDeg) * p;
    const angle = onRecord + (restDeg - onRecord) * lift.value;
    return {
      transform: [
        {translateX: dx},
        {translateY: dy},
        {rotate: `${angle}deg`},
        {translateX: -dx},
        {translateY: -dy},
      ],
    };
  });

  return {vinylStyle, tonearmStyle};
}

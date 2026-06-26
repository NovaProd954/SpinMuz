import React, {memo} from 'react';
import {View, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import Svg, {Path, Rect, Circle} from 'react-native-svg';
import {PaletteColors} from '../types';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  palette: PaletteColors;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const ICON = 28;
const BTN = 52;

function PlayIcon({color}: {color: string}) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <Path d="M8 5v14l11-7z" fill={color} />
    </Svg>
  );
}

function PauseIcon({color}: {color: string}) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <Rect x="6" y="4" width="4" height="16" fill={color} />
      <Rect x="14" y="4" width="4" height="16" fill={color} />
    </Svg>
  );
}

function SkipNextIcon({color}: {color: string}) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <Path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill={color} />
    </Svg>
  );
}

function SkipPrevIcon({color}: {color: string}) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <Path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" fill={color} />
    </Svg>
  );
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying, isLoading, palette, onPlay, onPause, onPrevious, onNext,
}) => {
  const fg = palette.onDarkVibrant;
  const accent = palette.vibrant;

  return (
    <View style={styles.row}>
      {/* Previous */}
      <TouchableOpacity
        style={[styles.sideBtn, {borderColor: fg + '30'}]}
        onPress={onPrevious}
        activeOpacity={0.7}>
        <SkipPrevIcon color={fg} />
      </TouchableOpacity>

      {/* Play / Pause — large centre button */}
      <TouchableOpacity
        style={[styles.mainBtn, {backgroundColor: accent, shadowColor: accent}]}
        onPress={isPlaying ? onPause : onPlay}
        activeOpacity={0.8}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : isPlaying ? (
          <PauseIcon color="#fff" />
        ) : (
          <PlayIcon color="#fff" />
        )}
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity
        style={[styles.sideBtn, {borderColor: fg + '30'}]}
        onPress={onNext}
        activeOpacity={0.7}>
        <SkipNextIcon color={fg} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  sideBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
});

export default memo(PlayerControls);

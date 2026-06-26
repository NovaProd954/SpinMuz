import React, {memo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {PaletteColors} from '../types';

interface ProgressBarProps {
  progress: number;   // 0–1
  position: number;   // ms
  duration: number;   // ms
  palette: PaletteColors;
}

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ProgressBar: React.FC<ProgressBarProps> = ({progress, position, duration, palette}) => {
  const fg = palette.onDarkVibrant;
  const accent = palette.vibrant;
  const track = fg + '33';

  return (
    <View style={styles.container}>
      <View style={[styles.track, {backgroundColor: track}]}>
        <View style={[styles.fill, {width: `${Math.min(progress * 100, 100)}%`, backgroundColor: accent}]} />
        {/* Playhead thumb */}
        <View style={[styles.thumb, {left: `${Math.min(progress * 100, 100)}%`, backgroundColor: accent, shadowColor: accent}]} />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.time, {color: fg + 'AA'}]}>{fmt(position)}</Text>
        <Text style={[styles.time, {color: fg + 'AA'}]}>{fmt(duration)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {width: '100%', paddingHorizontal: 28, gap: 6},
  track:     {height: 3, borderRadius: 2, overflow: 'visible'},
  fill:      {height: 3, borderRadius: 2},
  thumb: {
    position: 'absolute',
    top: -5,
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: -6,
    elevation: 4,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  labels:    {flexDirection: 'row', justifyContent: 'space-between'},
  time:      {fontSize: 11, fontVariant: ['tabular-nums']},
});

export default memo(ProgressBar);

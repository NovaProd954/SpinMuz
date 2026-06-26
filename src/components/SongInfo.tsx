import React, {memo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {PaletteColors, TrackMetadata} from '../types';

interface SongInfoProps {
  track: TrackMetadata;
  palette: PaletteColors;
}

const SongInfo: React.FC<SongInfoProps> = ({track, palette}) => {
  const fg = palette.onDarkVibrant;
  const sub = fg + 'AA';
  return (
    <View style={styles.container}>
      <Text style={[styles.title, {color: fg}]} numberOfLines={1}>
        {track.title}
      </Text>
      <Text style={[styles.artist, {color: sub}]} numberOfLines={1}>
        {track.artist}
      </Text>
      <Text style={[styles.album, {color: sub}]} numberOfLines={1}>
        {track.album}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center', paddingHorizontal: 24, gap: 4},
  title:  {fontSize: 22, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center'},
  artist: {fontSize: 15, fontWeight: '500', textAlign: 'center'},
  album:  {fontSize: 13, fontWeight: '400', textAlign: 'center', opacity: 0.75},
});

export default memo(SongInfo);

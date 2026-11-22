import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {PaletteColors} from '../types';
import {darken} from '../utils/colorUtils';

interface GradientBackgroundProps {
  palette: PaletteColors;
  children: React.ReactNode;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  palette,
  children,
}) => {
  const colors = useMemo(
    () => [
      palette.darkMuted,
      palette.darkVibrant,
      darken(palette.dominant, 0.5),
      palette.darkMuted,
    ],
    [palette.darkMuted, palette.darkVibrant, palette.dominant],
  );
  const [layers, setLayers] = useState({prev: colors, curr: colors});
  const currRef = useRef(colors);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (colors.join() === currRef.current.join()) {
      return;
    }
    setLayers({prev: currRef.current, curr: colors});
    currRef.current = colors;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [colors, fade]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={layers.prev}
        locations={[0, 0.35, 0.7, 1]}
        start={{x: 0.2, y: 0}}
        end={{x: 0.8, y: 1}}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, {opacity: fade}]}>
        <LinearGradient
          colors={layers.curr}
          locations={[0, 0.35, 0.7, 1]}
          start={{x: 0.2, y: 0}}
          end={{x: 0.8, y: 1}}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({root: {flex: 1, backgroundColor: '#111111'}});

export default GradientBackground;

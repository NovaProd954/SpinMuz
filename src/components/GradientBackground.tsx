import React, {useEffect, useRef} from 'react';
import {StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {PaletteColors} from '../types';
import {hexWithAlpha} from '../utils/colorUtils';

interface GradientBackgroundProps {
  palette: PaletteColors;
  children: React.ReactNode;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({palette, children}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevColors = useRef<string[]>([]);

  const colors = [
    palette.darkMuted,
    palette.darkVibrant,
    hexWithAlpha(palette.dominant, 0.85),
    palette.darkMuted,
  ];

  useEffect(() => {
    if (JSON.stringify(prevColors.current) !== JSON.stringify(colors)) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }).start();
      prevColors.current = colors;
    }
  });

  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.35, 0.7, 1]}
      start={{x: 0.2, y: 0}}
      end={{x: 0.8, y: 1}}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
};

export default GradientBackground;

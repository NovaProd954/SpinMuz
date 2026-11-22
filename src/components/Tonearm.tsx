import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {ARM_PIVOT, StageLayout} from '../utils/stageLayout';

interface TonearmProps {
  layout: StageLayout;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  accentColor?: string;
}

const PIVOT_X = ARM_PIVOT.x;
const PIVOT_Y = ARM_PIVOT.y;

const Tonearm: React.FC<TonearmProps> = ({
  layout,
  animatedStyle,
  accentColor = '#d4af70',
}) => {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: layout.armLeft,
          top: layout.armTop,
          width: layout.armWidth,
          height: layout.armHeight,
        },
        animatedStyle,
      ]}>
      <Svg
        width={layout.armWidth}
        height={layout.armHeight}
        viewBox="0 0 220 320"
        style={styles.svg}>
        <Defs>
          <LinearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#8a8a8a" />
            <Stop offset="25%" stopColor="#d0d0d0" />
            <Stop offset="50%" stopColor="#f0f0f0" />
            <Stop offset="75%" stopColor="#b8b8b8" />
            <Stop offset="100%" stopColor="#606060" />
          </LinearGradient>

          <LinearGradient id="cwGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#555" />
            <Stop offset="40%" stopColor="#999" />
            <Stop offset="60%" stopColor="#ccc" />
            <Stop offset="100%" stopColor="#444" />
          </LinearGradient>

          <RadialGradient id="pivotGrad" cx="40%" cy="35%" r="55%">
            <Stop offset="0%" stopColor="#eeeeee" />
            <Stop offset="60%" stopColor="#aaaaaa" />
            <Stop offset="100%" stopColor="#444444" />
          </RadialGradient>

          <LinearGradient id="headshellGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#c8c8c8" />
            <Stop offset="50%" stopColor="#888888" />
            <Stop offset="100%" stopColor="#505050" />
          </LinearGradient>
        </Defs>

        <Rect
          x={PIVOT_X + 8}
          y={PIVOT_Y - 12}
          width={26}
          height={24}
          rx={5}
          fill="url(#cwGrad)"
        />
        <Rect
          x={PIVOT_X + 8}
          y={PIVOT_Y - 12}
          width={26}
          height={24}
          rx={5}
          fill="none"
          stroke="#333"
          strokeWidth={0.7}
        />

        <Path
          d={`M ${PIVOT_X - 2} ${PIVOT_Y + 2}
              C ${PIVOT_X - 30} ${PIVOT_Y + 60},
                ${PIVOT_X - 90} ${PIVOT_Y + 150},
                38 270`}
          stroke="url(#armGrad)"
          strokeWidth={11}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${PIVOT_X - 2} ${PIVOT_Y + 2}
              C ${PIVOT_X - 30} ${PIVOT_Y + 60},
                ${PIVOT_X - 90} ${PIVOT_Y + 150},
                38 270`}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          opacity={0.3}
        />

        <Path
          d={'M 38 270 L 18 288'}
          stroke="url(#armGrad)"
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
        />

        <Path
          d={'M 10 282 L 5 295 L 28 302 L 33 289 Z'}
          fill="url(#headshellGrad)"
          stroke="#222"
          strokeWidth={0.8}
        />

        <Rect
          x={8}
          y={291}
          width={20}
          height={10}
          rx={2}
          fill="#2a2a2a"
          stroke="#111"
          strokeWidth={0.5}
        />

        <Line
          x1={15}
          y1={301}
          x2={13}
          y2={312}
          stroke={accentColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Circle cx={13} cy={313} r={2} fill={accentColor} />

        <Circle cx={PIVOT_X} cy={PIVOT_Y} r={11} fill="url(#pivotGrad)" />
        <Circle
          cx={PIVOT_X}
          cy={PIVOT_Y}
          r={11}
          fill="none"
          stroke="#222"
          strokeWidth={1}
        />
        <Line
          x1={PIVOT_X - 5}
          y1={PIVOT_Y}
          x2={PIVOT_X + 5}
          y2={PIVOT_Y}
          stroke="#444"
          strokeWidth={1.2}
        />
        <Line
          x1={PIVOT_X}
          y1={PIVOT_Y - 5}
          x2={PIVOT_X}
          y2={PIVOT_Y + 5}
          stroke="#444"
          strokeWidth={1.2}
        />

        <Line
          x1={PIVOT_X}
          y1={PIVOT_Y + 11}
          x2={PIVOT_X + 4}
          y2={PIVOT_Y + 40}
          stroke={accentColor}
          strokeWidth={0.6}
          strokeDasharray="2,2"
          opacity={0.7}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({svg: {overflow: 'visible'}});

export default memo(Tonearm);

/**
 * Tonearm
 * ───────
 * Skeuomorphic tonearm SVG.
 *
 *  Geometry:
 *    • Pivot bolt  at top-right (SVG coords ~185,  25)
 *    • Main arm    extends ~185° diagonally down-left
 *    • Headshell   at the tip (small angled block)
 *    • Stylus      (tiny point at headshell end)
 *    • Counterweight (cylinder at back of arm)
 *
 *  Animation:
 *    • The entire arm group rotates around the pivot bolt
 *    • animatedStyle comes from useVinylAnimation → tonearmStyle
 *    • Maps 0→1 progress to TONEARM_START_DEG→TONEARM_END_DEG
 *
 * viewBox: 0 0 220 320   (arm extends from top-right)
 */

import React, {memo} from 'react';
import Animated from 'react-native-reanimated';
import Svg, {
  G,
  Line,
  Circle,
  Rect,
  Path,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';

interface TonearmProps {
  /** Width in dp — height is always 1.45× width */
  width?: number;
  /** Animated style with rotate transform from useVinylAnimation */
  animatedStyle: object;
  /** Metal highlight colour */
  accentColor?: string;
}

// Pivot is the origin of rotation: top-right of the canvas
const PIVOT_X = 180;
const PIVOT_Y = 28;

const Tonearm: React.FC<TonearmProps> = ({
  width = 220,
  animatedStyle,
  accentColor = '#d4af70',
}) => {
  const height = width * 1.45;
  const scale = width / 220;

  return (
    /*
     * The outer View carries the rotation transform from useVinylAnimation.
     * We apply transform-origin equivalent by translating to pivot, rotating,
     * then translating back — Reanimated does this via the style prop.
     *
     * Because RN transform-origin is not supported, we set the Animated.View
     * position so that the pivot point aligns with the record's edge, and
     * the caller is responsible for absolute positioning.
     */
    <Animated.View
      style={[
        {
          width,
          height,
          // Rotate around the pivot bolt (top-right area)
          transformOrigin: `${PIVOT_X * scale}px ${PIVOT_Y * scale}px`,
        },
        animatedStyle,
      ]}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 220 320"
        style={{overflow: 'visible'}}
      >
        <Defs>
          {/* Chrome / brushed-metal gradient for the arm tube */}
          <LinearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%"   stopColor="#8a8a8a" />
            <Stop offset="25%"  stopColor="#d0d0d0" />
            <Stop offset="50%"  stopColor="#f0f0f0" />
            <Stop offset="75%"  stopColor="#b8b8b8" />
            <Stop offset="100%" stopColor="#606060" />
          </LinearGradient>

          {/* Darker gradient for counterweight cylinder */
          }
          <LinearGradient id="cwGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#555" />
            <Stop offset="40%"  stopColor="#999" />
            <Stop offset="60%"  stopColor="#ccc" />
            <Stop offset="100%" stopColor="#444" />
          </LinearGradient>

          {/* Pivot bolt radial gradient */}
          <RadialGradient id="pivotGrad" cx="40%" cy="35%" r="55%">
            <Stop offset="0%"   stopColor="#eeeeee" />
            <Stop offset="60%"  stopColor="#aaaaaa" />
            <Stop offset="100%" stopColor="#444444" />
          </RadialGradient>

          {/* Headshell gradient */}
          <LinearGradient id="headshellGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%"   stopColor="#c8c8c8" />
            <Stop offset="50%"  stopColor="#888888" />
            <Stop offset="100%" stopColor="#505050" />
          </LinearGradient>
        </Defs>

        {/* ── Counterweight (cylinder behind pivot) ── */}
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

        {/* ── Arm tube ── */}
        {/*
          The arm starts at the pivot and sweeps diagonally down-left.
          We draw a thick rounded path to simulate the tapered tube.
        */}
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
        {/* Arm shadow / underside */}
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

        {/* ── Headshell connector kink ── */}
        <Path
          d={`M 38 270 L 18 288`}
          stroke="url(#armGrad)"
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
        />

        {/* ── Headshell body ── */}
        <Path
          d={`M 10 282 L 5 295 L 28 302 L 33 289 Z`}
          fill="url(#headshellGrad)"
          stroke="#222"
          strokeWidth={0.8}
        />

        {/* ── Cartridge body ── */}
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

        {/* ── Stylus cantilever ── */}
        <Line
          x1={15}
          y1={301}
          x2={13}
          y2={312}
          stroke={accentColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Stylus tip diamond */}
        <Circle cx={13} cy={313} r={2} fill={accentColor} />

        {/* ── Pivot bolt (top) ── */}
        <Circle cx={PIVOT_X} cy={PIVOT_Y} r={11} fill="url(#pivotGrad)" />
        <Circle
          cx={PIVOT_X}
          cy={PIVOT_Y}
          r={11}
          fill="none"
          stroke="#222"
          strokeWidth={1}
        />
        {/* Screw head cross */}
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

        {/* ── Anti-skate thread (decorative) ── */}
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

export default memo(Tonearm);

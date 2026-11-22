import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  ClipPath,
  Image as SvgImage,
  Ellipse,
  G,
} from 'react-native-svg';

interface VinylDiskProps {
  size?: number;
  artworkUrl: string | null;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  accentColor?: string;
}

const VB = 300;
const CX = 150;
const CY = 150;
const R_OUTER = 148;
const R_LABEL = 52;
const R_SPINDLE = 5;
const GROOVE_COUNT = 35;
const GROOVE_START = 58;
const GROOVE_END = 143;
const GROOVE_SPACING = (GROOVE_END - GROOVE_START) / GROOVE_COUNT;

function Grooves() {
  const rings: React.ReactElement[] = [];
  for (let i = 0; i <= GROOVE_COUNT; i++) {
    const r = GROOVE_START + i * GROOVE_SPACING;
    const opacity = i % 2 === 0 ? 0.55 : 0.35;
    rings.push(
      <Circle
        key={i}
        cx={CX}
        cy={CY}
        r={r}
        stroke={`rgba(255,255,255,${opacity})`}
        strokeWidth={0.4}
        fill="none"
      />,
    );
  }
  return <G>{rings}</G>;
}

const VinylDisk: React.FC<VinylDiskProps> = ({
  size = 280,
  artworkUrl,
  animatedStyle,
  accentColor = '#c9a96e',
}) => {
  return (
    <Animated.View style={[{width: size, height: size}, animatedStyle]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0a0a0a" />
            <Stop offset="60%" stopColor="#111111" />
            <Stop offset="88%" stopColor="#1a1a1a" />
            <Stop offset="100%" stopColor="#0d0d0d" />
          </RadialGradient>

          <ClipPath id="labelClip">
            <Circle cx={CX} cy={CY} r={R_LABEL} />
          </ClipPath>

          <RadialGradient id="sheenGrad" cx="35%" cy="30%" r="55%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <Stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>

          <RadialGradient id="labelRingGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="85%" stopColor="transparent" />
            <Stop offset="92%" stopColor={accentColor} stopOpacity={0.7} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0.2} />
          </RadialGradient>
        </Defs>

        <Circle cx={CX} cy={CY} r={R_OUTER} fill="url(#vinylGrad)" />

        <Grooves />

        <Circle cx={CX} cy={CY} r={R_LABEL} fill="#1c1c1c" />

        {artworkUrl ? (
          <SvgImage
            href={artworkUrl}
            x={CX - R_LABEL}
            y={CY - R_LABEL}
            width={R_LABEL * 2}
            height={R_LABEL * 2}
            clipPath="url(#labelClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          /* Placeholder rings when no artwork */
          <>
            <Circle cx={CX} cy={CY} r={R_LABEL - 5} fill="#242424" />
            <Circle
              cx={CX}
              cy={CY}
              r={R_LABEL - 18}
              fill="#1a1a1a"
              stroke="#333"
              strokeWidth={1}
            />
          </>
        )}

        <Circle
          cx={CX}
          cy={CY}
          r={R_LABEL}
          fill="url(#labelRingGrad)"
          stroke={accentColor}
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />

        <Circle
          cx={CX}
          cy={CY}
          r={R_SPINDLE}
          fill="#080808"
          stroke="#333"
          strokeWidth={0.5}
        />

        <Ellipse
          cx={CX - 18}
          cy={CY - 20}
          rx={100}
          ry={60}
          fill="url(#sheenGrad)"
          opacity={0.9}
        />

        <Circle
          cx={CX}
          cy={CY}
          r={R_OUTER - 1}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
};

export default memo(VinylDisk);

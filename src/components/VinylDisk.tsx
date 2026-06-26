/**
 * VinylDisk
 * ─────────
 * A fully skeuomorphic vinyl record rendered in SVG:
 *   • Concentric groove rings (dark PVC texture)
 *   • Circular center label showing album art
 *   • Specular / sheen highlight oval
 *   • Animated 360° rotation driven by useVinylAnimation
 *
 * The disc always occupies a square container; size prop controls diameter.
 */

import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface VinylDiskProps {
  /** Diameter in dp; defaults to 280 */
  size?: number;
  /** URL of the album art to show in the label area */
  artworkUrl: string | null;
  /** Animated style from useVinylAnimation (contains the rotation transform) */
  animatedStyle: object;
  /** Accent colour drawn around the label ring */
  accentColor?: string;
}

// ─── Geometry constants (all in SVG user units with viewBox="0 0 300 300") ───

const VB = 300;                // viewBox side length
const CX = 150;                // centre X
const CY = 150;                // centre Y
const R_OUTER = 148;           // outer edge of record
const R_LABEL = 52;            // outer edge of centre label
const R_SPINDLE = 5;           // spindle hole
const GROOVE_COUNT = 35;       // number of visible groove rings
const GROOVE_START = 58;       // innermost groove radius
const GROOVE_END = 143;        // outermost groove radius
const GROOVE_SPACING = (GROOVE_END - GROOVE_START) / GROOVE_COUNT;

// ─── Groove ring generator ────────────────────────────────────────────────────

function Grooves() {
  const rings: React.ReactElement[] = [];
  for (let i = 0; i <= GROOVE_COUNT; i++) {
    const r = GROOVE_START + i * GROOVE_SPACING;
    // Alternate two slightly different darkness values for a physical texture
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

// ─── Component ────────────────────────────────────────────────────────────────

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
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Vinyl body radial gradient — very dark centre to slightly lighter edge */}
          <RadialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0a0a0a" />
            <Stop offset="60%" stopColor="#111111" />
            <Stop offset="88%" stopColor="#1a1a1a" />
            <Stop offset="100%" stopColor="#0d0d0d" />
          </RadialGradient>

          {/* Label circular clip path */}
          <ClipPath id="labelClip">
            <Circle cx={CX} cy={CY} r={R_LABEL} />
          </ClipPath>

          {/* Sheen gradient — top-left to bottom-right */}
          <RadialGradient id="sheenGrad" cx="35%" cy="30%" r="55%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <Stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>

          {/* Label ring gradient */}
          <RadialGradient id="labelRingGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="85%" stopColor="transparent" />
            <Stop offset="92%" stopColor={accentColor} stopOpacity={0.7} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0.2} />
          </RadialGradient>
        </Defs>

        {/* ── Vinyl body ── */}
        <Circle cx={CX} cy={CY} r={R_OUTER} fill="url(#vinylGrad)" />

        {/* ── Groove texture ── */}
        <Grooves />

        {/* ── Label background (solid dark) ── */}
        <Circle cx={CX} cy={CY} r={R_LABEL} fill="#1c1c1c" />

        {/* ── Album art inside label ── */}
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
            <Circle cx={CX} cy={CY} r={R_LABEL - 18} fill="#1a1a1a" stroke="#333" strokeWidth={1} />
          </>
        )}

        {/* ── Label accent ring ── */}
        <Circle
          cx={CX}
          cy={CY}
          r={R_LABEL}
          fill="url(#labelRingGrad)"
          stroke={accentColor}
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />

        {/* ── Spindle hole ── */}
        <Circle cx={CX} cy={CY} r={R_SPINDLE} fill="#080808" stroke="#333" strokeWidth={0.5} />

        {/* ── Specular sheen overlay (non-rotating in real life, but subtle here) ── */}
        <Ellipse
          cx={CX - 18}
          cy={CY - 20}
          rx={100}
          ry={60}
          fill="url(#sheenGrad)"
          opacity={0.9}
        />

        {/* ── Outer edge highlight ── */}
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

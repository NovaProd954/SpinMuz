/**
 * NowPlayingScreen
 * ────────────────
 * The centrepiece skeuomorphic vinyl player screen.
 *
 * Layout (bottom-up):
 *   ┌──────────────────────────────────────────┐
 *   │  Dynamic gradient background             │
 *   │                                          │
 *   │       ╭──── Tonearm (top-right) ────╮   │
 *   │       │    ╭──────────────────╮     │   │
 *   │       │    │   VinylDisk      │     │   │
 *   │       │    │  (spinning art)  │     │   │
 *   │       │    ╰──────────────────╯     │   │
 *   │       ╰────────────────────────────╯   │
 *   │                                          │
 *   │       Song title / Artist / Album        │
 *   │       ━━━━━━━━━━━━━━━━━━ progress       │
 *   │       ⏮   ▶/⏸   ⏭                       │
 *   └──────────────────────────────────────────┘
 */

import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {useMediaSession} from '../hooks/useMediaSession';
import {usePalette, DEFAULT_PALETTE} from '../hooks/usePalette';
import {useVinylAnimation} from '../hooks/useVinylAnimation';
import GradientBackground from '../components/GradientBackground';
import VinylDisk from '../components/VinylDisk';
import Tonearm from '../components/Tonearm';
import SongInfo from '../components/SongInfo';
import ProgressBar from '../components/ProgressBar';
import PlayerControls from '../components/PlayerControls';
import {hexWithAlpha} from '../utils/colorUtils';

// ─── Turntable platter sizing ─────────────────────────────────────────────────

const VINYL_SIZE = 284;
const TONEARM_WIDTH = 200;
// The tonearm SVG pivot sits at x=180 in its own 220-wide viewBox.
// We position the arm so its pivot aligns with the record's right shoulder.
const TONEARM_OFFSET_X = VINYL_SIZE * 0.5 - 10; // overlap vinyl right side
const TONEARM_OFFSET_Y = -20; // sit above vinyl top

// ─── Screen ───────────────────────────────────────────────────────────────────

const NowPlayingScreen: React.FC = () => {
  const {track, playback, hasPermission, isLoading, requestPermission, sendCommand} =
    useMediaSession();

  const {palette} = usePalette(track.artworkUrl);
  const {vinylStyle, tonearmStyle} = useVinylAnimation(
    playback.isPlaying,
    playback.progress,
  );

  const handlePlayPause = useCallback(() => {
    sendCommand(playback.isPlaying ? 'pause' : 'play');
  }, [playback.isPlaying, sendCommand]);

  // ── Permission gate ───────────────────────────────────────────────────────

  if (!hasPermission) {
    return (
      <GradientBackground palette={DEFAULT_PALETTE}>
        <SafeAreaView style={styles.permissionScreen}>
          <Text style={styles.permTitle}>SpinVault</Text>
          <Text style={styles.permBody}>
            SpinVault needs Notification Access to read the active media session
            from your music app.
          </Text>
          <TouchableOpacity
            style={[styles.permBtn, {backgroundColor: DEFAULT_PALETTE.vibrant}]}
            onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Main player UI ────────────────────────────────────────────────────────

  return (
    <GradientBackground palette={palette}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.appName, {color: hexWithAlpha(palette.onDarkVibrant, 0.6)}]}>
            SpinVault
          </Text>
          <View style={[styles.statusDot, {
            backgroundColor: playback.isPlaying ? palette.vibrant : palette.muted,
          }]} />
        </View>

        {/* ── Turntable stage ── */}
        <View style={styles.stage}>
          {/* Platter shadow / mat */}
          <View style={[styles.platterMat, {shadowColor: palette.darkVibrant}]}>

            {/* Vinyl disk */}
            <VinylDisk
              size={VINYL_SIZE}
              artworkUrl={track.artworkUrl}
              animatedStyle={vinylStyle}
              accentColor={palette.vibrant}
            />

            {/* Tonearm — absolutely positioned over the right side of the record */}
            <View
              pointerEvents="none"
              style={[
                styles.tonearmWrapper,
                {
                  right: -TONEARM_OFFSET_X + TONEARM_WIDTH * 0.08,
                  top: TONEARM_OFFSET_Y,
                },
              ]}>
              <Tonearm
                width={TONEARM_WIDTH}
                animatedStyle={tonearmStyle}
                accentColor={palette.lightVibrant}
              />
            </View>
          </View>
        </View>

        {/* ── Metadata ── */}
        <View style={styles.metaSection}>
          <SongInfo track={track} palette={palette} />
        </View>

        {/* ── Progress ── */}
        <View style={styles.progressSection}>
          <ProgressBar
            progress={playback.progress}
            position={playback.position}
            duration={track.duration}
            palette={palette}
          />
        </View>

        {/* ── Controls ── */}
        <View style={styles.controlsSection}>
          <PlayerControls
            isPlaying={playback.isPlaying}
            isLoading={isLoading}
            palette={palette}
            onPlay={() => sendCommand('play')}
            onPause={() => sendCommand('pause')}
            onPrevious={() => sendCommand('skip_previous')}
            onNext={() => sendCommand('skip_next')}
          />
        </View>

        {/* ── Vinyl label texture footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: hexWithAlpha(palette.onDarkVibrant, 0.3)}]}>
            33⅓ RPM  ·  Stereo
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {flex: 1, paddingTop: StatusBar.currentHeight ?? 0},

  // Permission gate
  permissionScreen: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20},
  permTitle: {fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1},
  permBody:  {fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22},
  permBtn:   {paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28},
  permBtnText: {color: '#fff', fontWeight: '700', fontSize: 16},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  appName: {fontSize: 13, fontWeight: '600', letterSpacing: 3, textTransform: 'uppercase'},
  statusDot: {width: 7, height: 7, borderRadius: 4},

  // Turntable stage
  stage: {alignItems: 'center', justifyContent: 'center', paddingVertical: 8},
  platterMat: {
    position: 'relative',
    width: VINYL_SIZE,
    height: VINYL_SIZE,
    borderRadius: VINYL_SIZE / 2,
    elevation: 24,
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.7,
    shadowRadius: 32,
    // Subtle turntable platter ring
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tonearmWrapper: {position: 'absolute'},

  // Info & Controls
  metaSection:    {marginTop: 24, alignItems: 'center'},
  progressSection:{marginTop: 20, alignItems: 'center'},
  controlsSection:{marginTop: 24, alignItems: 'center'},
  footer: {marginTop: 'auto', paddingBottom: 12, alignItems: 'center'},
  footerText: {fontSize: 11, letterSpacing: 2, fontVariant: ['tabular-nums']},
});

export default NowPlayingScreen;

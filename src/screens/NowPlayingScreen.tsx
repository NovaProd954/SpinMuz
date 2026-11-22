import React, {useEffect, useMemo} from 'react';
import {
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useMediaSession} from '../hooks/useMediaSession';
import {DEFAULT_PALETTE, usePalette} from '../hooks/usePalette';
import {useVinylAnimation} from '../hooks/useVinylAnimation';
import GradientBackground from '../components/GradientBackground';
import VinylDisk from '../components/VinylDisk';
import Tonearm from '../components/Tonearm';
import SongInfo from '../components/SongInfo';
import ProgressBar from '../components/ProgressBar';
import PlayerControls from '../components/PlayerControls';
import mediaSessionBridge from '../services/MediaSessionBridge';
import {PlaybackStatus} from '../types';
import {hexWithAlpha} from '../utils/colorUtils';
import {computeStageLayout} from '../utils/stageLayout';

const TOP_INSET = StatusBar.currentHeight ?? 0;

const NowPlayingScreen: React.FC = () => {
  const {width, height} = useWindowDimensions();
  const layout = useMemo(
    () => computeStageLayout(width, height),
    [width, height],
  );

  const {
    track,
    playback,
    hasPermission,
    isLoading,
    requestPermission,
    sendCommand,
  } = useMediaSession();
  const {palette} = usePalette(track.artworkUrl);

  const armDown =
    playback.status !== PlaybackStatus.None &&
    playback.status !== PlaybackStatus.Stopped;
  const {vinylStyle, tonearmStyle} = useVinylAnimation(
    playback.isPlaying,
    playback.progress,
    armDown,
    layout,
  );

  useEffect(() => {
    if (hasPermission) {
      mediaSessionBridge.updateWidgetColors(palette.darkMuted, palette.vibrant);
    }
  }, [hasPermission, palette.darkMuted, palette.vibrant]);

  if (!hasPermission) {
    return (
      <GradientBackground palette={DEFAULT_PALETTE}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <View style={styles.permissionScreen}>
          <Text style={styles.permTitle}>SpinMuz</Text>
          <Text style={styles.permBody}>
            SpinMuz needs Notification Access to read what your music app is
            playing.
          </Text>
          <TouchableOpacity
            style={[styles.permBtn, {backgroundColor: DEFAULT_PALETTE.vibrant}]}
            onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Access</Text>
          </TouchableOpacity>
          <Text style={styles.permHint}>
            Installed from an APK and the switch is greyed out? Open App info,
            tap the ⋮ menu, choose “Allow restricted settings”, then try again.
          </Text>
          <TouchableOpacity
            style={styles.permLink}
            onPress={() => Linking.openSettings()}>
            <Text style={styles.permLinkText}>Open App info</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground palette={palette}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View style={styles.safe}>
        <View style={styles.header}>
          <Text
            style={[
              styles.appName,
              {color: hexWithAlpha(palette.onDarkVibrant, 0.6)},
            ]}>
            SpinMuz
          </Text>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: playback.isPlaying
                  ? palette.vibrant
                  : palette.muted,
              },
            ]}
          />
        </View>

        <View style={{width: layout.width, height: layout.height}}>
          <View
            style={[
              styles.platterMat,
              {
                left: layout.vinylLeft,
                top: layout.vinylTop,
                width: layout.vinyl,
                height: layout.vinyl,
                borderRadius: layout.vinyl / 2,
                shadowColor: palette.darkVibrant,
              },
            ]}>
            <VinylDisk
              size={layout.vinyl}
              artworkUrl={track.artworkUrl}
              animatedStyle={vinylStyle}
              accentColor={palette.vibrant}
            />
          </View>
          <Tonearm
            layout={layout}
            animatedStyle={tonearmStyle}
            accentColor={palette.lightVibrant}
          />
        </View>

        <View style={styles.metaSection}>
          <SongInfo track={track} palette={palette} />
        </View>

        <View style={styles.progressSection}>
          <ProgressBar
            progress={playback.progress}
            position={playback.position}
            duration={track.duration}
            palette={palette}
          />
        </View>

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

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              {color: hexWithAlpha(palette.onDarkVibrant, 0.3)},
            ]}>
            33⅓ RPM · Stereo
          </Text>
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, paddingTop: TOP_INSET},
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  permTitle: {fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1},
  permBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28},
  permBtnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  permHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  permLink: {paddingVertical: 8},
  permLinkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  statusDot: {width: 7, height: 7, borderRadius: 4},
  platterMat: {
    position: 'absolute',
    backgroundColor: '#0b0b0b',
    elevation: 24,
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.7,
    shadowRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metaSection: {marginTop: 0, alignItems: 'center'},
  progressSection: {marginTop: 20, alignItems: 'center'},
  controlsSection: {marginTop: 24, alignItems: 'center'},
  footer: {marginTop: 'auto', paddingBottom: 12, alignItems: 'center'},
  footerText: {fontSize: 11, letterSpacing: 2, fontVariant: ['tabular-nums']},
});

export default NowPlayingScreen;

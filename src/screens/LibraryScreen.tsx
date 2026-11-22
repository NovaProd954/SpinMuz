import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Linking,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import libraryBridge, {LibraryTrack} from '../services/LibraryBridge';

interface LibraryScreenProps {
  onBack: () => void;
  onPlayed: () => void;
}

type Status = 'loading' | 'denied' | 'ready';

const ROW_HEIGHT = 64;
const ACCENT = '#E94560';

const formatDuration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const shuffled = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const LibraryScreen: React.FC<LibraryScreenProps> = ({onBack, onPlayed}) => {
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const granted = await libraryBridge.ensurePermission();
    if (!granted) {
      setStatus('denied');
      return;
    }
    try {
      setTracks(await libraryBridge.getTracks());
    } catch {
      setTracks([]);
    }
    setStatus('ready');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return tracks;
    }
    return tracks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q),
    );
  }, [tracks, query]);

  const start = useCallback(
    async (ids: number[], index: number) => {
      const ok = await libraryBridge.playQueue(ids, index);
      if (ok) {
        onPlayed();
        libraryBridge.requestNotificationPermission();
      }
    },
    [onPlayed],
  );

  const playAt = useCallback(
    (index: number) =>
      start(
        filtered.map(t => t.id),
        index,
      ),
    [filtered, start],
  );

  const shuffleAll = useCallback(
    () => start(shuffled(filtered.map(t => t.id)), 0),
    [filtered, start],
  );

  const renderItem = useCallback(
    ({item, index}: {item: LibraryTrack; index: number}) => (
      <TouchableOpacity style={styles.row} onPress={() => playAt(index)}>
        <View style={styles.rowText}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {[item.artist, item.album].filter(Boolean).join(' · ') ||
              'Unknown artist'}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
      </TouchableOpacity>
    ),
    [playAt],
  );

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Library{status === 'ready' ? ` (${tracks.length})` : ''}
        </Text>
        <TouchableOpacity
          onPress={shuffleAll}
          style={styles.headerBtn}
          disabled={filtered.length === 0}>
          <Text style={[styles.headerBtnText, {color: ACCENT}]}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      {status === 'denied' ? (
        <View style={styles.center}>
          <Text style={styles.message}>
            SpinMuz needs permission to read the audio files on your phone.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={load}>
            <Text style={styles.primaryBtnText}>Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.link}>Open App info</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'loading' ? (
        <View style={styles.center}>
          <Text style={styles.message}>Scanning your music…</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.search}
            placeholder="Search songs, artists, albums"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={ACCENT}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.message}>
                  {tracks.length === 0
                    ? 'No music found. Copy your mp3 files onto this phone (for example into the Music folder), then pull down to refresh.'
                    : 'No matches.'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#14141f',
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerBtn: {paddingHorizontal: 12, paddingVertical: 8},
  headerBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  headerTitle: {color: '#fff', fontSize: 16, fontWeight: '700'},
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rowText: {flex: 1, paddingRight: 12},
  title: {color: '#fff', fontSize: 15, fontWeight: '600'},
  sub: {color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 3},
  duration: {color: 'rgba(255,255,255,0.45)', fontSize: 12},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},
  link: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LibraryScreen;

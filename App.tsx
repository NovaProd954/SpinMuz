import React, {useEffect, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import LibraryScreen from './src/screens/LibraryScreen';

export default function App() {
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (!libraryOpen) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLibraryOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [libraryOpen]);

  return (
    <View style={styles.root}>
      <NowPlayingScreen onOpenLibrary={() => setLibraryOpen(true)} />
      {libraryOpen ? (
        <View style={StyleSheet.absoluteFill}>
          <LibraryScreen
            onBack={() => setLibraryOpen(false)}
            onPlayed={() => setLibraryOpen(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({root: {flex: 1}});

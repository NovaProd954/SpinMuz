# SpinMuz

A vinyl-style now-playing screen for Android. SpinMuz listens to whatever music app you already use (Spotify, YouTube Music, Poweramp, etc.), spins a record with the album art, moves a tonearm along the track, and tints the screen from the cover colors. It also adds a home screen widget with playback controls.

SpinMuz plays the music files already stored on your phone (mp3, flac, m4a, and more) and can also follow another music app. It does not stream or download music from the internet.

## Install (APK)

1. Open the [Releases](../../releases/latest) page and download `SpinMuz-v*.apk`.
2. Open the file on your phone and allow installs from your browser or file manager.
3. Copy your music onto the phone (for example into the `Music` folder).
4. Launch SpinMuz, tap **Open My Music**, and allow access to audio files. Tap any song to play, or **Shuffle**.
5. Optional: tap **Follow Other Apps** to show other music apps (Spotify, YouTube Music, etc.) on the vinyl. This needs Notification Access. If the switch is greyed out (Android 13+ restricts sideloaded apps): Settings, Apps, SpinMuz, ⋮ menu, **Allow restricted settings**, then try again.

A new release with an APK is built automatically on every push to `main`. Pushing a tag like `v1.2.0` builds and publishes that version instead.

## Features

- Built-in library and player for your own music files, with background playback and a media notification
- Embedded cover art is used when your files have it, so it works fully offline
- Spinning record at 33⅓ RPM, driven by playback state
- Tonearm that lifts when idle and tracks song progress
- Album art and metadata lookup via MusicBrainz and Cover Art Archive
- Background color extracted from the album art
- Play, pause, next, and previous controls
- Home screen widget (Jetpack Glance)

## Develop

Requirements: Node 18+, JDK 17, Android SDK 34.

```sh
npm ci
npm run typecheck
npm run android
```

Build a release APK locally:

```sh
cd android
./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/`.

## Release signing

Without any setup, release APKs are signed with the debug keystore in `android/app/debug.keystore`. They install fine, and later builds update over earlier ones.

To sign with your own key, add these repository secrets: `RELEASE_KEYSTORE_BASE64`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`. Switching keys later requires uninstalling the old app first.

## Project layout

- `src/` React Native UI, hooks, and services
- `android/app/src/main/java/com/spinmuz/` native playback service (Media3), library scanner, media session, palette, and widget code

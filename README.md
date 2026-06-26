# SpinMuz 🎵

> A skeuomorphic vinyl record music player for Android — built with React Native + Jetpack Compose AppWidget.

---

## Architecture at a Glance

```
SpinVault/
├── src/                        React Native (TypeScript)
│   ├── components/
│   │   ├── VinylDisk.tsx       ── SVG vinyl record, animated 360° rotation
│   │   ├── Tonearm.tsx         ── SVG tonearm, angle maps to track progress
│   │   ├── PlayerControls.tsx  ── Play/Pause/Prev/Next buttons
│   │   ├── GradientBackground.tsx  ── Dynamic colour gradient from Palette
│   │   ├── SongInfo.tsx        ── Title / Artist / Album display
│   │   └── ProgressBar.tsx     ── Scrubber with playhead thumb
│   ├── hooks/
│   │   ├── useMediaSession.ts  ── Bridges native events → React state
│   │   ├── usePalette.ts       ── Native Palette API → PaletteColors
│   │   └── useVinylAnimation.ts── Reanimated v3 vinyl + tonearm drivers
│   ├── services/
│   │   ├── MediaSessionBridge.ts   ── NativeModule JS wrapper
│   │   └── MusicBrainzService.ts   ── MB API + Cover Art Archive resolver
│   ├── screens/
│   │   └── NowPlayingScreen.tsx    ── Main screen composition
│   └── types/index.ts
│
└── android/app/src/main/java/com/spinvault/
    ├── MediaListenerService.kt     ── NotificationListenerService subclass
    ├── modules/
    │   ├── MediaSessionModule.kt   ── Native module: intercepts MediaSession
    │   ├── PaletteModule.kt        ── Native module: Palette API bridge
    │   └── Packages.kt             ── ReactPackage registrations
    └── widget/
        ├── MusicWidget.kt          ── Glance AppWidget (Jetpack Compose)
        └── WidgetUpdateService.kt  ── BroadcastReceiver for widget commands
```

---

## How It Works

### 1. System Media Session Interception
SpinVault uses Android's **`NotificationListenerService`** (user-granted) to gain access to `MediaSessionManager.getActiveSessions()` without requiring the privileged `MEDIA_CONTENT_CONTROL` permission. Once granted, `MediaSessionModule.kt` attaches a `MediaController.Callback` to the frontmost media session and emits `onMediaMetadata` / `onPlaybackState` events to JavaScript via `RCTDeviceEventEmitter`.

### 2. MusicBrainz + Cover Art Archive
Given a raw title + artist string from the media session, `MusicBrainzService.ts` performs a Lucene-query search against the **MusicBrainz REST API** (free, no key required). It selects the best-scoring recording, then resolves the **Cover Art Archive** front-image URL (`https://coverartarchive.org/release/{mbid}/front-500`). A 1.1-second rate-limit queue ensures MusicBrainz ToS compliance.

### 3. Dynamic Colour Extraction
`PaletteModule.kt` downloads the resolved artwork bitmap on a background thread and runs **AndroidX Palette API**, extracting 7 colour swatches (dominant, vibrant, dark vibrant, etc.). These flow back to `usePalette.ts` and drive the `GradientBackground` component — the whole UI recolours to match each album.

### 4. Vinyl Rotation Animation
`useVinylAnimation.ts` uses **Reanimated v3** shared values. When `isPlaying` is true, a `withRepeat(withTiming(...))` loop adds 360° per revolution at 33⅓ RPM (~1800 ms/rev). When paused, `cancelAnimation()` freezes the angle in place — no jarring snap.

### 5. Tonearm Progress Mapping
The tonearm pivots from the top-right of the canvas. Its angle is interpolated linearly:
```
angle = 22° + (progress × 28°)   // 22° at 0%, 50° at 100%
```
Reanimated's `interpolate()` with `Extrapolation.CLAMP` handles the math; a `withTiming` ease-out gives a realistic slow-glide between updates.

### 6. AppWidget (Glance / Jetpack Compose)
`MusicWidget.kt` uses **Glance** to render a Compose UI directly on the home screen. Buttons send typed `Intent` broadcasts (`com.spinvault.widget.PLAY`, etc.) to `WidgetUpdateService.kt`, which forwards the command to the active `MediaController`. Widget state (title, artist, colours, isPlaying) is held in a companion object and re-rendered via `GlanceAppWidget.updateAll()` on every metadata/playback change.

---

## Setup

### Prerequisites
- Node.js ≥ 18
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK API 34
- A physical or emulated Android device running Android 8.0+ (API 26+)

### Install

```bash
git clone https://github.com/youruser/SpinVault.git
cd SpinVault
npm install
```

### Android build

```bash
cd android
./gradlew assembleDebug      # or assembleRelease
```

or

```bash
npx react-native run-android
```

### Grant Notification Access

After installing, open SpinVault → tap **Grant Access** → enable SpinVault in:

> **Settings → Apps → Special App Access → Notification Access**

Return to SpinVault. It will now intercept the active media session from any music app (Spotify, YouTube Music, Poweramp, etc.).

### Add the Home Screen Widget

1. Long-press the home screen → **Widgets**
2. Find **SpinVault** → drag to home screen
3. The widget shows the current track and provides ⏮ ▶⏸ ⏭ buttons

---

## Permissions

| Permission | Why |
|---|---|
| `android.permission.INTERNET` | MusicBrainz API + Cover Art Archive |
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Access active MediaSession |
| No runtime permissions required | NotificationAccess is granted in Settings |

---

## API Credits

| Service | Cost | Rate Limit |
|---|---|---|
| [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | Free, no key | 1 req/s (enforced internally) |
| [Cover Art Archive](https://coverartarchive.org) | Free, no key | Unlimited CDN |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React Native 0.73 + react-native-svg + react-native-linear-gradient |
| Animation | Reanimated v3 (shared values, worklets) |
| Native bridge | Kotlin + React Native NativeModule |
| Media interception | NotificationListenerService + MediaSessionManager |
| Color extraction | AndroidX Palette API |
| AppWidget | Jetpack Compose Glance 1.0 |
| Metadata | MusicBrainz REST API v2 |
| Artwork | Cover Art Archive CDN |

---

## License
MIT

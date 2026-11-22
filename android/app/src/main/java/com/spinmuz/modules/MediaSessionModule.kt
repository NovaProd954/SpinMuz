package com.spinmuz.modules

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.spinmuz.MediaListenerService
import com.spinmuz.widget.WidgetUpdateService

class MediaSessionModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        @Volatile
        var instance: MediaSessionModule? = null
    }

    private val main = Handler(Looper.getMainLooper())
    private val component = ComponentName(reactContext, MediaListenerService::class.java)
    private val registered = HashMap<MediaSession.Token, Pair<MediaController, MediaController.Callback>>()
    private var sessionManager: MediaSessionManager? = null
    private var sessionListener: MediaSessionManager.OnActiveSessionsChangedListener? = null
    private var activeController: MediaController? = null

    @Volatile
    private var listening = false

    init {
        instance = this
    }

    override fun getName(): String = "MediaSessionModule"

    fun onNotificationChanged() {
        if (!listening) return
        main.post { refresh() }
    }

    @ReactMethod
    fun hasNotificationAccess(promise: Promise) {
        try {
            promise.resolve(
                NotificationManagerCompat.getEnabledListenerPackages(reactContext)
                    .contains(reactContext.packageName),
            )
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestNotificationAccess(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        main.post {
            try {
                val mgr = reactContext.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
                if (sessionListener != null) {
                    refresh()
                    promise.resolve(true)
                    return@post
                }
                val listener = MediaSessionManager.OnActiveSessionsChangedListener { sync(it ?: emptyList()) }
                mgr.addOnActiveSessionsChangedListener(listener, component, main)
                sessionManager = mgr
                sessionListener = listener
                listening = true
                sync(mgr.getActiveSessions(component))
                promise.resolve(true)
            } catch (e: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Notification access not granted. ${e.message}")
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        main.post {
            try {
                listening = false
                sessionListener?.let { sessionManager?.removeOnActiveSessionsChangedListener(it) }
                sessionListener = null
                sync(emptyList())
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun sendCommand(command: String, promise: Promise) {
        main.post {
            val ctrl = activeController
            if (ctrl == null) {
                promise.reject("NO_SESSION", "No active media session")
                return@post
            }
            try {
                when (command) {
                    "play" -> ctrl.transportControls.play()
                    "pause" -> ctrl.transportControls.pause()
                    "skip_next" -> ctrl.transportControls.skipToNext()
                    "skip_previous" -> ctrl.transportControls.skipToPrevious()
                    else -> {
                        promise.reject("UNKNOWN_CMD", "Unknown: $command")
                        return@post
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun updateWidgetColors(background: String, accent: String, promise: Promise) {
        try {
            WidgetUpdateService.updateState(
                reactContext.applicationContext,
                bgColor = 0xFF000000L or (Color.parseColor(background).toLong() and 0xFFFFFFL),
                accentColor = 0xFF000000L or (Color.parseColor(accent).toLong() and 0xFFFFFFL),
            )
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun refresh() {
        val list = try {
            sessionManager?.getActiveSessions(component)
        } catch (e: SecurityException) {
            null
        }
        sync(list ?: emptyList())
    }

    private fun sync(list: List<MediaController>) {
        val tokens = list.map { it.sessionToken }.toSet()
        registered.keys.filter { it !in tokens }.forEach { token ->
            registered.remove(token)?.let { (ctrl, cb) -> ctrl.unregisterCallback(cb) }
        }
        list.forEach { ctrl ->
            if (ctrl.sessionToken in registered) return@forEach
            val cb = object : MediaController.Callback() {
                override fun onMetadataChanged(metadata: MediaMetadata?) {
                    if (ctrl.sessionToken == activeController?.sessionToken) metadata?.let { emitMetadata(it) }
                }

                override fun onPlaybackStateChanged(state: PlaybackState?) {
                    reselect(list = registered.values.map { it.first })
                    if (ctrl.sessionToken == activeController?.sessionToken) state?.let { emitPlaybackState(it) }
                }
            }
            registered[ctrl.sessionToken] = ctrl to cb
            ctrl.registerCallback(cb, main)
        }
        reselect(list)
    }

    private fun reselect(list: List<MediaController>) {
        val best = list.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
            ?: list.firstOrNull { it.sessionToken == activeController?.sessionToken }
            ?: list.firstOrNull()
        if (best?.sessionToken == activeController?.sessionToken && best != null) return
        activeController = best
        if (best == null) {
            emitPlaybackState(null)
            WidgetUpdateService.updateState(
                reactContext.applicationContext,
                title = "Nothing Playing",
                artist = "—",
                isPlaying = false,
            )
            return
        }
        best.metadata?.let { emitMetadata(it) }
        best.playbackState?.let { emitPlaybackState(it) }
    }

    private fun emitMetadata(meta: MediaMetadata) {
        val title = meta.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
        val artist = meta.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: meta.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: ""
        val map = Arguments.createMap().apply {
            putString("title", title)
            putString("artist", artist)
            putString("album", meta.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: "")
            putDouble("duration", meta.getLong(MediaMetadata.METADATA_KEY_DURATION).toDouble())
        }
        emit("onMediaMetadata", map)
        WidgetUpdateService.updateState(
            reactContext.applicationContext,
            title = title.ifEmpty { "Nothing Playing" },
            artist = artist.ifEmpty { "—" },
        )
    }

    private fun emitPlaybackState(state: PlaybackState?) {
        val playing = state != null && (
            state.state == PlaybackState.STATE_PLAYING ||
                state.state == PlaybackState.STATE_FAST_FORWARDING ||
                state.state == PlaybackState.STATE_REWINDING
            )
        var position = 0L
        if (state != null && state.position >= 0) {
            position = state.position
            if (playing && state.lastPositionUpdateTime > 0) {
                position += ((SystemClock.elapsedRealtime() - state.lastPositionUpdateTime) * state.playbackSpeed).toLong()
            }
        }
        val map = Arguments.createMap().apply {
            putInt("state", state?.state ?: PlaybackState.STATE_NONE)
            putDouble("position", position.coerceAtLeast(0L).toDouble())
            putDouble("speed", (state?.playbackSpeed ?: 1f).toDouble())
        }
        emit("onPlaybackState", map)
        WidgetUpdateService.updateState(reactContext.applicationContext, isPlaying = playing)
    }

    private fun emit(event: String, payload: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }
}

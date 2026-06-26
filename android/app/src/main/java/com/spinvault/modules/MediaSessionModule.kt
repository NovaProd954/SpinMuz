package com.spinvault.modules

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.spinvault.MediaListenerService

/**
 * MediaSessionModule
 * ──────────────────
 * React Native Native Module (Android).
 *
 * Exposes to JS:
 *   hasNotificationAccess() → Promise<Boolean>
 *   requestNotificationAccess() → Promise<Void>
 *   startListening() → Promise<Boolean>
 *   stopListening() → Promise<Void>
 *   sendCommand(command: String) → Promise<Boolean>
 *
 * Emits events:
 *   onMediaMetadata  { title, artist, album, duration }
 *   onPlaybackState  { state, position, speed }
 */
class MediaSessionModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        @Volatile
        var instance: MediaSessionModule? = null
    }

    private var sessionManager: MediaSessionManager? = null
    private var activeController: MediaController? = null
    private var sessionListener: MediaSessionManager.OnActiveSessionsChangedListener? = null

    private val mediaCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) {
            metadata?.let { emitMetadata(it) }
        }

        override fun onPlaybackStateChanged(state: PlaybackState?) {
            state?.let { emitPlaybackState(it) }
        }
    }

    override fun getName(): String = "MediaSessionModule"

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    init {
        instance = this
    }

    fun onNotificationChanged() {
        // Re-evaluate which controller is active
        refreshActiveController()
    }

    // ── JS API ────────────────────────────────────────────────────────────────

    @ReactMethod
    fun hasNotificationAccess(promise: Promise) {
        try {
            val enabled = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners",
            )?.contains(reactContext.packageName) ?: false
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestNotificationAccess(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        try {
            val listenerService = MediaListenerService.instance
            if (listenerService == null) {
                promise.reject("SERVICE_NOT_RUNNING",
                    "MediaListenerService is not running. Grant Notification Access first.")
                return
            }

            sessionManager = reactContext
                .getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager

            val component = ComponentName(reactContext, MediaListenerService::class.java)

            // Grab current sessions immediately
            sessionManager!!.getActiveSessions(component).firstOrNull()?.let {
                attachController(it)
            }

            // Watch for session changes
            sessionListener =
                MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
                    controllers?.firstOrNull()?.let { attachController(it) }
                        ?: detachController()
                }

            sessionManager!!.addOnActiveSessionsChangedListener(
                sessionListener!!, component
            )

            promise.resolve(true)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED",
                "Notification access not granted. ${e.message}")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        try {
            sessionListener?.let { sessionManager?.removeOnActiveSessionsChangedListener(it) }
            sessionListener = null
            detachController()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun sendCommand(command: String, promise: Promise) {
        val ctrl = activeController
        if (ctrl == null) {
            promise.reject("NO_SESSION", "No active media session")
            return
        }
        try {
            when (command) {
                "play"          -> ctrl.transportControls.play()
                "pause"         -> ctrl.transportControls.pause()
                "skip_next"     -> ctrl.transportControls.skipToNext()
                "skip_previous" -> ctrl.transportControls.skipToPrevious()
                else            -> { promise.reject("UNKNOWN_CMD", "Unknown: $command"); return }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // Required for RCTEventEmitter
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Internal helpers ──────────────────────────────────────────────────────

    private fun refreshActiveController() {
        val listenerService = MediaListenerService.instance ?: return
        listenerService.getActiveSessions()?.firstOrNull()?.let { attachController(it) }
            ?: detachController()
    }

    private fun attachController(controller: MediaController) {
        if (controller.sessionToken == activeController?.sessionToken) return
        detachController()
        activeController = controller
        controller.registerCallback(mediaCallback)
        // Emit current state immediately
        controller.metadata?.let { emitMetadata(it) }
        controller.playbackState?.let { emitPlaybackState(it) }
    }

    private fun detachController() {
        activeController?.unregisterCallback(mediaCallback)
        activeController = null
    }

    private fun emitMetadata(meta: MediaMetadata) {
        val map = Arguments.createMap().apply {
            putString("title",  meta.getString(MediaMetadata.METADATA_KEY_TITLE)  ?: "")
            putString("artist", meta.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: "")
            putString("album",  meta.getString(MediaMetadata.METADATA_KEY_ALBUM)  ?: "")
            putDouble("duration", meta.getLong(MediaMetadata.METADATA_KEY_DURATION).toDouble())
        }
        emit("onMediaMetadata", map)
    }

    private fun emitPlaybackState(state: PlaybackState) {
        val map = Arguments.createMap().apply {
            putInt("state",       state.state)
            putDouble("position", state.position.toDouble())
            putDouble("speed",    state.playbackSpeed.toDouble())
        }
        emit("onPlaybackState", map)
    }

    private fun emit(event: String, payload: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }
}

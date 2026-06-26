package com.spinvault.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.content.ComponentName
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
import com.spinvault.MediaListenerService
import kotlinx.coroutines.*

/**
 * WidgetUpdateService
 * ───────────────────
 * A BroadcastReceiver that:
 *  1. Receives play/pause/skip_next/skip_previous intents from Glance widget buttons
 *  2. Forwards the command to the active MediaController
 *  3. Triggers a widget re-render via GlanceAppWidget.updateAll()
 *
 * Also holds a shared `currentState` updated whenever metadata changes
 * (called from MediaSessionModule after each onMetadataChanged event).
 */
class WidgetUpdateService : BroadcastReceiver() {

    companion object {
        /** Shared state read by MusicWidget.provideGlance() on each render */
        @Volatile
        var currentState: WidgetState = WidgetState()

        /** Call this whenever metadata or playback state changes */
        fun updateState(
            context: Context,
            title:     String  = currentState.title,
            artist:    String  = currentState.artist,
            isPlaying: Boolean = currentState.isPlaying,
            bgColor:   Long    = currentState.bgColor,
            accentColor: Long  = currentState.accentColor,
        ) {
            currentState = WidgetState(title, artist, isPlaying, bgColor, accentColor)

            CoroutineScope(Dispatchers.Main).launch {
                MusicWidget().updateAll(context)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val controller = getActiveController(context) ?: return

        when (intent.action) {
            ACTION_PLAY          -> controller.transportControls.play()
            ACTION_PAUSE         -> controller.transportControls.pause()
            ACTION_SKIP_NEXT     -> controller.transportControls.skipToNext()
            ACTION_SKIP_PREVIOUS -> controller.transportControls.skipToPrevious()
        }
    }

    private fun getActiveController(context: Context): MediaController? {
        return try {
            // Re-use the live service if available
            MediaListenerService.instance?.getActiveSessions()?.firstOrNull()
                ?: run {
                    val mgr = context.getSystemService(
                        Context.MEDIA_SESSION_SERVICE
                    ) as MediaSessionManager
                    val cn = ComponentName(context, MediaListenerService::class.java)
                    mgr.getActiveSessions(cn).firstOrNull()
                }
        } catch (e: Exception) {
            null
        }
    }
}

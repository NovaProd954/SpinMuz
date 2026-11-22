package com.spinmuz.widget

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import androidx.glance.appwidget.updateAll
import com.spinmuz.MediaListenerService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class WidgetUpdateService : BroadcastReceiver() {

    companion object {
        @Volatile
        var currentState: WidgetState = WidgetState()

        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

        @Synchronized
        fun updateState(
            context: Context,
            title: String = currentState.title,
            artist: String = currentState.artist,
            isPlaying: Boolean = currentState.isPlaying,
            bgColor: Long = currentState.bgColor,
            accentColor: Long = currentState.accentColor,
        ) {
            val next = WidgetState(title, artist, isPlaying, bgColor, accentColor)
            if (next == currentState) return
            currentState = next
            scope.launch {
                try {
                    MusicWidget().updateAll(context)
                } catch (e: Exception) {
                }
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val controller = getActiveController(context) ?: return
        when (intent.action) {
            ACTION_PLAY -> controller.transportControls.play()
            ACTION_PAUSE -> controller.transportControls.pause()
            ACTION_SKIP_NEXT -> controller.transportControls.skipToNext()
            ACTION_SKIP_PREVIOUS -> controller.transportControls.skipToPrevious()
        }
    }

    private fun getActiveController(context: Context): MediaController? =
        try {
            val sessions = MediaListenerService.instance?.getActiveSessions()
                ?: (context.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager)
                    .getActiveSessions(ComponentName(context, MediaListenerService::class.java))
            sessions.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
                ?: sessions.firstOrNull()
        } catch (e: Exception) {
            null
        }
}

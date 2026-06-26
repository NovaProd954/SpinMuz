package com.spinvault

import android.content.ComponentName
import android.content.Intent
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.IBinder
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * MediaListenerService
 * ─────────────────────
 * A NotificationListenerService subclass that grants SpinVault
 * access to the system MediaSessionManager without requiring
 * the privileged MEDIA_CONTENT_CONTROL permission.
 *
 * The user grants Notification Access once via:
 *   Settings → Apps → Special App Access → Notification Access
 *
 * This service must be declared in AndroidManifest.xml with
 * the BIND_NOTIFICATION_LISTENER_SERVICE permission.
 */
class MediaListenerService : NotificationListenerService() {

    companion object {
        /** Singleton ref so MediaSessionModule can reach this service */
        @Volatile
        var instance: MediaListenerService? = null
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = super.onBind(intent)

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Delegate to MediaSessionModule if it's watching
        MediaSessionModule.instance?.onNotificationChanged()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        MediaSessionModule.instance?.onNotificationChanged()
    }

    /** Returns a ComponentName usable with MediaSessionManager.getActiveSessions() */
    fun getComponentName(): ComponentName =
        ComponentName(this, MediaListenerService::class.java)

    /** Convenience: retrieve current active media sessions */
    fun getActiveSessions(): List<MediaController>? {
        return try {
            val mgr = getSystemService(MEDIA_SESSION_SERVICE) as MediaSessionManager
            mgr.getActiveSessions(getComponentName())
        } catch (e: Exception) {
            null
        }
    }
}

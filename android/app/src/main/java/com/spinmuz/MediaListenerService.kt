package com.spinmuz

import android.content.ComponentName
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.spinmuz.modules.MediaSessionModule

class MediaListenerService : NotificationListenerService() {

    companion object {
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

    override fun onListenerConnected() {
        MediaSessionModule.instance?.onNotificationChanged()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        MediaSessionModule.instance?.onNotificationChanged()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        MediaSessionModule.instance?.onNotificationChanged()
    }

    fun listenerComponent(): ComponentName = ComponentName(this, MediaListenerService::class.java)

    fun getActiveSessions(): List<MediaController>? =
        try {
            val mgr = getSystemService(MEDIA_SESSION_SERVICE) as MediaSessionManager
            mgr.getActiveSessions(listenerComponent())
        } catch (e: Exception) {
            null
        }
}

package com.spinmuz.modules

import android.content.ComponentName
import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.spinmuz.playback.PlaybackService
import com.spinmuz.widget.WidgetUpdateService
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

class LibraryModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    private data class Track(
        val id: Long,
        val title: String,
        val artist: String,
        val album: String,
        val duration: Long,
    )

    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private val tracks = HashMap<Long, Track>()
    private val pending = ArrayList<(MediaController) -> Unit>()
    private var controller: MediaController? = null
    private var connecting = false

    private val listener = object : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            emitMetadata(null)
            loadArtwork()
            emitState()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_READY) emitMetadata(null)
            emitState()
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            emitState()
        }

        override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
            emitState()
        }

        override fun onPositionDiscontinuity(
            oldPosition: Player.PositionInfo,
            newPosition: Player.PositionInfo,
            reason: Int,
        ) {
            emitState()
        }
    }

    override fun getName(): String = "LibraryModule"

    @ReactMethod
    fun getTracks(promise: Promise) {
        io.execute {
            try {
                val found = HashMap<Long, Track>()
                val list = Arguments.createArray()
                val projection = arrayOf(
                    MediaStore.Audio.Media._ID,
                    MediaStore.Audio.Media.TITLE,
                    MediaStore.Audio.Media.ARTIST,
                    MediaStore.Audio.Media.ALBUM,
                    MediaStore.Audio.Media.DURATION,
                    MediaStore.Audio.Media.IS_RINGTONE,
                    MediaStore.Audio.Media.IS_NOTIFICATION,
                    MediaStore.Audio.Media.IS_ALARM,
                )
                val selection =
                    "${MediaStore.Audio.Media.MIME_TYPE} LIKE 'audio/%' AND ${MediaStore.Audio.Media.DURATION} >= 10000"
                reactContext.contentResolver.query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    null,
                    "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC",
                )?.use { c ->
                    val idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                    val titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                    val artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                    val albumCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                    val durCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                    val ringCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.IS_RINGTONE)
                    val notifCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.IS_NOTIFICATION)
                    val alarmCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.IS_ALARM)
                    while (c.moveToNext()) {
                        if (c.getInt(ringCol) != 0 || c.getInt(notifCol) != 0 || c.getInt(alarmCol) != 0) continue
                        val track = Track(
                            id = c.getLong(idCol),
                            title = clean(c.getString(titleCol)).ifEmpty { "Unknown" },
                            artist = clean(c.getString(artistCol)),
                            album = clean(c.getString(albumCol)),
                            duration = c.getLong(durCol),
                        )
                        found[track.id] = track
                        list.pushMap(
                            Arguments.createMap().apply {
                                putDouble("id", track.id.toDouble())
                                putString("title", track.title)
                                putString("artist", track.artist)
                                putString("album", track.album)
                                putDouble("duration", track.duration.toDouble())
                            },
                        )
                    }
                }
                synchronized(tracks) {
                    tracks.clear()
                    tracks.putAll(found)
                }
                promise.resolve(list)
            } catch (e: SecurityException) {
                promise.reject("PERMISSION_DENIED", e.message)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun playQueue(ids: ReadableArray, startIndex: Int, promise: Promise) {
        val snapshot = synchronized(tracks) { HashMap<Long, Track>(tracks) }
        val items = ArrayList<MediaItem>()
        var start = 0
        for (i in 0 until ids.size()) {
            val track = snapshot[ids.getDouble(i).toLong()] ?: continue
            if (i == startIndex) start = items.size
            items.add(toItem(track))
        }
        if (items.isEmpty()) {
            promise.resolve(false)
            return
        }
        withController { c ->
            c.setMediaItems(items, start, 0L)
            c.prepare()
            c.play()
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun sendCommand(command: String, promise: Promise) {
        main.post {
            val c = controller
            if (c == null || c.mediaItemCount == 0) {
                promise.resolve(false)
                return@post
            }
            when (command) {
                "play" -> c.play()
                "pause" -> c.pause()
                "skip_next" -> c.seekToNext()
                "skip_previous" -> c.seekToPrevious()
                else -> {
                    promise.resolve(false)
                    return@post
                }
            }
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun sync() {
        if (PlaybackService.instance == null) return
        withController { c ->
            if (c.mediaItemCount > 0) {
                emitMetadata(null)
                loadArtwork()
                emitState()
            }
        }
    }

    private fun withController(block: (MediaController) -> Unit) {
        main.post {
            val existing = controller
            if (existing != null) {
                block(existing)
                return@post
            }
            pending.add(block)
            if (connecting) return@post
            connecting = true
            val token = SessionToken(reactContext, ComponentName(reactContext, PlaybackService::class.java))
            val future = MediaController.Builder(reactContext, token).buildAsync()
            future.addListener(
                {
                    connecting = false
                    try {
                        val c = future.get()
                        c.addListener(listener)
                        controller = c
                        val queued = ArrayList(pending)
                        pending.clear()
                        queued.forEach { it(c) }
                    } catch (e: Exception) {
                        pending.clear()
                    }
                },
                ContextCompat.getMainExecutor(reactContext),
            )
        }
    }

    private fun clean(value: String?): String =
        if (value.isNullOrBlank() || value == "<unknown>") "" else value

    private fun toItem(track: Track): MediaItem =
        MediaItem.Builder()
            .setMediaId(track.id.toString())
            .setUri(ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, track.id))
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(track.title)
                    .setArtist(track.artist.ifEmpty { null })
                    .setAlbumTitle(track.album.ifEmpty { null })
                    .build(),
            )
            .build()

    private fun androidState(c: MediaController): Int = when {
        c.mediaItemCount == 0 -> 0
        c.playbackState == Player.STATE_ENDED -> 1
        c.isPlaying -> 3
        c.playbackState == Player.STATE_BUFFERING && c.playWhenReady -> 6
        else -> 2
    }

    private fun emitState() {
        val c = controller ?: return
        val map = Arguments.createMap().apply {
            putInt("state", androidState(c))
            putDouble("position", c.currentPosition.coerceAtLeast(0L).toDouble())
            putDouble("speed", c.playbackParameters.speed.toDouble())
            putString("source", "local")
        }
        emit("onPlaybackState", map)
        WidgetUpdateService.updateState(reactContext.applicationContext, isPlaying = c.isPlaying)
    }

    private fun emitMetadata(artworkUri: String?) {
        val c = controller ?: return
        val meta = c.mediaMetadata
        val title = meta.title?.toString().orEmpty()
        val artist = meta.artist?.toString().orEmpty()
        val duration = c.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0L
        val map = Arguments.createMap().apply {
            putString("title", title)
            putString("artist", artist)
            putString("album", meta.albumTitle?.toString().orEmpty())
            putDouble("duration", duration.toDouble())
            putString("source", "local")
            if (artworkUri != null) putString("artworkUri", artworkUri)
        }
        emit("onMediaMetadata", map)
        WidgetUpdateService.updateState(
            reactContext.applicationContext,
            title = title.ifEmpty { "Nothing Playing" },
            artist = artist.ifEmpty { "—" },
        )
    }

    private fun loadArtwork() {
        val mediaId = controller?.currentMediaItem?.mediaId ?: return
        val id = mediaId.toLongOrNull() ?: return
        io.execute {
            val uri = artworkUri(id) ?: return@execute
            main.post {
                if (controller?.currentMediaItem?.mediaId == mediaId) emitMetadata(uri)
            }
        }
    }

    private fun artworkUri(id: Long): String? {
        val file = File(reactContext.cacheDir, "art_$id.jpg")
        if (file.exists() && file.length() > 0) return "file://${file.absolutePath}"
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(
                reactContext,
                ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id),
            )
            val bytes = retriever.embeddedPicture
            if (bytes == null) {
                null
            } else {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                var sample = 1
                while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 800) sample *= 2
                val opts = BitmapFactory.Options().apply { inSampleSize = sample }
                val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
                if (bmp == null) {
                    null
                } else {
                    FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.JPEG, 90, it) }
                    bmp.recycle()
                    "file://${file.absolutePath}"
                }
            }
        } catch (e: Exception) {
            null
        } finally {
            try {
                retriever.release()
            } catch (e: Exception) {
            }
        }
    }

    private fun emit(event: String, payload: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }
}

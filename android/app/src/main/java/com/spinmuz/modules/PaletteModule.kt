package com.spinmuz.modules

import android.graphics.BitmapFactory
import androidx.palette.graphics.Palette
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors

class PaletteModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "PaletteModule"

    @ReactMethod
    fun extractFromUrl(url: String, promise: Promise) {
        executor.execute {
            var conn: HttpURLConnection? = null
            try {
                conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 8000
                    instanceFollowRedirects = true
                }
                val bitmap = conn.inputStream.use { BitmapFactory.decodeStream(it) }
                if (bitmap == null) {
                    promise.reject("DECODE_FAILED", "Could not decode bitmap")
                    return@execute
                }
                val palette = Palette.from(bitmap).generate()
                val map = Arguments.createMap().apply {
                    putString("dominant", hex(palette.getDominantColor(0xFF1A1A2E.toInt())))
                    putString("vibrant", hex(palette.getVibrantColor(0xFFE94560.toInt())))
                    putString("darkVibrant", hex(palette.getDarkVibrantColor(0xFF0F3460.toInt())))
                    putString("lightVibrant", hex(palette.getLightVibrantColor(0xFF533483.toInt())))
                    putString("muted", hex(palette.getMutedColor(0xFF2D2D2D.toInt())))
                    putString("darkMuted", hex(palette.getDarkMutedColor(0xFF111111.toInt())))
                    putString("lightMuted", hex(palette.getLightMutedColor(0xFF3A3A3A.toInt())))
                    putString("onDarkVibrant", "#FFFFFF")
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("PALETTE_ERROR", e.message ?: "Unknown palette error")
            } finally {
                conn?.disconnect()
            }
        }
    }

    private fun hex(color: Int): String = String.format(Locale.ROOT, "#%06X", 0xFFFFFF and color)
}

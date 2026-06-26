package com.spinvault.modules

import android.graphics.BitmapFactory
import androidx.palette.graphics.Palette
import com.facebook.react.bridge.*
import java.net.URL

/**
 * PaletteModule
 * ─────────────
 * Downloads an image from a URL on a background thread and
 * runs the AndroidX Palette API to extract colour swatches.
 *
 * Exposed to JS as:
 *   PaletteModule.extractFromUrl(url: String) → Promise<PaletteColors>
 *
 * Returns an object with hex-string colour fields:
 *   dominant, vibrant, darkVibrant, lightVibrant,
 *   muted, darkMuted, lightMuted, onDarkVibrant
 */
class PaletteModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PaletteModule"

    @ReactMethod
    fun extractFromUrl(url: String, promise: Promise) {
        Thread {
            try {
                val bitmap = URL(url).openStream().use { BitmapFactory.decodeStream(it) }
                    ?: run { promise.reject("DECODE_FAILED", "Could not decode bitmap"); return@Thread }

                val palette = Palette.from(bitmap).generate()

                val dominant     = palette.getDominantColor(0xFF1A1A2E.toInt())
                val vibrant      = palette.getVibrantColor(0xFFE94560.toInt())
                val darkVibrant  = palette.getDarkVibrantColor(0xFF0F3460.toInt())
                val lightVibrant = palette.getLightVibrantColor(0xFF533483.toInt())
                val muted        = palette.getMutedColor(0xFF2D2D2D.toInt())
                val darkMuted    = palette.getDarkMutedColor(0xFF111111.toInt())
                val lightMuted   = palette.getLightMutedColor(0xFF3A3A3A.toInt())

                // Pick readable text colour for the darkVibrant background
                val darkVibrantSwatch = palette.darkVibrantSwatch
                val onDarkVibrant = darkVibrantSwatch?.bodyTextColor ?: 0xFFFFFFFF.toInt()

                val map = Arguments.createMap().apply {
                    putString("dominant",      colorToHex(dominant))
                    putString("vibrant",       colorToHex(vibrant))
                    putString("darkVibrant",   colorToHex(darkVibrant))
                    putString("lightVibrant",  colorToHex(lightVibrant))
                    putString("muted",         colorToHex(muted))
                    putString("darkMuted",     colorToHex(darkMuted))
                    putString("lightMuted",    colorToHex(lightMuted))
                    putString("onDarkVibrant", colorToHex(onDarkVibrant))
                }

                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("PALETTE_ERROR", e.message ?: "Unknown palette error")
            }
        }.start()
    }

    private fun colorToHex(color: Int): String =
        String.format("#%06X", 0xFFFFFF and color)
}

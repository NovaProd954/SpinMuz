package com.spinvault.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionSendBroadcast
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import com.spinvault.MainActivity

// ─── Intent action constants ──────────────────────────────────────────────────

const val ACTION_PLAY          = "com.spinvault.widget.PLAY"
const val ACTION_PAUSE         = "com.spinvault.widget.PAUSE"
const val ACTION_SKIP_NEXT     = "com.spinvault.widget.SKIP_NEXT"
const val ACTION_SKIP_PREVIOUS = "com.spinvault.widget.SKIP_PREVIOUS"

// ─── Widget data model (updated by WidgetUpdateService) ───────────────────────

data class WidgetState(
    val title:     String = "Nothing Playing",
    val artist:    String = "—",
    val isPlaying: Boolean = false,
    val bgColor:   Long = 0xFF0F3460L,
    val accentColor: Long = 0xFFE94560L,
)

// ─── Widget definition ────────────────────────────────────────────────────────

class MusicWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load persisted state (updated by WidgetUpdateService via GlanceStateDefinition)
        val state = WidgetUpdateService.currentState

        provideContent {
            WidgetContent(state = state, context = context)
        }
    }
}

// ─── Widget UI (Glance Composable) ───────────────────────────────────────────

@Composable
fun WidgetContent(state: WidgetState, context: Context) {
    val bg     = Color(state.bgColor)
    val accent = Color(state.accentColor)
    val white  = Color.White

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(bg)
            .cornerRadius(20.dp)
            .clickable(actionStartActivity<MainActivity>()),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // ── Vinyl indicator dot + title ────────────────────────────────
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Animated "playing" dot (Glance doesn't support animation;
                // we pulse by toggling accent/dim color on each update)
                Box(
                    modifier = GlanceModifier
                        .size(8.dp)
                        .cornerRadius(4.dp)
                        .background(if (state.isPlaying) accent else Color.Gray),
                )

                Spacer(modifier = GlanceModifier.width(8.dp))

                Text(
                    text = "SpinVault",
                    style = TextStyle(
                        color      = ColorProvider(white.copy(alpha = 0.45f)),
                        fontSize   = 10.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // ── Song title ────────────────────────────────────────────────
            Text(
                text  = state.title,
                style = TextStyle(
                    color      = ColorProvider(white),
                    fontSize   = 15.sp,
                    fontWeight = FontWeight.Bold,
                ),
                maxLines = 1,
            )

            // ── Artist ────────────────────────────────────────────────────
            Text(
                text  = state.artist,
                style = TextStyle(
                    color    = ColorProvider(white.copy(alpha = 0.65f)),
                    fontSize = 12.sp,
                ),
                maxLines = 1,
            )

            Spacer(modifier = GlanceModifier.height(14.dp))

            // ── Transport controls ────────────────────────────────────────
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment   = Alignment.CenterVertically,
            ) {
                // Previous
                ControlButton(
                    label  = "⏮",
                    action = actionSendBroadcast(
                        Intent(ACTION_SKIP_PREVIOUS).setPackage(context.packageName)
                    ),
                    accent = accent,
                )

                Spacer(modifier = GlanceModifier.width(16.dp))

                // Play / Pause  (larger button)
                ControlButton(
                    label  = if (state.isPlaying) "⏸" else "▶",
                    action = actionSendBroadcast(
                        Intent(if (state.isPlaying) ACTION_PAUSE else ACTION_PLAY)
                            .setPackage(context.packageName)
                    ),
                    accent = accent,
                    size   = 44.dp,
                )

                Spacer(modifier = GlanceModifier.width(16.dp))

                // Next
                ControlButton(
                    label  = "⏭",
                    action = actionSendBroadcast(
                        Intent(ACTION_SKIP_NEXT).setPackage(context.packageName)
                    ),
                    accent = accent,
                )
            }
        }
    }
}

@Composable
private fun ControlButton(
    label: String,
    action: androidx.glance.action.Action,
    accent: Color,
    size: androidx.compose.ui.unit.Dp = 36.dp,
) {
    Box(
        modifier = GlanceModifier
            .size(size)
            .cornerRadius((size.value / 2).dp)
            .background(accent.copy(alpha = 0.25f))
            .clickable(action),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text  = label,
            style = TextStyle(
                color    = ColorProvider(Color.White),
                fontSize = (size.value * 0.42f).sp,
            ),
        )
    }
}

// ─── Widget Receiver ─────────────────────────────────────────────────────────

class MusicWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MusicWidget()
}

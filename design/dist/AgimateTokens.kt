/*
 * GENERATED FILE — do not edit.
 * Source: design/tokens/*.json — regenerate with `pnpm tokens`.
 */
package com.agimate.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object AgimateTokens {
    object Colors {
        // Dark is the product's default theme.
        object Dark {
            val background = Color(0xFF0F0E0D)
            val surface = Color(0xFF1A1715)
            val surfaceSecondary = Color(0xFF231F1C)
            val border = Color(0xFF2E2A27)
            val foreground = Color(0xFFF8FAFC)
            val muted = Color(0xFF94A3B8)
            val accent = Color(0xFF228391)
            val accentForeground = Color(0xFFFFFFFF)
            val backdropStart = Color(0xFF1A1715)
            val backdropEnd = Color(0xFF0F0E0D)
            val success = Color(0xFF22C55E)
            val warning = Color(0xFFF59E0B)
            val error = Color(0xFFEF4444)
            val markInk = Color(0xFF228391)
            val markInkLight = Color(0xFF3CC8DE)
            val accentGlow = Color(0x4D228391)
            val auroraTint = Color(0x33A47764)
        }

        object Light {
            val background = Color(0xFFF8F7F5)
            val surface = Color(0xFFFFFFFF)
            val surfaceSecondary = Color(0xFFF0EEE9)
            val border = Color(0xFFD8D3CC)
            val foreground = Color(0xFF1E293B)
            val muted = Color(0xFF64748B)
            val accent = Color(0xFF1C6975)
            val accentForeground = Color(0xFFFFFFFF)
            val backdropStart = Color(0xFFF0EEE9)
            val backdropEnd = Color(0xFFF8F7F5)
            val success = Color(0xFF22C55E)
            val warning = Color(0xFFF59E0B)
            val error = Color(0xFFEF4444)
            val markInk = Color(0xFF1C6975)
            val markInkLight = Color(0xFF1FA4B8)
            val accentGlow = Color(0x4D1C6975)
            val auroraTint = Color(0x61A47764)
        }
    }

    object Radius {
    val control = 8.dp
    val card = 12.dp
    val panel = 16.dp
        // pill: fully rounded, use RoundedCornerShape(50)
    }

    object Duration {
    const val crossfade = 120  // ms
    const val nav = 200  // ms
    const val flight = 520  // ms
    const val arrive = 900  // ms
    }
}

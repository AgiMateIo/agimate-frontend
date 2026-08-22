/*
 * GENERATED FILE — do not edit.
 * Source: design/tokens (DTCG JSON) — regenerate with `pnpm tokens`.
 */
import SwiftUI

public enum AgimateTokens {
    public enum Colors {
        // Dark is the product's default theme.
        public enum Dark {
            public static let background = Color(.sRGB, red: 0.0588, green: 0.0549, blue: 0.0510, opacity: 1.0)
            public static let surface = Color(.sRGB, red: 0.1020, green: 0.0902, blue: 0.0824, opacity: 1.0)
            public static let surfaceSecondary = Color(.sRGB, red: 0.1373, green: 0.1216, blue: 0.1098, opacity: 1.0)
            public static let border = Color(.sRGB, red: 0.1804, green: 0.1647, blue: 0.1529, opacity: 1.0)
            public static let foreground = Color(.sRGB, red: 0.9725, green: 0.9804, blue: 0.9882, opacity: 1.0)
            public static let muted = Color(.sRGB, red: 0.5804, green: 0.6392, blue: 0.7216, opacity: 1.0)
            public static let accent = Color(.sRGB, red: 0.1333, green: 0.5137, blue: 0.5686, opacity: 1.0)
            public static let accentForeground = Color(.sRGB, red: 1.0000, green: 1.0000, blue: 1.0000, opacity: 1.0)
            public static let backdropStart = Color(.sRGB, red: 0.1020, green: 0.0902, blue: 0.0824, opacity: 1.0)
            public static let backdropEnd = Color(.sRGB, red: 0.0588, green: 0.0549, blue: 0.0510, opacity: 1.0)
            public static let success = Color(.sRGB, red: 0.1333, green: 0.7725, blue: 0.3686, opacity: 1.0)
            public static let warning = Color(.sRGB, red: 0.9608, green: 0.6196, blue: 0.0431, opacity: 1.0)
            public static let error = Color(.sRGB, red: 0.9373, green: 0.2667, blue: 0.2667, opacity: 1.0)
            public static let warm = Color(.sRGB, red: 0.6431, green: 0.4667, blue: 0.3922, opacity: 1.0)
            public static let markInk = Color(.sRGB, red: 0.1333, green: 0.5137, blue: 0.5686, opacity: 1.0)
            public static let markInkLight = Color(.sRGB, red: 0.2353, green: 0.7843, blue: 0.8706, opacity: 1.0)
            public static let markPlateFrom = Color(.sRGB, red: 0.1216, green: 0.6431, blue: 0.7216, opacity: 1.0)
            public static let markPlateTo = Color(.sRGB, red: 0.1098, green: 0.4118, blue: 0.4588, opacity: 1.0)
            public static let markPlateBloom = Color(.sRGB, red: 0.6431, green: 0.4667, blue: 0.3922, opacity: 0.6196)
            public static let accentGlow = Color(.sRGB, red: 0.1333, green: 0.5137, blue: 0.5686, opacity: 0.3020)
            public static let auroraTint = Color(.sRGB, red: 0.6431, green: 0.4667, blue: 0.3922, opacity: 0.2000)
        }
        public enum Light {
            public static let background = Color(.sRGB, red: 0.9725, green: 0.9686, blue: 0.9608, opacity: 1.0)
            public static let surface = Color(.sRGB, red: 1.0000, green: 1.0000, blue: 1.0000, opacity: 1.0)
            public static let surfaceSecondary = Color(.sRGB, red: 0.9412, green: 0.9333, blue: 0.9137, opacity: 1.0)
            public static let border = Color(.sRGB, red: 0.8471, green: 0.8275, blue: 0.8000, opacity: 1.0)
            public static let foreground = Color(.sRGB, red: 0.1176, green: 0.1608, blue: 0.2314, opacity: 1.0)
            public static let muted = Color(.sRGB, red: 0.3922, green: 0.4549, blue: 0.5451, opacity: 1.0)
            public static let accent = Color(.sRGB, red: 0.1098, green: 0.4118, blue: 0.4588, opacity: 1.0)
            public static let accentForeground = Color(.sRGB, red: 1.0000, green: 1.0000, blue: 1.0000, opacity: 1.0)
            public static let backdropStart = Color(.sRGB, red: 0.9412, green: 0.9333, blue: 0.9137, opacity: 1.0)
            public static let backdropEnd = Color(.sRGB, red: 0.9725, green: 0.9686, blue: 0.9608, opacity: 1.0)
            public static let success = Color(.sRGB, red: 0.1333, green: 0.7725, blue: 0.3686, opacity: 1.0)
            public static let warning = Color(.sRGB, red: 0.9608, green: 0.6196, blue: 0.0431, opacity: 1.0)
            public static let error = Color(.sRGB, red: 0.9373, green: 0.2667, blue: 0.2667, opacity: 1.0)
            public static let warm = Color(.sRGB, red: 0.5412, green: 0.3843, blue: 0.3137, opacity: 1.0)
            public static let markInk = Color(.sRGB, red: 0.1098, green: 0.4118, blue: 0.4588, opacity: 1.0)
            public static let markInkLight = Color(.sRGB, red: 0.1216, green: 0.6431, blue: 0.7216, opacity: 1.0)
            public static let markPlateFrom = Color(.sRGB, red: 0.1333, green: 0.5137, blue: 0.5686, opacity: 1.0)
            public static let markPlateTo = Color(.sRGB, red: 0.0824, green: 0.3059, blue: 0.3451, opacity: 1.0)
            public static let markPlateBloom = Color(.sRGB, red: 0.5412, green: 0.3843, blue: 0.3137, opacity: 0.6196)
            public static let accentGlow = Color(.sRGB, red: 0.1098, green: 0.4118, blue: 0.4588, opacity: 0.3020)
            public static let auroraTint = Color(.sRGB, red: 0.6431, green: 0.4667, blue: 0.3922, opacity: 0.3804)
        }
    }

    public enum Radius {
        public static let control: CGFloat = 8
        public static let card: CGFloat = 12
        public static let panel: CGFloat = 16
        // pill: fully rounded, use Capsule()
    }

    public enum Duration {
        public static let crossfade: TimeInterval = 0.12
        public static let nav: TimeInterval = 0.2
        public static let flight: TimeInterval = 0.52
        public static let arrive: TimeInterval = 0.9
    }
}

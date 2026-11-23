import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Platform,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  useColorScheme,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  api,
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  setUnauthorizedHandler,
  getAuthToken,
  getStoredUser,
} from "./src/services/api";
import { EmptyState } from "./src/components/EmptyState";
import { ApiErrorCard } from "./src/components/ApiErrorCard";
import { ApiConfigModal } from "./src/components/ApiConfigModal";

/* ==========================================================================
   TYPES & CONSTANTS
   ========================================================================== */
type Role = "student" | "teacher";
type Theme = "light" | "dark" | "system";
type Lang = "fr" | "en" | "ar";
type Screen =
  | "login"
  | "home"
  | "timetable"
  | "attendance"
  | "profile"
  | "class"
  | "notifications"
  | "scanner"
  | "preview"
  | "submission"
  | "announcement"
  | "requests";

const logoUrl =
  "https://univ-k.rnu.tn/storage/university-establishments/Fr9hjgJqXV7LyYOkzs1jnaQpX90jSgrKHde5llSX.jpg";

const copy = {
  fr: {
    home: "Accueil",
    timetable: "Emploi",
    attendance: "Présences",
    profile: "Profil",
    today: "Aujourd’hui",
    todaysSchedule: "Votre journée",
    next: "Prochain cours",
    notifications: "Notifications",
    synced: "Synchronisé",
    offline: "Hors ligne",
    classes: "cours",
    viewAll: "Voir tout",
    quickActions: "Accès rapide",
    viewTimetable: "Emploi du temps",
    manageAttendance: "Présences",
    announcements: "Annonces",
    settings: "Réglages",
    attendanceRate: "Taux de présence",
    confirmedRate: "sur l'ensemble des cours",
    in12min: "Dans 12 min",
  },
  en: {
    home: "Home",
    timetable: "Schedule",
    attendance: "Attendance",
    profile: "Profile",
    today: "Today",
    todaysSchedule: "Today's Schedule",
    next: "Next Class",
    notifications: "Notifications",
    synced: "Synced",
    offline: "Offline",
    classes: "classes",
    viewAll: "View All",
    quickActions: "Quick Actions",
    viewTimetable: "View Timetable",
    manageAttendance: "Attendance",
    announcements: "Announcements",
    settings: "Settings",
    attendanceRate: "Attendance Today",
    confirmedRate: "overall confirmed attendance",
    in12min: "In 12 min",
  },
  ar: {
    home: "الرئيسية",
    timetable: "جدول الأوقات",
    attendance: "الحضور",
    profile: "الملف الشخصي",
    today: "اليوم",
    todaysSchedule: "جدول اليوم",
    next: "الحصة القادمة",
    notifications: "الإشعارات",
    synced: "متزامن",
    offline: "غير متصل",
    classes: "حصص",
    viewAll: "عرض الكل",
    quickActions: "وصول سريع",
    viewTimetable: "جدول الأوقات",
    manageAttendance: "تسجيل الحضور",
    announcements: "الإعلانات",
    settings: "الإعدادات",
    attendanceRate: "نسبة الحضور",
    confirmedRate: "من إجمالي الحصص",
    in12min: "خلال 12 دقيقة",
  },
};

const buttonCopy = {
  fr: {
    signIn: "Se connecter",
    connecting: "Connexion en cours…",
    signOut: "Se déconnecter",
    forgotPassword: "Mot de passe oublié ?",
    student: "Étudiant",
    teacher: "Enseignant",
    portalTitle: "Portail Universitaire",
    portalSubtitle: "Portail Universitaire · Gestion des présences",
    institutionalId: "Identifiant institutionnel",
    password: "Mot de passe",
    secureAccess: "Accès sécurisé réservé aux membres de l’ISSATK",
    institutionName: "Institut Supérieur des Sciences Appliquées et de Technologie de Kairouan",
    confirm: "Confirmer",
    cancel: "Annuler",
    done: "Compris",
  },
  en: {
    signIn: "Sign In",
    connecting: "Connecting…",
    signOut: "Sign Out",
    forgotPassword: "Forgot password?",
    student: "Student",
    teacher: "Teacher",
    portalTitle: "University Portal",
    portalSubtitle: "University Portal · Attendance Management",
    institutionalId: "Institutional ID",
    password: "Password",
    secureAccess: "Restricted secure access for ISSATK members",
    institutionName: "Higher Institute of Applied Sciences and Technology of Kairouan",
    confirm: "Confirm",
    cancel: "Cancel",
    done: "Got it",
  },
  ar: {
    signIn: "تسجيل الدخول",
    connecting: "جارٍ الاتصال…",
    signOut: "تسجيل الخروج",
    forgotPassword: "نسيت كلمة المرور؟",
    student: "طالب",
    teacher: "أستاذ",
    portalTitle: "البوابة الجامعية",
    portalSubtitle: "البوابة الجامعية · إدارة الحضور والغياب",
    institutionalId: "المعرف الجامعي",
    password: "كلمة المرور",
    secureAccess: "ولوج آمن خاص بأسرة المعهد العالي للعلوم التطبيقية والتكنولوجيا بالقيروان",
    institutionName: "المعهد العالي للعلوم التطبيقية والتكنولوجيا بالقيروان",
    confirm: "تأكيد",
    cancel: "إلغاء",
    done: "موافق",
  },
};

/* ==========================================================================
   HERITAGE NAVY DESIGN SYSTEM PALETTE
   Light Mode & Dedicated Deep Navy Dark Mode
   ========================================================================== */
const getColors = (isDark: boolean) => ({
  // Identity Colors
  primary: isDark ? "#7FAFE5" : "#102B55",
  primaryNavy: "#102B55",
  primaryStrong: isDark ? "#174A83" : "#102B55",
  primarySoft: isDark ? "#163259" : "#EBF1F8",
  secondary: isDark ? "#9FBCE0" : "#174A83",
  secondaryBlue: "#174A83",

  // Accent Gold
  accent: "#E9B544",
  accentSoft: isDark ? "#352A14" : "#FEF4D9",
  accentText: isDark ? "#F3C55E" : "#B88714",

  // Backgrounds & Surfaces
  background: isDark ? "#081A33" : "#F4F7FB",
  surface: isDark ? "#142F52" : "#FFFFFF",
  surfaceMuted: isDark ? "#102B55" : "#EDF2F8",
  surfaceRaised: isDark ? "#1B3A60" : "#FFFFFF",
  card: isDark ? "#142F52" : "#FFFFFF",

  // Typography
  text: isDark ? "#F4F7FB" : "#17263D",
  textSecondary: isDark ? "#B5C3D6" : "#748197",
  textMuted: isDark ? "#8CA0BA" : "#9AA8BC",

  // Structural Borders
  border: isDark ? "#294568" : "#E4EAF1",
  borderSubtle: isDark ? "rgba(41, 69, 104, 0.6)" : "rgba(228, 234, 241, 0.8)",

  // Status Colors
  success: isDark ? "#2ED389" : "#22A06B",
  successSoft: isDark ? "#0F3A29" : "#EAF7EE",
  warning: isDark ? "#E9B544" : "#E8A23A",
  warningSoft: isDark ? "#3A2E12" : "#FEF4E8",
  danger: isDark ? "#FF6B6B" : "#DC5555",
  dangerSoft: isDark ? "#411B20" : "#FDECEE",
  info: isDark ? "#4BA0F2" : "#174A83",
  infoSoft: isDark ? "#163A63" : "#EAF2FA",

  // Bottom Navigation
  navBackground: isDark ? "#081A33" : "#102B55",
  navActive: "#E9B544",
  navInactive: isDark ? "#8CA0BA" : "rgba(255, 255, 255, 0.65)",
  navActiveBg: isDark ? "rgba(233, 181, 68, 0.16)" : "rgba(233, 181, 68, 0.18)",
});

type ThemeColors = ReturnType<typeof getColors>;

/* ==========================================================================
   MICRO-INTERACTIONS & ANIMATED PRIMITIVES
   ========================================================================== */

/** Tactile press feedback with spring scale */
function PressableScale({
  onPress,
  children,
  style,
  disabled,
  activeScale = 0.96,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
  activeScale?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Vector Icons */
function AppIcon({
  name,
  size = 20,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const iconColor = color || "#17263D";

  const renderIcon = () => {
    switch (name) {
      case "home":
        return <Feather name="home" size={size} color={iconColor} />;
      case "calendar":
        return <Feather name="calendar" size={size} color={iconColor} />;
      case "check":
        return <Feather name="check" size={size} color={iconColor} />;
      case "user":
        return <Feather name="user" size={size} color={iconColor} />;
      case "bell":
        return <Feather name="bell" size={size} color={iconColor} />;
      case "cloud":
        return <Feather name="cloud" size={size} color={iconColor} />;
      case "wifiOff":
        return <Feather name="wifi-off" size={size} color={iconColor} />;
      case "chevron":
        return <Feather name="chevron-right" size={size} color={iconColor} />;
      case "back":
        return <Feather name="chevron-left" size={size} color={iconColor} />;
      case "map":
        return <Feather name="map-pin" size={size} color={iconColor} />;
      case "clock":
        return <Feather name="clock" size={size} color={iconColor} />;
      case "megaphone":
        return <Ionicons name="megaphone-outline" size={size} color={iconColor} />;
      case "camera":
        return <Feather name="camera" size={size} color={iconColor} />;
      case "file":
        return <Feather name="file-text" size={size} color={iconColor} />;
      case "settings":
        return <Feather name="settings" size={size} color={iconColor} />;
      case "logout":
        return <Feather name="log-out" size={size} color={iconColor} />;
      case "language":
        return <Feather name="globe" size={size} color={iconColor} />;
      case "moon":
        return <Feather name="moon" size={size} color={iconColor} />;
      case "sun":
        return <Feather name="sun" size={size} color={iconColor} />;
      case "lock":
        return <Feather name="lock" size={size} color={iconColor} />;
      case "eye":
        return <Feather name="eye" size={size} color={iconColor} />;
      case "eyeOff":
        return <Feather name="eye-off" size={size} color={iconColor} />;
      case "shield":
        return <Feather name="shield" size={size} color={iconColor} />;
      case "award":
        return <Feather name="award" size={size} color={iconColor} />;
      case "info":
        return <Feather name="info" size={size} color={iconColor} />;
      case "checkCircle":
        return <Feather name="check-circle" size={size} color={iconColor} />;
      case "users":
        return <Feather name="users" size={size} color={iconColor} />;
      case "barChart":
        return <Feather name="bar-chart-2" size={size} color={iconColor} />;
      case "mail":
        return <Feather name="mail" size={size} color={iconColor} />;
      case "arrowRight":
        return <Feather name="arrow-right" size={size} color={iconColor} />;
      case "arrowLeft":
        return <Feather name="arrow-left" size={size} color={iconColor} />;
      case "login":
        return <Feather name="log-in" size={size} color={iconColor} />;
      case "alertCircle":
        return <Feather name="alert-circle" size={size} color={iconColor} />;
      case "refresh":
        return <Feather name="refresh-cw" size={size} color={iconColor} />;
      case "server":
        return <Feather name="server" size={size} color={iconColor} />;
      case "more":
      default:
        return <Feather name="more-horizontal" size={size} color={iconColor} />;
    }
  };

  if (style) {
    return <View style={style}>{renderIcon()}</View>;
  }
  return renderIcon();
}

/** Status Badge */
function StatusBadge({
  state,
  label,
  colors,
}: {
  state: "success" | "danger" | "warning" | "info" | "neutral";
  label: string;
  colors: ThemeColors;
}) {
  let bg = colors.surfaceMuted;
  let text = colors.textSecondary;
  let dot = colors.textSecondary;

  if (state === "success") {
    bg = colors.successSoft;
    text = colors.success;
    dot = colors.success;
  } else if (state === "danger") {
    bg = colors.dangerSoft;
    text = colors.danger;
    dot = colors.danger;
  } else if (state === "warning") {
    bg = colors.warningSoft;
    text = colors.warning;
    dot = colors.warning;
  } else if (state === "info") {
    bg = colors.infoSoft;
    text = colors.info;
    dot = colors.info;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: dot }]} />
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

/** Official ISSATKR Logo Component — Reusing the Authentic Institutional Logo Asset */
function IssatLogo({
  colors,
  isDark,
  size = "md",
  style,
}: {
  colors: ThemeColors;
  isDark: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  style?: StyleProp<ViewStyle>;
}) {
  const dimensions = {
    sm: { width: 96, height: 35, radius: 8 },
    md: { width: 126, height: 46, radius: 10 },
    lg: { width: 170, height: 62, radius: 12 },
    xl: { width: 220, height: 80, radius: 14 },
  }[size];

  return (
    <View
      style={[
        {
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: "#FFFFFF",
          borderRadius: dimensions.radius,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(16, 43, 85, 0.10)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          paddingHorizontal: 4,
          paddingVertical: 2,
          shadowColor: isDark ? "#000000" : "#102B55",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      <Image
        source={require("./assets/issatk_logo.jpg")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * ArchitecturalHeaderBackground — CORRECTED SIZE & BLENDING
 * Prominent visual element in the upper-right section:
 * - Occupies ~46–50% of screen width, adapting to device.
 * - Extends from top: 0 down to ~285px.
 * - Building facade, pillars, arches, and palm trees clearly visible.
 * - Soft multi-step gradient masks on left and bottom eliminate rectangular edges.
 * - Stationary independent layer behind ScrollView (does not scroll with content).
 * - Touch interactions pass through seamlessly (pointerEvents="none").
 */
function ArchitecturalHeaderBackground({
  isDark,
  colors,
}: {
  isDark: boolean;
  colors: ThemeColors;
}) {
  const { width: screenWidth } = useWindowDimensions();
  // Image occupies approximately 72–75% of device screen width
  const bgWidth = Math.round(screenWidth * 0.74);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.archBgWrap,
        { width: bgWidth },
      ]}
    >
      {/* 1. University Architectural Photograph */}
      <Image
        source={require("./assets/issat_building.jpg")}
        style={[
          styles.archBgImage,
          {
            width: Math.round(screenWidth * 1.18),
            opacity: isDark ? 0.60 : 0.95,
          },
        ]}
        resizeMode="cover"
      />

      {/* 2. Wide, Soft Atmospheric Feathering Mist (Continuous 2D Hermite curves, No Bands, Seamless Edge Dissolve) */}
      <Image
        source={require("./assets/mist_feather_mask.png")}
        style={[
          StyleSheet.absoluteFill,
          {
            tintColor: colors.background,
          },
        ]}
        resizeMode="stretch"
      />

      {/* 3. Dark Mode Ambient Navy Depth Tint */}
      {isDark && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#081A33", opacity: 0.28 },
          ]}
        />
      )}
    </View>
  );
}

/** Lightweight screen transition wrapper */
function ScreenTransition({
  screenKey,
  children,
}: {
  screenKey: string;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screenKey]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: "transparent",
        opacity: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        }),
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Gentle subtle fade transition for tabs and filter updates */
function SubtleFadeTransition({
  triggerKey,
  children,
}: {
  triggerKey: string;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [triggerKey]);

  return (
    <Animated.View
      style={{
        opacity: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.45, 1],
        }),
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Smooth animated dialog modal */
function SmoothDialog({
  visible,
  onClose,
  title,
  message,
  confirmText = "OK",
  cancelText,
  onConfirm,
  colors,
  icon = "info",
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  colors: ThemeColors;
  icon?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 26,
        bounciness: 3,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal
      transparent
      visible={rendered}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.58],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.modalIconWrap,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <AppIcon name={icon} size={22} color={colors.accent} />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.modalActions}>
            {cancelText && (
              <PressableScale
                style={[
                  styles.modalCancelBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {cancelText}
                </Text>
              </PressableScale>
            )}
            <PressableScale
              style={[
                styles.modalConfirmBtn,
                { backgroundColor: colors.primaryStrong },
              ]}
              onPress={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Standard AppHeader for secondary screens (Timetable, Attendance, Class, etc.)
 */
function AppHeader({
  title,
  subtitle,
  online,
  onToggleOnline,
  onNotifications,
  lang,
  onBack,
  colors,
  isDark,
}: {
  title: string;
  subtitle?: string;
  online: boolean;
  onToggleOnline: () => void;
  onNotifications?: () => void;
  lang: Lang;
  onBack?: () => void;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const isRTL = lang === "ar";

  return (
    <View
      style={[
        styles.standardHeader,
        {
          backgroundColor: isDark
            ? "rgba(8, 26, 51, 0.72)"
            : "rgba(244, 247, 251, 0.78)",
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.headerLine, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {onBack ? (
          <PressableScale
            style={[
              styles.backButtonWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginRight: isRTL ? 0 : 10,
                marginLeft: isRTL ? 10 : 0,
              },
            ]}
            onPress={onBack}
          >
            <AppIcon
              name="back"
              size={18}
              color={colors.primary}
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </PressableScale>
        ) : null}

        <View style={[styles.titleStack, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          {subtitle ? (
            <View style={[styles.subtitleLine, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <AppIcon
                name="calendar"
                size={11}
                color={isDark ? colors.accent : colors.secondary}
              />
              <Text
                style={[
                  styles.eyebrow,
                  { color: isDark ? colors.accent : colors.secondary },
                ]}
              >
                {subtitle}
              </Text>
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.standardHeaderTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
          >
            {title}
          </Text>
        </View>

        <View style={[styles.headerActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <PressableScale
            onPress={onToggleOnline}
            style={[
              styles.connectivity,
              {
                backgroundColor: online ? colors.successSoft : colors.surfaceMuted,
                borderColor: online ? "rgba(34, 160, 107, 0.25)" : colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <AppIcon
              name={online ? "cloud" : "wifiOff"}
              size={12}
              color={online ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.connectivityText,
                { color: online ? colors.success : colors.textSecondary },
              ]}
            >
              {online ? copy[lang].synced : copy[lang].offline}
            </Text>
          </PressableScale>

          {onNotifications && (
            <PressableScale
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
              onPress={onNotifications}
            >
              <AppIcon name="bell" size={18} color={colors.text} />
              <View
                style={[
                  styles.unreadDotBadge,
                  {
                    backgroundColor: colors.danger,
                    borderColor: colors.surface,
                  },
                ]}
              />
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
}

/** Offline Notice */
function OfflineNotice({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.offlineNotice, { backgroundColor: colors.warningSoft, borderColor: "rgba(233, 181, 68, 0.3)" }]}>
      <AppIcon name="wifiOff" size={17} color={colors.warning} />
      <View style={styles.offlineNoticeTexts}>
        <Text style={[styles.offlineNoticeTitle, { color: colors.warning }]}>
          Données en cache
        </Text>
        <Text style={[styles.offlineNoticeDesc, { color: colors.textSecondary }]}>
          Dernière mise à jour aujourd’hui à 10:42
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================================
   SCHEDULE & TIMELINE DATA
   ========================================================================== */
type ClassItem = {
  timetableEntryId?: string;
  sessionId?: string | null;
  time: string;
  end: string;
  subject: string;
  subjectCode?: string;
  meta: string;
  room?: string;
  className?: string;
  status: string;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  current?: boolean;
  unread?: boolean;
  startMinutes?: number;
};

const emptyClasses: ClassItem[] = [];

/** Class Timeline Row */
const ClassRow = React.memo(function ClassRow({
  item,
  onClick,
  colors,
  isLast = false,
  isRTL = false,
}: {
  item: ClassItem;
  onClick: () => void;
  colors: ThemeColors;
  isLast?: boolean;
  isRTL?: boolean;
}) {
  return (
    <PressableScale
      onPress={onClick}
      style={[
        styles.classRow,
        {
          backgroundColor: item.current ? colors.primarySoft : colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : 1,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View style={styles.classTimeCol}>
        <Text style={[styles.classTimeMain, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>{item.time}</Text>
        <Text style={[styles.classTimeSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{item.end}</Text>
      </View>
      <View style={styles.timelineMark}>
        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: item.current ? colors.accent : colors.surface,
              borderColor: item.current ? colors.accent : colors.textSecondary,
            },
          ]}
        />
      </View>
      <View style={[styles.classContentCol, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <View style={[styles.classHeadingRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text numberOfLines={1} style={[styles.classSubject, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {item.subject}
          </Text>
          {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />}
        </View>
        <Text numberOfLines={1} style={[styles.classMeta, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {item.meta}
        </Text>
        <StatusBadge state={item.tone} label={item.status} colors={colors} />
      </View>
      <AppIcon
        name="chevron"
        size={17}
        color={colors.textSecondary}
        style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
      />
    </PressableScale>
  );
});

/* ==========================================================================
   BOTTOM NAVIGATION BAR WITH SLIDING INDICATOR
   ========================================================================== */
interface BottomNavProps {
  currentTab: Screen;
  onNavigate: (screen: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  scrollX: Animated.Value;
  screenWidth: number;
}

const TABS: { icon: string; screen: Screen; labelKey: keyof typeof copy.fr }[] = [
  { icon: "home", screen: "home", labelKey: "home" },
  { icon: "calendar", screen: "timetable", labelKey: "timetable" },
  { icon: "check", screen: "attendance", labelKey: "attendance" },
  { icon: "user", screen: "profile", labelKey: "profile" },
];

function BottomNav({
  currentTab,
  onNavigate,
  lang,
  colors,
  isDark,
  scrollX,
  screenWidth,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const tabWidth = screenWidth / 4;
  // Increased width: extends comfortably beyond both sides of the 22px icon (18px padding each side)
  const indicatorWidth = 58;
  // Current height preserved exactly (28px)
  const indicatorHeight = 28;
  const indicatorLeftOffset = (tabWidth - indicatorWidth) / 2;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, screenWidth, 2 * screenWidth, 3 * screenWidth],
    outputRange: [0, tabWidth, 2 * tabWidth, 3 * tabWidth],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[
        styles.bottomNavContainer,
        {
          backgroundColor: colors.navBackground,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {/* Compact Sliding Active Icon Highlight (Instagram-inspired: height only slightly greater than icon, 3-4px vertical padding, 6-8px horizontal padding) */}
      <Animated.View
        style={[
          styles.bottomNavCompactIndicator,
          {
            width: indicatorWidth,
            height: indicatorHeight,
            borderRadius: indicatorHeight / 2,
            backgroundColor: isDark
              ? "rgba(233, 181, 68, 0.16)"
              : "rgba(233, 181, 68, 0.18)",
            transform: [
              {
                translateX: Animated.add(
                  indicatorTranslateX,
                  indicatorLeftOffset
                ),
              },
            ],
          },
        ]}
      />

      {TABS.map((tab) => {
        const isActive = currentTab === tab.screen;
        const label = copy[lang][tab.labelKey];

        return (
          <TouchableOpacity
            key={tab.screen}
            onPress={() => onNavigate(tab.screen)}
            style={[styles.bottomNavItem, { width: tabWidth }]}
            activeOpacity={0.7}
          >
            <View style={styles.bottomNavIconWrap}>
              <AppIcon
                name={tab.icon}
                size={22}
                color={isActive ? colors.navActive : colors.navInactive}
              />
            </View>
            <Text
              style={[
                styles.bottomNavLabel,
                {
                  color: isActive ? colors.navActive : colors.navInactive,
                  fontWeight: isActive ? "800" : "500",
                },
              ]}
            >
              {label}
            </Text>
            {/* Active Gold Indicator underline matching reference */}
            <View
              style={[
                styles.bottomNavIndicatorBar,
                {
                  backgroundColor: isActive ? colors.accent : "transparent",
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ==========================================================================
   SCREENS IMPLEMENTATION
   ========================================================================== */

/**
 * 1. LoginScreen
 */
function LoginScreen({
  onLogin,
  role,
  setRole,
  lang,
  setLang,
  theme,
  setTheme,
  colors,
  isDark,
  onOpenApiConfig,
}: {
  onLogin: (user: any) => void;
  role: Role;
  setRole: (r: Role) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  colors: ThemeColors;
  isDark: boolean;
  onOpenApiConfig: () => void;
}) {
  const [email, setEmail] = useState(
    role === "student" ? "etudiant@issatk.rnu.tn" : "enseignant@issatk.rnu.tn"
  );
  const [password, setPassword] = useState("issatk2025");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const isRTL = lang === "ar";

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setLoginError(null);
    setEmail(
      newRole === "student"
        ? "etudiant@issatk.rnu.tn"
        : "enseignant@issatk.rnu.tn"
    );
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setLoginError(
        lang === "fr"
          ? "Veuillez renseigner votre identifiant et votre mot de passe."
          : lang === "ar"
          ? "يرجى إدخال المعرف الجامعي وكلمة المرور."
          : "Please enter your ID and password."
      );
      return;
    }
    setLoading(true);
    setLoginError(null);
    try {
      const res = await api.auth.login(email.trim(), password);
      setLoading(false);
      onLogin(res.user);
    } catch (err: any) {
      setLoading(false);
      setLoginError(
        err.message ||
          (lang === "fr"
            ? "Impossible de se connecter au serveur ISSATK via ngrok."
            : "Cannot connect to ISSATK backend server.")
      );
    }
  };

  const cycleLang = () => {
    if (lang === "fr") setLang("en");
    else if (lang === "en") setLang("ar");
    else setLang("fr");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "transparent" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.loginScreenScroll}
        contentContainerStyle={[
          styles.loginScreenContent,
          { backgroundColor: "transparent" },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Actions */}
        <View style={[styles.loginTopBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View
            style={[
              styles.institutionTag,
              { backgroundColor: colors.primarySoft, borderColor: colors.border },
            ]}
          >
            <AppIcon name="shield" size={13} color={colors.accent} />
            <Text style={[styles.institutionTagText, { color: colors.text }]}>
              {buttonCopy[lang].portalTitle}
            </Text>
          </View>
          <View style={[styles.loginTopActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <PressableScale
              style={[
                styles.compactControl,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={cycleLang}
            >
              <AppIcon name="language" size={13} color={colors.textSecondary} />
              <Text style={[styles.compactControlText, { color: colors.textSecondary }]}>
                {lang === "fr" ? "FR" : lang === "en" ? "EN" : "عربي"}
              </Text>
            </PressableScale>
            <PressableScale
              style={[
                styles.compactControl,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setTheme(isDark ? "light" : "dark")}
            >
              <AppIcon
                name={isDark ? "sun" : "moon"}
                size={13}
                color={colors.textSecondary}
              />
              <Text style={[styles.compactControlText, { color: colors.textSecondary }]}>
                {isDark ? "Clair" : "Sombre"}
              </Text>
            </PressableScale>
          </View>
        </View>

        {/* Central Brand & Login Card */}
        <View
          style={[
            styles.loginCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View style={styles.brandBlock}>
            <IssatLogo colors={colors} isDark={isDark} size="xl" />
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              My ISSATkr
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              {buttonCopy[lang].portalSubtitle}
            </Text>
          </View>

          {/* Role Switcher */}
          <View
            style={[
              styles.roleSwitch,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.roleSwitchButton,
                role === "student" && [
                  styles.roleSwitchButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => handleRoleChange("student")}
              activeOpacity={0.8}
            >
              <AppIcon
                name="user"
                size={14}
                color={role === "student" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleSwitchText,
                  {
                    color: role === "student" ? colors.text : colors.textSecondary,
                    fontWeight: role === "student" ? "700" : "500",
                  },
                ]}
              >
                {buttonCopy[lang].student}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleSwitchButton,
                role === "teacher" && [
                  styles.roleSwitchButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => handleRoleChange("teacher")}
              activeOpacity={0.8}
            >
              <AppIcon
                name="check"
                size={14}
                color={role === "teacher" ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleSwitchText,
                  {
                    color: role === "teacher" ? colors.text : colors.textSecondary,
                    fontWeight: role === "teacher" ? "700" : "500",
                  },
                ]}
              >
                {buttonCopy[lang].teacher}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick API / ngrok Configuration Pill */}
          <TouchableOpacity
            onPress={onOpenApiConfig}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              paddingVertical: 5,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(233, 181, 68, 0.12)" : colors.accentSoft,
              borderWidth: 1,
              borderColor: isDark ? "rgba(233, 181, 68, 0.3)" : "rgba(233, 181, 68, 0.4)",
              marginBottom: 10,
            }}
            activeOpacity={0.7}
          >
            <AppIcon name="server" size={13} color={colors.accentText || colors.accent} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: isDark ? colors.accent : colors.secondary,
                marginLeft: isRTL ? 0 : 6,
                marginRight: isRTL ? 6 : 0,
              }}
            >
              {lang === "fr" ? "Configuration API & ngrok" : lang === "ar" ? "إعدادات رابط ngrok" : "API & ngrok Settings"}
            </Text>
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formStack}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {buttonCopy[lang].institutionalId}
              </Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputPrefixIcon, isRTL && { left: undefined, right: 14 }]}>
                  <AppIcon name="mail" size={17} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    isRTL ? { paddingRight: 42, paddingLeft: 14, textAlign: "right" } : styles.inputWithPrefix,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="identifiant@issatk.rnu.tn"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={[styles.fieldHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {buttonCopy[lang].password}
                </Text>
              </View>
              <View style={styles.passwordWrap}>
                <View style={[styles.inputPrefixIcon, isRTL && { left: undefined, right: 14 }]}>
                  <AppIcon name="lock" size={17} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    isRTL ? { paddingRight: 42, paddingLeft: 46, textAlign: "right" } : styles.inputWithPrefix,
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={[styles.passwordToggle, isRTL && { right: undefined, left: 14 }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AppIcon
                    name={showPassword ? "eyeOff" : "eye"}
                    size={17}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.forgotButton, { alignSelf: isRTL ? "flex-start" : "flex-end" }]}
              onPress={() => setForgotModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.forgotText, { color: isDark ? colors.accent : colors.secondary }]}>
                {buttonCopy[lang].forgotPassword}
              </Text>
            </TouchableOpacity>

            {loginError && (
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <AppIcon name="alertCircle" size={16} color={colors.danger} />
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginLeft: isRTL ? 0 : 8,
                    marginRight: isRTL ? 8 : 0,
                    flex: 1,
                    fontWeight: "600",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {loginError}
                </Text>
              </View>
            )}

            <PressableScale
              style={[
                styles.primaryButton,
                {
                  backgroundColor: isDark ? colors.accent : colors.primary,
                  shadowColor: isDark ? colors.accent : colors.primary,
                },
              ]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: isDark ? "#081A33" : "#FFFFFF" },
                    ]}
                  >
                    {buttonCopy[lang].connecting}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.buttonContentRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {
                        color: isDark ? "#081A33" : "#FFFFFF",
                        marginRight: isRTL ? 0 : 8,
                        marginLeft: isRTL ? 8 : 0,
                      },
                    ]}
                  >
                    {buttonCopy[lang].signIn}
                  </Text>
                  <View style={styles.buttonIconWrap}>
                    <AppIcon
                      name={isRTL ? "arrowLeft" : "arrowRight"}
                      size={16}
                      color={isDark ? "#081A33" : "#FFFFFF"}
                    />
                  </View>
                </View>
              )}
            </PressableScale>
          </View>
        </View>

        {/* Academic Footer */}
        <View style={styles.loginFooter}>
          <View style={[styles.securityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <AppIcon name="lock" size={13} color={colors.accent} />
            <Text style={[styles.secureNote, { color: colors.textSecondary }]}>
              {buttonCopy[lang].secureAccess}
            </Text>
          </View>
          <Text style={[styles.universityAffiliation, { color: colors.textSecondary }]}>
            {buttonCopy[lang].institutionName}
          </Text>
        </View>

        <SmoothDialog
          visible={forgotModalVisible}
          onClose={() => setForgotModalVisible(false)}
          title={lang === "ar" ? "استرجاع الحساب" : lang === "fr" ? "Récupération d'accès" : "Access Recovery"}
          message={
            lang === "ar"
              ? "يرجى الاتصال بمصلحة شؤون الطلبة أو مصلحة الإعلامية بالمعهد (مكتب A12 أو scolarite@issatk.rnu.tn) مصحوباً ببطاقة الطالب أو المعرف الجامعي."
              : lang === "fr"
              ? "Veuillez contacter le service scolarité ou l'administrateur informatique de l'ISSATK (bureau A12 ou scolarite@issatk.rnu.tn) muni de votre carte d'étudiant ou identifiant enseignant."
              : "Please contact the ISSATK administration office or IT department (Office A12 or scolarite@issatk.rnu.tn) with your university ID."
          }
          confirmText={buttonCopy[lang].done}
          colors={colors}
          icon="info"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * 2. HomeScreen — FAITHFUL HERITAGE NAVY REFERENCE MATCH
 * - Stationary prominent university architectural photograph in upper-right (~48% width, 285px height)
 * - Transparent air top bar: Official ISSAT logo on left, notification bell circle on right
 * - Spacious greeting section on left ("Bonjour," / "Amine 👋" / 📅 "Mardi 18 mars 2025")
 * - Next Class card with gold accent bar, "Next Class" pill, and circular action button
 * - Generous section spacing (24–28px) and 22px horizontal screen padding
 * - "Today's Schedule" timeline card with Active / Upcoming badges
 * - "Attendance Today" deep navy card with gold circular progress ring
 * - "Quick Actions" 4-card grid
 */
function HomeScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  currentUser,
  onSelectClass,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  currentUser: any | null;
  onSelectClass: (c: any) => void;
}) {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data =
        role === "teacher"
          ? await api.teacher.getDashboard()
          : await api.student.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || "Impossible de joindre le backend Express.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const isRTL = lang === "ar";

  const greetingName = currentUser?.firstName
    ? role === "teacher"
      ? `Mme. ${currentUser.lastName || currentUser.firstName}`
      : currentUser.firstName
    : dashboard?.teacher?.fullName ||
      dashboard?.student?.fullName ||
      (role === "teacher" ? "Professeur" : "Étudiant");

  const todayFormatted =
    dashboard?.today?.dateFormatted ||
    (lang === "fr" ? "Aujourd'hui" : lang === "ar" ? "اليوم" : "Today");

  const classes: ClassItem[] = dashboard?.classes || [];
  const nextClass = dashboard?.nextClass;

  const attendanceBig =
    role === "teacher"
      ? `${dashboard?.quickStats?.completedTodayCount ?? 0} / ${
          dashboard?.quickStats?.totalSessionsToday ?? classes.length
        }`
      : `${dashboard?.quickStats?.attendanceRate ?? 92}%`;

  const attendanceSub =
    role === "teacher"
      ? dashboard?.attendanceSummary?.attendanceRate
        ? `${dashboard.attendanceSummary.attendanceRate}% de présence moyenne`
        : lang === "ar"
        ? "Séances enregistrées"
        : "Séances de la journée"
      : lang === "ar"
      ? `${classes.length} حصص مقررة اليوم`
      : `${classes.length} cours prévus aujourd'hui`;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* 1. Top Header Bar (Matching Reference Image) */}
      <View style={[styles.homeTopBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <IssatLogo colors={colors} isDark={isDark} size="md" />

        <View style={[styles.homeTopActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <PressableScale
            onPress={toggleOnline}
            style={[
              styles.connectivity,
              {
                backgroundColor: online ? colors.successSoft : colors.surfaceMuted,
                borderColor: online ? "rgba(34, 160, 107, 0.25)" : colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <AppIcon
              name={online ? "cloud" : "wifiOff"}
              size={12}
              color={online ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.connectivityText,
                { color: online ? colors.success : colors.textSecondary },
              ]}
            >
              {online ? copy[lang].synced : copy[lang].offline}
            </Text>
          </PressableScale>

          <PressableScale
            style={[
              styles.notificationBellCircle,
              {
                backgroundColor: isDark ? colors.surfaceRaised : "#FFFFFF",
                borderColor: isDark ? colors.border : "rgba(16, 43, 85, 0.08)",
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
            onPress={() => navigate("notifications")}
          >
            <AppIcon name="bell" size={18} color={colors.text} />
            <View
              style={[
                styles.notificationRedDot,
                {
                  backgroundColor: colors.danger,
                  borderColor: isDark ? colors.surfaceRaised : "#FFFFFF",
                },
              ]}
            />
          </PressableScale>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* 3. Spacious Greeting Section (Upper-Left alongside the prominent building) */}
        <View style={[styles.homeGreetingSection, isRTL && { alignSelf: "flex-end", alignItems: "flex-end" }]}>
          <Text style={[styles.greetingSalutation, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {lang === "fr" ? "Bonjour," : lang === "ar" ? "مرحباً،" : "Good morning,"}
          </Text>
          <Text style={[styles.greetingName, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {greetingName} 👋
          </Text>
          <View style={[styles.greetingDateRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <AppIcon
              name="calendar"
              size={13}
              color={isDark ? colors.accent : colors.secondary}
            />
            <Text
              style={[
                styles.greetingDateText,
                { color: colors.textSecondary },
              ]}
            >
              {todayFormatted}
            </Text>
          </View>
        </View>

        {!online && <OfflineNotice colors={colors} />}

        {/* Real Network / Server Error Display */}
        {error && (
          <ApiErrorCard
            message={error}
            onRetry={loadData}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Loading Spinner */}
        {loading && !dashboard && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary }}>
              {lang === "fr" ? "Chargement des cours en temps réel…" : "Loading courses…"}
            </Text>
          </View>
        )}

        {/* 4. Next Class Highlight Card (Exact Reference Design Match) */}
        {nextClass ? (
          <View
            style={[
              styles.nextCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.border : "transparent",
                shadowColor: isDark ? "#000" : "#102B55",
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            {/* Gold Accent Strip on left */}
            <View style={[styles.nextCardAccentBar, { backgroundColor: colors.accent }]} />

            <View style={styles.nextCardBody}>
              <View style={[styles.nextCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.nextBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.nextBadgeText, { color: colors.accentText }]}>
                    {copy[lang].next}
                  </Text>
                </View>
                <View
                  style={[
                    styles.timeBadge,
                    {
                      backgroundColor: isDark ? colors.surfaceRaised : "#EBF1F8",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeBadgeText,
                      { color: isDark ? colors.textSecondary : colors.secondary },
                    ]}
                  >
                    {nextClass.countdown || (lang === "fr" ? "À venir" : "Upcoming")}
                  </Text>
                </View>
              </View>

              <View style={[styles.nextCardContentRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={{ flex: 1, paddingRight: isRTL ? 0 : 10, paddingLeft: isRTL ? 10 : 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.nextTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
                  >
                    {nextClass.subject}
                  </Text>
                  <View style={[styles.nextMetaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <View style={[styles.nextInfoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <AppIcon name="clock" size={13} color={colors.textSecondary} />
                      <Text style={[styles.nextInfoText, { color: colors.textSecondary }]}>
                        {nextClass.time} – {nextClass.end}
                      </Text>
                    </View>
                    <Text style={[styles.metaDivider, { color: colors.border }]}>|</Text>
                    <View style={[styles.nextInfoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <AppIcon name="map" size={13} color={colors.textSecondary} />
                      <Text
                        numberOfLines={1}
                        style={[styles.nextInfoText, { color: colors.textSecondary }]}
                      >
                        {nextClass.meta || `${nextClass.room || ''} · ${nextClass.className || ''}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Circular Action Button */}
                <PressableScale
                  onPress={() => {
                    onSelectClass(nextClass);
                    navigate("class");
                  }}
                  style={[
                    styles.nextCircleBtn,
                    { backgroundColor: isDark ? colors.accent : "#102B55" },
                  ]}
                >
                  <AppIcon
                    name="chevron"
                    size={18}
                    color={isDark ? "#081A33" : "#FFFFFF"}
                    style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
                  />
                </PressableScale>
              </View>
            </View>
          </View>
        ) : !loading ? (
          <View
            style={[
              styles.nextCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 14,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <AppIcon name="calendar" size={22} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6, fontWeight: "500" }}>
              {lang === "fr"
                ? "Aucun cours imminent programmé aujourd’hui."
                : lang === "ar"
                ? "لا توجد حصة قادمة مبرمجة حالياً."
                : "No imminent class scheduled today."}
            </Text>
          </View>
        ) : null}

        {/* 5. Today's Schedule Section */}
        <View style={[styles.sectionHeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {copy[lang].todaysSchedule}
          </Text>
          <TouchableOpacity
            onPress={() => navigate("timetable")}
            activeOpacity={0.7}
            style={[styles.viewAllRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Text style={[styles.viewAllText, { color: isDark ? colors.accent : colors.secondary }]}>
              {copy[lang].viewAll}
            </Text>
            <AppIcon
              name="chevron"
              size={13}
              color={isDark ? colors.accent : colors.secondary}
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </TouchableOpacity>
        </View>

        {/* Daily Schedule Timeline Card or Empty State */}
        {classes.length > 0 ? (
          <View
            style={[
              styles.timelineList,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            {classes.map((item, idx) => (
              <ClassRow
                item={item}
                key={item.timetableEntryId || `${item.time}-${idx}`}
                onClick={() => {
                  onSelectClass(item);
                  navigate("class");
                }}
                colors={colors}
                isLast={idx === classes.length - 1}
                isRTL={isRTL}
              />
            ))}
          </View>
        ) : !loading ? (
          <EmptyState
            icon="calendar"
            title={
              lang === "fr"
                ? "Aucun cours aujourd'hui"
                : lang === "ar"
                ? "لا توجد حصص مبرمجة اليوم"
                : "No classes scheduled today"
            }
            subtitle={
              lang === "fr"
                ? "Vous n'avez aucun cours prévu pour cette journée. Consultez l'emploi du temps complet."
                : lang === "ar"
                ? "ليس لديك أي حصة مبرمجة لهذا اليوم. يمكنك مراجعة جدول الأوقات الأسبوعي."
                : "You have no classes scheduled today. Check the weekly timetable."
            }
            actionLabel={lang === "fr" ? "Voir l'emploi du temps" : "View Timetable"}
            onAction={() => navigate("timetable")}
            colors={colors}
          />
        ) : null}

        {/* 6. Attendance Summary Card (Heritage Navy Reference Feature) */}
        <PressableScale
          onPress={() => navigate("attendance")}
          style={[
            styles.attendanceSummaryCard,
            {
              backgroundColor: isDark ? "#142F52" : "#102B55",
              borderColor: isDark ? colors.border : "rgba(233, 181, 68, 0.3)",
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={[styles.attendanceSummaryLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.attendanceIconWrap}>
              <AppIcon name="users" size={22} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
              <Text style={[styles.attendanceSummaryLabel, { textAlign: isRTL ? "right" : "left" }]}>
                {copy[lang].attendanceRate}
              </Text>
              <Text style={[styles.attendanceSummaryBig, { textAlign: isRTL ? "right" : "left" }]}>
                {attendanceBig}
              </Text>
              <Text style={[styles.attendanceSummarySub, { textAlign: isRTL ? "right" : "left" }]}>
                {attendanceSub}
              </Text>
            </View>
          </View>

          {/* Right Progress Ring & Chevron */}
          <View style={styles.attendanceSummaryRight}>
            <View style={styles.progressRingSim}>
              <View style={[styles.progressRingSegment, { borderColor: colors.accent }]} />
              <AppIcon
                name="chevron"
                size={16}
                color="#FFFFFF"
                style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
              />
            </View>
          </View>
        </PressableScale>

        {/* 7. Quick Actions Grid */}
        <View style={[styles.sectionHeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {copy[lang].quickActions}
          </Text>
        </View>

        <View style={[styles.quickActionsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <PressableScale
            onPress={() => navigate("timetable")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primarySoft }]}>
              <AppIcon name="calendar" size={20} color={colors.primary} />
            </View>
            <Text numberOfLines={1} style={[styles.quickActionLabel, { color: colors.text }]}>
              {copy[lang].viewTimetable}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={() => navigate("attendance")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.accentSoft }]}>
              <AppIcon name="check" size={20} color={colors.accent} />
            </View>
            <Text numberOfLines={1} style={[styles.quickActionLabel, { color: colors.text }]}>
              {copy[lang].manageAttendance}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={() => navigate("notifications")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.infoSoft }]}>
              <AppIcon name="megaphone" size={20} color={colors.info} />
            </View>
            <Text numberOfLines={1} style={[styles.quickActionLabel, { color: colors.text }]}>
              {copy[lang].announcements}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={() => navigate("profile")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.surfaceMuted }]}>
              <AppIcon name="settings" size={20} color={colors.textSecondary} />
            </View>
            <Text numberOfLines={1} style={[styles.quickActionLabel, { color: colors.text }]}>
              {copy[lang].settings}
            </Text>
          </PressableScale>
        </View>

        {/* Teacher Administrative Requests Strip */}
        {role === "teacher" && (
          <PressableScale
            style={[
              styles.requestStrip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
            onPress={() => navigate("requests")}
          >
            <View
              style={[
                styles.requestIcon,
                { backgroundColor: colors.accentSoft },
              ]}
            >
              <AppIcon name="file" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.requestStripTitle, { color: colors.text }]}>
                Demandes administratives
              </Text>
              <Text
                style={[
                  styles.requestStripSub,
                  { color: colors.textSecondary },
                ]}
              >
                1 demande en cours d’examen
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.textSecondary} />
          </PressableScale>
        )}

        {/* Student Quick Scan Certificate Banner */}
        {role === "student" && (
          <PressableScale
            style={[
              styles.requestStrip,
              {
                backgroundColor: colors.card,
                borderColor: colors.accent,
                borderWidth: 1.5,
                shadowColor: isDark ? "#000" : "#102B55",
                marginTop: 10,
              },
            ]}
            onPress={() => navigate("scanner")}
          >
            <View
              style={[
                styles.requestIcon,
                { backgroundColor: colors.accentSoft },
              ]}
            >
              <AppIcon name="camera" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.requestStripTitle, { color: colors.text, fontWeight: "700" }]}>
                {lang === "fr" ? "Scanner un certificat" : lang === "ar" ? "مسح شهادة طبية" : "Scan Certificate"}
              </Text>
              <Text
                style={[
                  styles.requestStripSub,
                  { color: colors.textSecondary },
                ]}
              >
                {lang === "fr"
                  ? "Prendre en photo ou importer un justificatif d’absence"
                  : lang === "ar"
                  ? "تصوير أو إرفاق شهادة تبرير غياب رسمي"
                  : "Photograph or upload absence medical document"}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.accent} />
          </PressableScale>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * 3. TimetableScreen
 */
function TimetableScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  onSelectClass,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  onSelectClass: (c: any) => void;
}) {
  const isRTL = lang === "ar";
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);

  const days = useMemo(
    () => [
      { key: "MONDAY", fr: "Lun", en: "Mon", ar: "إثن", nameFr: "Lundi", num: "17" },
      { key: "TUESDAY", fr: "Mar", en: "Tue", ar: "ثلا", nameFr: "Mardi", num: "18" },
      { key: "WEDNESDAY", fr: "Mer", en: "Wed", ar: "أرب", nameFr: "Mercredi", num: "19" },
      { key: "THURSDAY", fr: "Jeu", en: "Thu", ar: "خمي", nameFr: "Jeudi", num: "20" },
      { key: "FRIDAY", fr: "Ven", en: "Fri", ar: "جمعة", nameFr: "Vendredi", num: "21" },
      { key: "SATURDAY", fr: "Sam", en: "Sat", ar: "سبت", nameFr: "Samedi", num: "22" },
    ],
    []
  );

  const loadTimetable = useCallback(async () => {
    try {
      setError(null);
      const activeDayKey = days[selectedDayIndex].key;
      const res =
        role === "teacher"
          ? await api.teacher.getSchedule(activeDayKey)
          : await api.student.getTimetable(activeDayKey);
      setScheduleData(res);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement de l'emploi du temps.");
    } finally {
      setLoading(false);
    }
  }, [role, selectedDayIndex, days]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const currentDay = days[selectedDayIndex];

  // Extract classes list from API response
  const rawClasses = scheduleData?.classes || (Array.isArray(scheduleData) ? scheduleData : []);
  const dayClasses: ClassItem[] = rawClasses.map((item: any) => ({
    timetableEntryId: item.timetableEntryId || item.id,
    sessionId: item.sessionId || null,
    time: item.time || item.startTime || "08:30",
    end: item.end || item.endTime || "10:00",
    subject: item.subject?.name || item.subject || "Cours",
    subjectCode: item.subjectCode || item.subject?.code,
    meta: item.meta || `${item.room?.name || item.room || "Salle"} · ${item.className || item.class?.name || "Classe"}`,
    room: item.room?.name || item.room,
    className: item.className || item.class?.name,
    status: item.status || "Programmé",
    tone: item.tone || "neutral",
    current: item.current,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title={lang === "fr" ? "Emploi du temps" : lang === "ar" ? "جدول الحصص" : "Timetable"}
        subtitle={
          lang === "fr"
            ? "Semaine académique en cours"
            : lang === "ar"
            ? "الأسبوع الدراسي الحالي"
            : "Current Academic Week"
        }
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {!online && <OfflineNotice colors={colors} />}

        <View
          style={[
            styles.dayPicker,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          {days.map((d, index) => {
            const isSel = selectedDayIndex === index;
            const label = lang === "ar" ? d.ar : lang === "en" ? d.en : d.fr;
            return (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.dayPickerItem,
                  isSel && [
                    styles.dayPickerItemSelected,
                    { backgroundColor: isDark ? colors.accent : "#102B55" },
                  ],
                ]}
                onPress={() => setSelectedDayIndex(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayPickerDay,
                    {
                      color: isSel
                        ? isDark
                          ? "#081A33"
                          : "#FFFFFF"
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.dayPickerDate,
                    {
                      color: isSel
                        ? isDark
                          ? "#081A33"
                          : "#FFFFFF"
                        : colors.text,
                    },
                  ]}
                >
                  {d.num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.weekControls, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <PressableScale
            style={[
              styles.weekNavBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : days.length - 1))}
          >
            <AppIcon
              name="back"
              size={16}
              color={colors.text}
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </PressableScale>
          <Text style={[styles.weekControlsText, { color: colors.text }]}>
            {lang === "ar"
              ? `يوم ${currentDay.ar}`
              : lang === "en"
              ? `${currentDay.en} schedule`
              : `Journée du ${currentDay.nameFr}`}
          </Text>
          <PressableScale
            style={[
              styles.weekNavBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setSelectedDayIndex((prev) => (prev < days.length - 1 ? prev + 1 : 0))}
          >
            <AppIcon
              name="chevron"
              size={16}
              color={colors.text}
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </PressableScale>
        </View>

        {error && (
          <ApiErrorCard
            message={error}
            onRetry={loadTimetable}
            colors={colors}
            isDark={isDark}
          />
        )}

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
              Chargement de l'emploi du temps…
            </Text>
          </View>
        )}

        <SubtleFadeTransition triggerKey={currentDay.key}>
          {dayClasses.length > 0 ? (
            <View
              style={[
                styles.timelineList,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              {dayClasses.map((item, idx) => (
                <ClassRow
                  item={item}
                  key={item.timetableEntryId || `${item.time}-${idx}`}
                  onClick={() => {
                    onSelectClass(item);
                    navigate("class");
                  }}
                  colors={colors}
                  isLast={idx === dayClasses.length - 1}
                  isRTL={isRTL}
                />
              ))}
            </View>
          ) : !loading ? (
            <EmptyState
              icon="calendar"
              title={lang === "fr" ? "Aucun cours" : "No classes"}
              subtitle={
                lang === "fr"
                  ? `Aucune séance d'enseignement n'est programmée pour le ${currentDay.nameFr}.`
                  : `No class sessions scheduled for this day.`
              }
              colors={colors}
            />
          ) : null}
        </SubtleFadeTransition>
      </ScrollView>
    </View>
  );
}

/**
 * 4. AttendanceScreen
 */
function AttendanceScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  activeSession,
  onSubmissionComplete,
  setSelectedAbsenceRecordId,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  activeSession?: any | null;
  onSubmissionComplete: (result: any) => void;
  setSelectedAbsenceRecordId?: (id: string | null) => void;
}) {
  const isRTL = lang === "ar";

  // --- Student State ---
  const [filter, setFilter] = useState<"Toutes" | "Absences" | "En attente">("Toutes");
  const [studentData, setStudentData] = useState<any | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  const [studentError, setStudentError] = useState<string | null>(null);

  const loadStudentAttendance = useCallback(async () => {
    try {
      setStudentError(null);
      const res = await api.student.getAttendance(filter);
      setStudentData(res);
    } catch (err: any) {
      setStudentError(err.message || "Impossible de charger vos absences.");
    } finally {
      setStudentLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (role === "student") {
      loadStudentAttendance();
    }
  }, [role, loadStudentAttendance]);

  // --- Teacher State ---
  const [roster, setRoster] = useState<any | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, "present" | "absent">>({});

  const loadTeacherRoster = useCallback(async () => {
    try {
      setTeacherError(null);
      let targetId = activeSession?.sessionId || activeSession?.timetableEntryId;

      if (!targetId) {
        // Fallback: look up today's dashboard sessions
        const dash = await api.teacher.getDashboard();
        if (dash?.classes && dash.classes.length > 0) {
          targetId = dash.classes[0].sessionId || dash.classes[0].timetableEntryId;
        }
      }

      if (targetId) {
        const res = await api.teacher.getSessionRoster(targetId);
        setRoster(res);
        if (res?.students && Array.isArray(res.students)) {
          const init: Record<string, "present" | "absent"> = {};
          res.students.forEach((st: any) => {
            init[st.studentId] = st.status || "present";
          });
          setStates(init);
        }
      } else {
        setRoster(null);
      }
    } catch (err: any) {
      setTeacherError(err.message || "Erreur lors du chargement de la liste d'appel.");
    } finally {
      setTeacherLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    if (role === "teacher") {
      loadTeacherRoster();
    }
  }, [role, loadTeacherRoster]);

  if (role === "student") {
    const summary = studentData?.summary || { presences: 0, absences: 0, justified: 0, pending: 0 };
    const records = studentData?.records || [];

    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <AppHeader
          title={lang === "fr" ? "Historique de présence" : lang === "ar" ? "سجل الحضور" : "Attendance Records"}
          subtitle={
            lang === "fr"
              ? "Relevé académique officiel"
              : lang === "ar"
              ? "كشف المواظبة الأكاديمي"
              : "Official Academic Records"
          }
          online={online}
          onToggleOnline={toggleOnline}
          lang={lang}
          colors={colors}
          isDark={isDark}
        />
        <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
          {!online && <OfflineNotice colors={colors} />}

          {studentError && (
            <ApiErrorCard
              message={studentError}
              onRetry={loadStudentAttendance}
              colors={colors}
              isDark={isDark}
            />
          )}

          {studentLoading && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
                Chargement des relevés de présence…
              </Text>
            </View>
          )}

          {/* 3 Summary Grid Stats */}
          <View
            style={[
              styles.summaryGrid,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <View style={[styles.summaryCell, { borderRightColor: colors.border }]}>
              <Text style={[styles.summaryNum, { color: colors.success }]}>{summary.presences}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {lang === "fr" ? "Présences" : lang === "ar" ? "حضور" : "Present"}
              </Text>
            </View>
            <View style={[styles.summaryCell, { borderRightColor: colors.border }]}>
              <Text style={[styles.summaryNum, { color: colors.danger }]}>{summary.absences}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {lang === "fr" ? "Absences" : lang === "ar" ? "غياب" : "Absences"}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryNum, { color: colors.info }]}>{summary.justified}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {lang === "fr" ? "Justifiée" : lang === "ar" ? "مبرر" : "Justified"}
              </Text>
            </View>
          </View>

          {/* Top Prominent Scan Action Card */}
          <PressableScale
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.accent,
                borderWidth: 1.5,
                shadowColor: isDark ? "#000" : "#102B55",
                marginBottom: 12,
              },
            ]}
            onPress={() => {
              if (setSelectedAbsenceRecordId) setSelectedAbsenceRecordId(null);
              navigate("scanner");
            }}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.accentSoft },
              ]}
            >
              <AppIcon name="camera" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: 13.5, fontWeight: "700" }]}>
                {lang === "fr" ? "Scanner un justificatif médical" : lang === "ar" ? "مسح شهادة طبية" : "Scan Medical Certificate"}
              </Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: colors.textSecondary },
                ]}
              >
                {lang === "fr"
                  ? "Numériser avec la caméra ou choisir un fichier PDF"
                  : lang === "ar"
                  ? "تصوير بالكاميرا أو إرفاق ملف PDF"
                  : "Scan with camera or upload PDF"}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.accent} />
          </PressableScale>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(["Toutes", "Absences", "En attente"] as const).map((tab) => {
              const active = filter === tab;
              const label =
                tab === "Toutes"
                  ? lang === "ar"
                    ? "الكل"
                    : lang === "en"
                    ? "All"
                    : "Toutes"
                  : tab === "Absences"
                  ? lang === "ar"
                    ? "الغيابات"
                    : "Absences"
                  : lang === "ar"
                  ? "قيد الانتظار"
                  : "En attente";
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? (isDark ? colors.accent : "#102B55") : colors.surface,
                      borderColor: active ? "transparent" : colors.border,
                    },
                  ]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active ? (isDark ? "#081A33" : "#FFFFFF") : colors.textSecondary,
                        fontWeight: active ? "700" : "500",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SubtleFadeTransition triggerKey={filter}>
            {records.length > 0 ? (
              <View
                style={[
                  styles.recordList,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: isDark ? "#000" : "#102B55",
                  },
                ]}
              >
                {records.map((r: any, i: number) => (
                  <View
                    key={r.id || `${r.subject}-${i}`}
                    style={[
                      styles.recordRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: i === records.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusMarkCircle,
                        {
                          backgroundColor:
                            r.tone === "success"
                              ? colors.successSoft
                              : r.tone === "danger"
                              ? colors.dangerSoft
                              : r.tone === "warning"
                              ? colors.warningSoft
                              : colors.infoSoft,
                        },
                      ]}
                    >
                      <AppIcon
                        name={r.tone === "danger" ? "more" : "check"}
                        size={14}
                        color={
                          r.tone === "success"
                            ? colors.success
                            : r.tone === "danger"
                            ? colors.danger
                            : r.tone === "warning"
                            ? colors.warning
                            : colors.info
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recordSubject, { color: colors.text }]}>
                        {r.subject}
                      </Text>
                      <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                        {r.date} · {r.timeSlot || "08:30–10:00"}
                      </Text>

                      {(r.tone === "danger" || r.tone === "warning" || r.status === "Absent") && !r.certificateReference && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={{
                            marginTop: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            backgroundColor: colors.accent,
                            borderRadius: 8,
                            alignSelf: "flex-start",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                          }}
                          onPress={() => {
                            if (setSelectedAbsenceRecordId) setSelectedAbsenceRecordId(r.id);
                            navigate("scanner");
                          }}
                        >
                          <AppIcon name="camera" size={13} color="#ffffff" />
                          <Text style={{ fontSize: 11, color: "#ffffff", fontWeight: "700" }}>
                            {lang === "fr" ? "Justifier l’absence" : lang === "ar" ? "تبرير الغياب" : "Justify Absence"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {r.certificateReference && (
                        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Text style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color:
                              r.certificateStatus === "ACCEPTED" ? colors.success :
                              r.certificateStatus === "REJECTED" ? colors.danger :
                              colors.warning,
                          }}>
                            {r.certificateStatus === "ACCEPTED"
                              ? (lang === "fr" ? "✅ Justifiée (Validée)" : "✅ Validated")
                              : r.certificateStatus === "REJECTED"
                              ? (lang === "fr" ? "❌ Justificatif refusé" : "❌ Rejected")
                              : (lang === "fr" ? `🕐 En examen (${r.certificateReference})` : `🕐 Pending (${r.certificateReference})`)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <StatusBadge state={r.tone || "neutral"} label={r.status} colors={colors} />
                  </View>
                ))}
              </View>
            ) : !studentLoading ? (
              <EmptyState
                icon="checkCircle"
                title={
                  lang === "fr"
                    ? "Aucune absence enregistrée"
                    : lang === "ar"
                    ? "لا توجد غيابات مسجلة"
                    : "No absences recorded"
                }
                subtitle={
                  lang === "fr"
                    ? "Votre assiduité est exemplaire pour cette période."
                    : lang === "ar"
                    ? "نسبة حضورك ممتازة ومواظبتك مثالية."
                    : "Your attendance is perfect for this period."
                }
                colors={colors}
              />
            ) : null}
          </SubtleFadeTransition>

          <PressableScale
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
            onPress={() => navigate("scanner")}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.accentSoft },
              ]}
            >
              <AppIcon name="camera" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {lang === "fr" ? "Justifier une absence" : "Justify an absence"}
              </Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: colors.textSecondary },
                ]}
              >
                {lang === "fr"
                  ? "Scanner et transmettre un certificat médical"
                  : "Scan and upload medical certificate"}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.textSecondary} />
          </PressableScale>
        </ScrollView>
      </View>
    );
  }

  // --- Teacher Roster View ---
  const students: any[] = roster?.students || [];
  const presentCount = Object.values(states).filter((s) => s === "present").length;
  const absentCount = Object.values(states).filter((s) => s === "absent").length;
  const allMarked = students.length > 0 && Object.keys(states).length === students.length;

  const handleTeacherSubmit = async () => {
    if (!roster?.sessionId) {
      Alert.alert("Erreur", "Identifiant de séance manquant.");
      return;
    }
    setTeacherSubmitting(true);
    try {
      const recordsPayload = Object.entries(states).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      const result = await api.teacher.submitRollCall(roster.sessionId, recordsPayload);
      setTeacherSubmitting(false);
      onSubmissionComplete({
        reference: result?.reference || roster.reference || "ATT-CONFIRMED",
        date: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: lang === "fr" ? "Présences confirmées" : "Attendance Confirmed",
        subtitle:
          lang === "fr"
            ? `Feuille d’appel enregistrée avec succès (${result?.presentCount ?? presentCount} présents).`
            : `Roll call registered successfully (${result?.presentCount ?? presentCount} present).`,
        status: "Confirmé",
      });
      navigate("submission");
    } catch (err: any) {
      setTeacherSubmitting(false);
      Alert.alert("Erreur", err.message || "Impossible d'enregistrer la feuille d'appel.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title={lang === "fr" ? "Enregistrer les présences" : "Roll Call"}
        subtitle={
          roster?.subject
            ? `${roster.subject} · ${roster.classGroup || roster.room || ""}`
            : activeSession?.subject || "Séance de cours"
        }
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("class")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {!online && (
          <View style={[styles.networkWarning, { backgroundColor: colors.warningSoft }]}>
            <AppIcon name="wifiOff" size={18} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.networkWarningTitle, { color: colors.warning }]}>
                Connexion requise
              </Text>
              <Text style={[styles.networkWarningDesc, { color: colors.textSecondary }]}>
                Une connexion active au serveur Express est requise pour enregistrer l'appel.
              </Text>
            </View>
          </View>
        )}

        {teacherError && (
          <ApiErrorCard
            message={teacherError}
            onRetry={loadTeacherRoster}
            colors={colors}
            isDark={isDark}
          />
        )}

        {teacherLoading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
              Chargement de la liste des étudiants inscrits…
            </Text>
          </View>
        )}

        {students.length > 0 ? (
          <>
            <View style={styles.rosterSummaryRow}>
              <Text style={[styles.rosterSummaryCount, { color: colors.text }]}>
                <Text style={{ fontWeight: "700" }}>{Object.keys(states).length}</Text> /{" "}
                {students.length} marqués
              </Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {lang === "fr" ? "Présent" : "Present"}
                </Text>
                <View style={[styles.legendDot, { backgroundColor: colors.danger, marginLeft: 8 }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {lang === "fr" ? "Absent" : "Absent"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.rosterList,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              {students.map((st: any, index: number) => {
                const initials =
                  st.initials ||
                  (st.name
                    ? st.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                    : "ET");
                const isP = states[st.studentId] === "present";
                const isA = states[st.studentId] === "absent";

                return (
                  <View
                    key={st.studentId || index}
                    style={[
                      styles.studentRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: index === students.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.primarySoft },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors.text }]}>
                        {st.name}
                      </Text>
                      <Text style={[styles.studentId, { color: colors.textSecondary }]}>
                        {st.studentCode || `STD-${String(index + 1).padStart(3, "0")}`}
                      </Text>
                    </View>
                    <View style={styles.attendanceToggleRow}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: isP ? colors.successSoft : colors.surfaceMuted,
                            borderColor: isP ? colors.success : colors.border,
                          },
                        ]}
                        onPress={() => setStates((prev) => ({ ...prev, [st.studentId]: "present" }))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            { color: isP ? colors.success : colors.textSecondary },
                          ]}
                        >
                          P
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: isA ? colors.dangerSoft : colors.surfaceMuted,
                            borderColor: isA ? colors.danger : colors.border,
                          },
                        ]}
                        onPress={() => setStates((prev) => ({ ...prev, [st.studentId]: "absent" }))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.toggleBtnText,
                            { color: isA ? colors.danger : colors.textSecondary },
                          ]}
                        >
                          A
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <View
              style={[
                styles.stickySubmit,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              <Text style={[styles.stickySubmitCount, { color: colors.textSecondary }]}>
                {presentCount} présents · {absentCount} absents
              </Text>
              <PressableScale
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primaryStrong,
                    opacity: !online || !allMarked || teacherSubmitting ? 0.5 : 1,
                    paddingHorizontal: 20,
                  },
                ]}
                disabled={!online || !allMarked || teacherSubmitting}
                onPress={handleTeacherSubmit}
              >
                {teacherSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirmer</Text>
                )}
              </PressableScale>
            </View>
          </>
        ) : !teacherLoading ? (
          <EmptyState
            icon="checkCircle"
            title={lang === "fr" ? "Aucune séance à enregistrer" : "No pending roll call"}
            subtitle={
              lang === "fr"
                ? "Toutes les feuilles de présence sont à jour ou aucune séance n'est programmée."
                : "All attendance records are up to date."
            }
            colors={colors}
            actionLabel="Retour à l'accueil"
            onAction={() => navigate("home")}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * 5. ClassDetailsScreen
 */
function ClassDetailsScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  activeSession,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  activeSession?: any | null;
}) {
  const teacher = role === "teacher";
  const courseTitle = activeSession?.subject || (teacher ? "Séance de cours" : "Détails du cours");
  const courseCode =
    activeSession?.subjectCode || (courseTitle ? courseTitle.slice(0, 2).toUpperCase() : "CS");
  const courseTime =
    activeSession?.time && activeSession?.end
      ? `${activeSession.time} – ${activeSession.end}`
      : "08:30 – 10:00";
  const courseRoom = activeSession?.room || "Salle assignée";
  const courseSub =
    activeSession?.className ||
    activeSession?.meta ||
    (teacher ? "Étudiants inscrits" : "Enseignant du module");
  const isRTL = lang === "ar";

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title={courseTitle}
        subtitle={lang === "fr" ? "Détails du cours" : lang === "ar" ? "تفاصيل الحصة" : "Course Details"}
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {!online && <OfflineNotice colors={colors} />}

        <View
          style={[
            styles.courseHero,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View
            style={[
              styles.courseCodeBadge,
              { backgroundColor: colors.accentSoft, borderColor: "rgba(233, 181, 68, 0.4)" },
            ]}
          >
            <Text style={[styles.courseCodeText, { color: colors.accentText }]}>
              {courseCode}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionKicker, { color: isDark ? colors.accent : colors.secondary }]}>
              {lang === "fr" ? "Module officiel" : "Course module"}
            </Text>
            <Text style={[styles.courseHeroTitle, { color: colors.text }]}>
              {courseTitle}
            </Text>
            <Text style={[styles.courseHeroSub, { color: colors.textSecondary }]}>
              {courseSub}
            </Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View
            style={[
              styles.detailGridCell,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <AppIcon name="clock" size={18} color={colors.accent} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.detailCellLabel, { color: colors.textSecondary }]}>
                {lang === "fr" ? "Horaire" : "Time"}
              </Text>
              <Text style={[styles.detailCellValue, { color: colors.text }]}>
                {courseTime}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.detailGridCell,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <AppIcon name="map" size={18} color={colors.accent} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.detailCellLabel, { color: colors.textSecondary }]}>
                {lang === "fr" ? "Salle" : "Room"}
              </Text>
              <Text style={[styles.detailCellValue, { color: colors.text }]}>
                {courseRoom}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusPanel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View>
            <Text style={[styles.statusPanelLabel, { color: colors.textSecondary }]}>
              {lang === "fr" ? "État des présences" : "Attendance Status"}
            </Text>
            <Text style={[styles.statusPanelValue, { color: colors.text }]}>
              {activeSession?.status || (teacher ? "Prêt pour l'appel" : "Programmé")}
            </Text>
          </View>
          <StatusBadge state={activeSession?.tone || "warning"} label={activeSession?.status || "Actif"} colors={colors} />
        </View>

        {teacher ? (
          <View style={styles.classActions}>
            {!online && (
              <View style={[styles.inlineWarning, { backgroundColor: colors.warningSoft }]}>
                <AppIcon name="wifiOff" size={16} color={colors.warning} />
                <Text style={[styles.inlineWarningText, { color: colors.warning }]}>
                  Connectez-vous au réseau pour enregistrer les présences.
                </Text>
              </View>
            )}
            <PressableScale
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primaryStrong, opacity: !online ? 0.5 : 1 },
              ]}
              disabled={!online}
              onPress={() => navigate("attendance")}
            >
              <AppIcon name="check" size={18} color="#ffffff" />
              <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                {lang === "fr" ? "Enregistrer les présences" : "Take Attendance"}
              </Text>
            </PressableScale>

            <PressableScale
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => navigate("announcement")}
            >
              <AppIcon name="megaphone" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.text, marginLeft: 8 }]}>
                {lang === "fr" ? "Envoyer une annonce" : "Post Announcement"}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * 6. NotificationsScreen
 */
function NotificationsScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    try {
      setError(null);
      const res = await api.notifications.getAll();
      const list = res?.notifications || (Array.isArray(res) ? res : []);
      setNotices(list);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      loadNotices();
    } catch {
      // Continue
    }
  };

  const unreadCount = notices.filter((n) => n.unread).length;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title={copy[lang].notifications}
        subtitle={
          unreadCount > 0
            ? `${unreadCount} ${lang === "fr" ? "non lue(s)" : "unread"}`
            : lang === "fr"
            ? "Toutes lues"
            : "All caught up"
        }
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {error && (
          <ApiErrorCard
            message={error}
            onRetry={loadNotices}
            colors={colors}
            isDark={isDark}
          />
        )}

        {loading && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
              Chargement des alertes…
            </Text>
          </View>
        )}

        {notices.length > 0 ? (
          <>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={{
                  alignSelf: "flex-end",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accent }}>
                  {lang === "fr" ? "Tout marquer comme lu" : "Mark all as read"}
                </Text>
              </TouchableOpacity>
            )}
            <View
              style={[
                styles.notificationList,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              {notices.map((n, i) => (
                <PressableScale
                  key={n.id || `${n.title}-${i}`}
                  style={[
                    styles.notificationRow,
                    {
                      backgroundColor: n.unread ? colors.primarySoft : colors.surface,
                      borderBottomColor: colors.border,
                      borderBottomWidth: i === notices.length - 1 ? 0 : 1,
                    },
                  ]}
                  onPress={async () => {
                    if (n.id && n.unread) {
                      await api.notifications.markAsRead(n.id);
                      loadNotices();
                    }
                  }}
                >
                  <View
                    style={[
                      styles.noticeIconWrap,
                      { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <AppIcon name={n.icon || "bell"} size={16} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notificationTitleText, { color: colors.text }]}>
                      {n.title}
                    </Text>
                    <Text style={[styles.notificationSubText, { color: colors.textSecondary }]}>
                      {n.text}
                    </Text>
                    <Text style={[styles.notificationTimeText, { color: colors.textSecondary }]}>
                      {n.time}
                    </Text>
                  </View>
                  {n.unread && <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />}
                </PressableScale>
              ))}
            </View>
          </>
        ) : !loading ? (
          <EmptyState
            icon="bell"
            title={lang === "fr" ? "Aucune notification" : "No notifications"}
            subtitle={
              lang === "fr"
                ? "Vous êtes parfaitement à jour, aucune nouvelle notification reçue."
                : "You're all caught up! No notifications at this time."
            }
            colors={colors}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * 7. ScannerScreen
 */
function ScannerScreen({
  online,
  navigate,
  lang,
  colors,
  setCapturedDocument,
  selectedAbsenceRecordId,
}: {
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  setCapturedDocument: (doc: { uri: string; base64: string; mimeType: string; fileName: string; fileSize: number } | null) => void;
  selectedAbsenceRecordId: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Take Photo with Camera
  const handleCapture = async () => {
    setIsLoading(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission refusée",
          "L’accès à la caméra est nécessaire pour prendre en photo votre certificat médical."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let b64 = asset.base64;
        if (!b64) {
          b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        setCapturedDocument({
          uri: asset.uri,
          base64: b64 || "",
          mimeType: "image/jpeg",
          fileName: `certificat_${Date.now()}.jpg`,
          fileSize: asset.fileSize || (b64 ? Math.round((b64.length * 3) / 4) : 0),
        });
        navigate("preview");
      }
    } catch (err: any) {
      Alert.alert("Erreur Caméra", err.message || "Impossible d’ouvrir l’appareil photo.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Pick Image from Gallery
  const handlePickGallery = async () => {
    setIsLoading(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission refusée",
          "L’accès aux photos est nécessaire pour sélectionner votre justificatif."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let b64 = asset.base64;
        if (!b64) {
          b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        setCapturedDocument({
          uri: asset.uri,
          base64: b64 || "",
          mimeType: asset.mimeType || "image/jpeg",
          fileName: asset.fileName || `certificat_${Date.now()}.jpg`,
          fileSize: asset.fileSize || (b64 ? Math.round((b64.length * 3) / 4) : 0),
        });
        navigate("preview");
      }
    } catch (err: any) {
      Alert.alert("Erreur Galerie", err.message || "Impossible de sélectionner l’image.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Pick Document (PDF or image)
  const handlePickFile = async () => {
    setIsLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const isPdf = (asset.name || "").toLowerCase().endsWith(".pdf") || asset.mimeType === "application/pdf";
        setCapturedDocument({
          uri: asset.uri,
          base64: b64,
          mimeType: isPdf ? "application/pdf" : (asset.mimeType || "image/jpeg"),
          fileName: asset.name,
          fileSize: asset.size || (b64 ? Math.round((b64.length * 3) / 4) : 0),
        });
        navigate("preview");
      }
    } catch (err: any) {
      Alert.alert("Erreur Fichier", err.message || "Impossible d’importer le document.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.scannerScreen, { backgroundColor: "#0F172A" }]}>
      {/* Header */}
      <View style={styles.scannerHeaderWrap}>
        <View style={styles.scannerHeader}>
          <PressableScale
            style={styles.backButtonWrap}
            onPress={() => navigate("attendance")}
          >
            <AppIcon name="back" size={22} color="#ffffff" />
          </PressableScale>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.scannerEyebrow}>Justificatif d’absence</Text>
            <Text style={styles.scannerHeaderTitle}>
              {selectedAbsenceRecordId ? "Justifier l’absence" : "Scanner le certificat"}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Interactive Scanner Area */}
      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 20 }}>
        {/* Viewfinder Target */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCapture}
          style={{
            height: 280,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.3)",
            borderStyle: "dashed",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            marginTop: 10,
          }}
        >
          {/* Corner Guides */}
          <View style={[styles.cornerGuide, styles.guideTL, { borderColor: colors.accent }]} />
          <View style={[styles.cornerGuide, styles.guideTR, { borderColor: colors.accent }]} />
          <View style={[styles.cornerGuide, styles.guideBL, { borderColor: colors.accent }]} />
          <View style={[styles.cornerGuide, styles.guideBR, { borderColor: colors.accent }]} />

          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(230, 81, 0, 0.2)", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
            <AppIcon name="camera" size={32} color={colors.accent} />
          </View>
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
            Prendre une photo du document
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: 12, marginTop: 4 }}>
            Appuyez ici pour ouvrir l’appareil photo
          </Text>
        </TouchableOpacity>

        {/* Action Choice Buttons */}
        <View style={{ gap: 10 }}>
          {/* 1. Camera Button (Primary) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCapture}
            disabled={isLoading}
            style={{
              backgroundColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              borderRadius: 14,
              gap: 10,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <AppIcon name="camera" size={20} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14.5 }}>
                  Prendre une photo (Caméra)
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* 2 & 3. Gallery & PDF Buttons (Row) */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickGallery}
              disabled={isLoading}
              style={{
                flex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              }}
            >
              <AppIcon name="more" size={18} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>
                Galerie photos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickFile}
              disabled={isLoading}
              style={{
                flex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              }}
            >
              <AppIcon name="file" size={18} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>
                Fichier PDF
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function DocumentPreviewScreen({
  online,
  navigate,
  lang,
  colors,
  isDark,
  capturedDocument,
  selectedAbsenceRecordId,
  onSubmissionComplete,
}: {
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  capturedDocument: { uri: string; base64: string; mimeType: string; fileName: string; fileSize: number } | null;
  selectedAbsenceRecordId: string | null;
  onSubmissionComplete: (result: any) => void;
}) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!capturedDocument) {
      Alert.alert("Aucun document", "Veuillez d’abord scanner ou sélectionner un document.");
      return;
    }
    setSending(true);
    try {
      const result = await api.student.submitJustification({
        recordId: selectedAbsenceRecordId || undefined,
        fileData: `data:${capturedDocument.mimeType};base64,${capturedDocument.base64}`,
        fileName: capturedDocument.fileName,
        fileType: capturedDocument.mimeType,
        fileSize: capturedDocument.fileSize,
        reason: "Certificat médical transmis via application mobile",
      });
      onSubmissionComplete({
        title: "Certificat envoyé",
        subtitle: `Votre justificatif réf. ${result.reference} est en cours d’examen.`,
        reference: result.reference,
        status: "En examen",
        dateFormatted: new Date().toLocaleString("fr-FR"),
      });
      navigate("submission");
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible d’envoyer le justificatif.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title="Vérifier le document"
        subtitle="Page 1 sur 1"
        online={online}
        onToggleOnline={() => {}}
        lang={lang}
        onBack={() => navigate("scanner")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.previewDocumentSheet,
            {
              backgroundColor: isDark ? colors.surface : "#ffffff",
              borderColor: colors.border,
            },
          ]}
        >
          {capturedDocument?.mimeType?.startsWith("image/") ? (
            <Image
              source={{ uri: capturedDocument.uri }}
              style={{ width: "100%", height: 420, resizeMode: "contain", borderRadius: 8 }}
            />
          ) : capturedDocument?.mimeType === "application/pdf" ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <AppIcon name="file" size={48} color={colors.primary} />
              <Text style={[styles.paperDocTitle, { color: colors.text, marginTop: 12 }]}>
                {capturedDocument.fileName}
              </Text>
              <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                Fichier PDF sélectionné
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.paperLogo, { borderColor: colors.primary }]}>
                <Text style={[styles.paperLogoText, { color: colors.primary }]}>CENTRE MÉDICAL</Text>
              </View>
              <Text style={[styles.paperDocTitle, { color: colors.text }]}>CERTIFICAT MÉDICAL</Text>
              <View style={styles.paperTextLines}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.paperLine,
                      { backgroundColor: isDark ? colors.surfaceMuted : "#E4EAF1" },
                      i % 3 === 0 && { width: "65%" },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.paperSignature, { color: colors.textSecondary }]}>Signature et cachet</Text>
            </>
          )}
        </View>

        <View style={styles.editToolsRow}>
          <PressableScale
            style={[
              styles.editToolBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigate("scanner")}
          >
            <AppIcon name="camera" size={16} color={colors.text} />
            <Text style={[styles.editToolBtnText, { color: colors.text }]}>
              Rescanner
            </Text>
          </PressableScale>
          <PressableScale
            style={[
              styles.editToolBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigate("scanner")}
          >
            <AppIcon name="file" size={16} color={colors.text} />
            <Text style={[styles.editToolBtnText, { color: colors.text }]}>
              Changer
            </Text>
          </PressableScale>
        </View>

        {!online && (
          <View style={[styles.draftNotice, { backgroundColor: colors.warningSoft }]}>
            <AppIcon name="wifiOff" size={16} color={colors.warning} />
            <Text style={[styles.draftNoticeText, { color: colors.warning }]}>
              Connexion requise pour envoyer le justificatif.
            </Text>
          </View>
        )}

        <PressableScale
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, marginTop: 14, opacity: sending ? 0.6 : 1 },
          ]}
          onPress={online ? handleSend : undefined}
          disabled={sending || !online}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {online ? "Confirmer et envoyer" : "Connexion requise"}
            </Text>
          )}
        </PressableScale>
      </ScrollView>
    </View>
  );
}

/**
 * 9. SubmissionScreen
 */
function SubmissionScreen({
  role,
  online,
  navigate,
  lang,
  colors,
  isDark,
  submissionResult,
}: {
  role: Role;
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  submissionResult?: any | null;
}) {
  const teacher = role === "teacher";

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <ScrollView contentContainerStyle={styles.resultScreen} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.resultIconWrap,
            { backgroundColor: online ? colors.successSoft : colors.warningSoft },
          ]}
        >
          <AppIcon
            name={online ? "check" : "file"}
            size={36}
            color={online ? colors.success : colors.warning}
          />
        </View>
        <Text style={[styles.sectionKicker, { color: isDark ? colors.accent : colors.secondary }]}>
          {teacher ? "Présences" : "Justificatif"}
        </Text>
        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {submissionResult?.title ||
            (online
              ? teacher
                ? "Présences enregistrées"
                : "Document envoyé"
              : "Brouillon enregistré")}
        </Text>
        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
          {submissionResult?.subtitle ||
            (online
              ? teacher
                ? "La feuille de présence a été confirmée et transmise à la scolarité."
                : "Votre justificatif est maintenant en cours d’examen."
              : "Ce document n’a pas été envoyé. Reconnectez-vous pour poursuivre.")}
        </Text>

        <View
          style={[
            styles.receiptBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View style={[styles.receiptRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Référence
            </Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>
              {submissionResult?.reference || (teacher ? "ATT-250318-042" : "JUS-250318-018")}
            </Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Statut
            </Text>
            <StatusBadge
              state={online ? "info" : "warning"}
              label={
                submissionResult?.status ||
                (online
                  ? teacher
                    ? "Confirmé"
                    : "En examen"
                  : "Brouillon non envoyé")
              }
              colors={colors}
            />
          </View>
          <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Date
            </Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>
              {submissionResult?.dateFormatted ||
                new Date().toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </Text>
          </View>
        </View>

        <PressableScale
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, width: "100%", marginTop: 14 },
          ]}
          onPress={() => navigate("home")}
        >
          <Text style={styles.primaryButtonText}>Retour à l’accueil</Text>
        </PressableScale>

        {!teacher && (
          <TouchableOpacity
            style={[styles.ghostButton, { width: "100%", marginTop: 8 }]}
            onPress={() => navigate("attendance")}
            activeOpacity={0.7}
          >
            <Text style={[styles.ghostButtonText, { color: colors.accent }]}>
              Voir mes demandes
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * 10. AnnouncementScreen
 */
function AnnouncementScreen({
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  activeSession,
}: {
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
  activeSession?: any | null;
}) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("Retard prévu");
  const [msg, setMsg] = useState(
    "Je vais arriver avec environ 10 minutes de retard. Merci de rester dans la salle."
  );

  const subTitle = activeSession?.subject
    ? `${activeSession.subject} · ${activeSession.className || activeSession.room || "Séance"}`
    : "Diffusion pédagogique";
  const groupLabel = activeSession?.className
    ? `Groupe ${activeSession.className}`
    : "Étudiants du groupe";

  const handleSend = async () => {
    if (!title.trim() || !msg.trim()) return;
    setSubmitting(true);
    try {
      if (activeSession?.classId) {
        await api.teacher.createAnnouncement({
          classId: activeSession.classId,
          title,
          message: msg,
        });
      }
      setSent(true);
    } catch {
      // Fallback
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title="Nouvelle annonce"
        subtitle={subTitle}
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("class")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {sent ? (
          <View
            style={[
              styles.inlineSuccessBox,
              { backgroundColor: colors.successSoft, borderColor: "rgba(34, 160, 107, 0.3)" },
            ]}
          >
            <AppIcon name="check" size={28} color={colors.success} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.inlineSuccessTitle, { color: colors.success }]}>
                Annonce envoyée
              </Text>
              <Text style={[styles.inlineSuccessDesc, { color: colors.success }]}>
                Les étudiants ont été notifiés en temps réel.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.recipientCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              <View
                style={[
                  styles.avatarGroup,
                  { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={[styles.avatarGroupText, { color: colors.accentText }]}>
                  {activeSession?.className ? activeSession.className.slice(0, 3) : "CL"}
                </Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>
                  Destinataires
                </Text>
                <Text style={[styles.recipientTitle, { color: colors.text }]}>
                  {groupLabel}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Titre</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Message</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={msg}
                onChangeText={setMsg}
                multiline
                numberOfLines={4}
              />
              <Text style={[styles.fieldCharCount, { color: colors.textSecondary }]}>
                {msg.length} / 300 caractères
              </Text>
            </View>

            <View
              style={[
                styles.messagePreview,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: isDark ? "#000" : "#102B55",
                },
              ]}
            >
              <Text style={[styles.messagePreviewLabel, { color: colors.accent }]}>
                Aperçu étudiant
              </Text>
              <Text style={[styles.messagePreviewTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.messagePreviewText, { color: colors.textSecondary }]}>
                {msg}
              </Text>
            </View>

            <PressableScale
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primaryStrong,
                  opacity: !online || submitting ? 0.5 : 1,
                  marginTop: 10,
                },
              ]}
              disabled={!online || submitting}
              onPress={handleSend}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Envoyer l’annonce</Text>
              )}
            </PressableScale>

            {!online && (
              <View style={[styles.inlineWarning, { backgroundColor: colors.warningSoft }]}>
                <AppIcon name="wifiOff" size={16} color={colors.warning} />
                <Text style={[styles.inlineWarningText, { color: colors.warning }]}>
                  Une connexion est requise pour envoyer.
                </Text>
              </View>
            )}
          </>
        )}

        {sent && (
          <PressableScale
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primaryStrong, marginTop: 20 },
            ]}
            onPress={() => navigate("class")}
          >
            <Text style={styles.primaryButtonText}>Retour au cours</Text>
          </PressableScale>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * 11. RequestsScreen
 */
function RequestsScreen({
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
}: {
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const [requestType, setRequestType] = useState("Signaler une absence prévue");
  const [date, setDate] = useState("Vendredi 21 mars 2025");
  const [reason, setReason] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const submit = () => {
    setSuccessModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title="Demandes administratives"
        subtitle="Enseignant"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Nouvelle demande
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Type de demande
          </Text>
          <View
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 13 }}>{requestType}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Date concernée
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Motif</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Décrivez brièvement votre demande…"
            placeholderTextColor={colors.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </View>

        <PressableScale
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, opacity: !online ? 0.5 : 1, marginTop: 4 },
          ]}
          disabled={!online}
          onPress={submit}
        >
          <Text style={styles.primaryButtonText}>Soumettre la demande</Text>
        </PressableScale>

        <View style={[styles.sectionHeading, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Demandes récentes
          </Text>
        </View>

        <View
          style={[
            styles.requestHistoryRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View>
            <Text style={[styles.requestHistoryTitle, { color: colors.text }]}>
              Modification de séance
            </Text>
            <Text style={[styles.requestHistorySub, { color: colors.textSecondary }]}>
              Soumise le 12 mars · Réf. REQ-2041
            </Text>
          </View>
          <StatusBadge state="warning" label="En examen" colors={colors} />
        </View>

        <View
          style={[
            styles.requestHistoryRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: 12,
              shadowColor: isDark ? "#000" : "#102B55",
            },
          ]}
        >
          <View>
            <Text style={[styles.requestHistoryTitle, { color: colors.text }]}>
              Absence prévue
            </Text>
            <Text style={[styles.requestHistorySub, { color: colors.textSecondary }]}>
              Soumise le 03 mars · Réf. REQ-1998
            </Text>
          </View>
          <StatusBadge state="success" label="Approuvée" colors={colors} />
        </View>

        <SmoothDialog
          visible={successModalVisible}
          onClose={() => {
            setSuccessModalVisible(false);
            setReason("");
          }}
          title={lang === "fr" ? "Demande transmise" : "Request Submitted"}
          message={
            lang === "fr"
              ? "Votre demande administrative a été enregistrée avec succès et transmise au département pédagogique de l'ISSATK."
              : "Your administrative request has been successfully recorded and sent to the ISSATK academic department."
          }
          confirmText={lang === "fr" ? "Parfait" : "Done"}
          colors={colors}
          icon="checkCircle"
        />
      </ScrollView>
    </View>
  );
}

/**
 * 12. ProfileScreen
 */
function ProfileScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  setLang,
  theme,
  setTheme,
  colors,
  isDark,
  currentUser,
  onLogout,
  onOpenApiConfig,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  colors: ThemeColors;
  isDark: boolean;
  currentUser: any | null;
  onLogout: () => void;
  onOpenApiConfig: () => void;
}) {
  const teacher = role === "teacher";
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const isRTL = lang === "ar";

  const displayName = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
    : teacher
    ? "Enseignant ISSATK"
    : "Étudiant ISSATK";

  const displayInitials =
    currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase()
      : teacher
      ? "PR"
      : "ET";

  const displaySub =
    currentUser?.department ||
    currentUser?.className ||
    (teacher ? "Département Informatique" : "Institut Supérieur des Sciences Appliquées");

  const displayEmail =
    currentUser?.email ||
    currentUser?.studentNumber ||
    (teacher ? "enseignant@issatk.rnu.tn" : "etudiant@issatk.rnu.tn");

  const themeList: { key: Theme; labelFr: string; labelEn: string; labelAr: string; icon: string }[] = [
    { key: "light", labelFr: "Clair", labelEn: "Light", labelAr: "فاتح", icon: "sun" },
    { key: "dark", labelFr: "Sombre", labelEn: "Dark", labelAr: "داكن", icon: "moon" },
    { key: "system", labelFr: "Système", labelEn: "System", labelAr: "تلقائي", icon: "settings" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppHeader
        title={lang === "fr" ? "Profil" : lang === "ar" ? "الملف الشخصي" : "Profile"}
        subtitle={lang === "fr" ? "Compte institutionnel" : lang === "ar" ? "الحساب الجامعي" : "Institutional Account"}
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        colors={colors}
        isDark={isDark}
      />
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* 1. Identity & Account Card */}
        <View
          style={[
            styles.identityCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#102B55",
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: colors.accentSoft, borderColor: "rgba(233, 181, 68, 0.4)" },
            ]}
          >
            <Text style={[styles.avatarLargeText, { color: colors.accentText }]}>
              {displayInitials}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.identityName, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {displayName}
              </Text>
              <StatusBadge
                state={teacher ? "warning" : "info"}
                label={teacher ? buttonCopy[lang].teacher : buttonCopy[lang].student}
                colors={colors}
              />
            </View>
            <Text style={[styles.identityDept, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {displaySub}
            </Text>
            <Text style={[styles.identityEmail, { color: colors.accent, textAlign: isRTL ? "right" : "left" }]}>
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* 2. Appearance & Theme Controls */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {lang === "fr" ? "Apparence" : lang === "ar" ? "المظهر" : "Appearance"}
          </Text>
          <View
            style={[
              styles.themeSegmentContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            {themeList.map((t) => {
              const selected = theme === t.key;
              return (
                <PressableScale
                  key={t.key}
                  style={[
                    styles.themeSegmentBtn,
                    selected && [
                      styles.themeSegmentBtnActive,
                      {
                        backgroundColor: isDark ? colors.surfaceRaised : colors.primarySoft,
                        borderColor: colors.accent,
                      },
                    ],
                  ]}
                  onPress={() => setTheme(t.key)}
                >
                  <View
                    style={[
                      styles.themeSegmentIconWrap,
                      {
                        backgroundColor: selected ? (isDark ? "rgba(233, 181, 68, 0.16)" : colors.accentSoft) : "transparent",
                      },
                    ]}
                  >
                    <AppIcon
                      name={t.icon}
                      size={16}
                      color={selected ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeSegmentLabel,
                      {
                        color: selected ? (isDark ? "#FFFFFF" : colors.primary) : colors.textSecondary,
                        fontWeight: selected ? "800" : "600",
                      },
                    ]}
                  >
                    {lang === "fr" ? t.labelFr : lang === "ar" ? t.labelAr : t.labelEn}
                  </Text>
                  {selected && (
                    <View style={[styles.themeActiveDot, { backgroundColor: colors.accent }]} />
                  )}
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* 3. Preferences Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {lang === "fr" ? "Préférences" : lang === "ar" ? "التفضيلات" : "Preferences"}
          </Text>
          <View
            style={[
              styles.settingsBlock,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            {/* Language Setting */}
            <TouchableOpacity
              style={[
                styles.settingsRow,
                {
                  borderBottomColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={() => setLang(lang === "fr" ? "en" : lang === "en" ? "ar" : "fr")}
              activeOpacity={0.7}
            >
              <AppIcon name="language" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Langue" : lang === "en" ? "Language" : "اللغة"}
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Français" : lang === "en" ? "English" : "العربية"}
                </Text>
              </View>
              <Text style={[styles.settingsRowValue, { color: colors.accent }]}>
                {lang === "fr" ? "FR" : lang === "en" ? "EN" : "عربي"}
              </Text>
              <AppIcon name="chevron" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* API & ngrok Settings */}
            <TouchableOpacity
              style={[
                styles.settingsRow,
                {
                  borderBottomColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={onOpenApiConfig}
              activeOpacity={0.7}
            >
              <AppIcon name="server" size={18} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Configuration API & ngrok" : lang === "ar" ? "إعدادات رابط ngrok" : "API & ngrok Settings"}
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Gérer le tunnel HTTPS vers le backend" : "Manage active ngrok tunnel"}
                </Text>
              </View>
              <AppIcon name="chevron" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Notifications Setting */}
            <TouchableOpacity
              style={[
                styles.settingsRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: teacher ? 1 : 0,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              activeOpacity={0.7}
            >
              <AppIcon name="bell" size={18} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Notifications" : lang === "ar" ? "الإشعارات" : "Notifications"}
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr"
                    ? "Cours, présences et annonces"
                    : lang === "ar"
                    ? "الحصص والحضور والإعلانات"
                    : "Classes, attendance & alerts"}
                </Text>
              </View>
              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: notificationsEnabled ? colors.accent : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    notificationsEnabled && styles.switchThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* Teacher Requests (if teacher) */}
            {teacher && (
              <TouchableOpacity
                style={[
                  styles.settingsRow,
                  {
                    borderBottomWidth: 0,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
                onPress={() => navigate("requests")}
                activeOpacity={0.7}
              >
                <AppIcon name="file" size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                  <Text style={[styles.settingsRowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                    {lang === "fr" ? "Mes demandes" : lang === "ar" ? "طلباتي" : "My Requests"}
                  </Text>
                  <Text style={[styles.settingsRowSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                    {lang === "fr"
                      ? "Historique administratif"
                      : lang === "ar"
                      ? "السجل الإداري والطلبات"
                      : "Administrative history"}
                  </Text>
                </View>
                <AppIcon name="chevron" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. Support & Institution Info */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {lang === "fr" ? "Assistance" : lang === "ar" ? "المساعدة" : "Support"}
          </Text>
          <View
            style={[
              styles.settingsBlock,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: isDark ? "#000" : "#102B55",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.settingsRow,
                {
                  borderBottomWidth: 0,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={() => setHelpModalVisible(true)}
              activeOpacity={0.7}
            >
              <AppIcon name="info" size={18} color={colors.info} />
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Service scolarité ISSATK" : lang === "ar" ? "مصلحة شؤون الطلبة" : "ISSATK Student Affairs"}
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {lang === "fr" ? "Bureau A12 · Assistance & contact" : lang === "ar" ? "مكتب A12 · الدعم والتواصل" : "Office A12 · Support & contact"}
                </Text>
              </View>
              <AppIcon name="chevron" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Logout Button */}
        <PressableScale
          style={[styles.dangerButton, { backgroundColor: colors.dangerSoft, marginTop: 14 }]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <View
            style={[
              styles.buttonContentRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.buttonIconWrap}>
              <AppIcon name="logout" size={17} color={colors.danger} />
            </View>
            <Text
              style={[
                styles.dangerButtonText,
                {
                  color: colors.danger,
                  marginLeft: isRTL ? 0 : 8,
                  marginRight: isRTL ? 8 : 0,
                },
              ]}
            >
              {buttonCopy[lang].signOut}
            </Text>
          </View>
        </PressableScale>

        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
          My ISSATkr · Version 1.0 (ISSAT Kairouan)
        </Text>

        {/* Logout Modal */}
        <SmoothDialog
          visible={logoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          onConfirm={async () => {
            setLogoutModalVisible(false);
            try {
              await api.auth.logout();
            } catch {
              // Ignore
            }
            onLogout();
          }}
          title={buttonCopy[lang].signOut}
          message={
            lang === "fr"
              ? "Êtes-vous sûr de vouloir vous déconnecter de votre compte institutionnel ISSATK ?"
              : lang === "en"
              ? "Are you sure you want to sign out of your institutional ISSATK account?"
              : "هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك الجامعي بالمعهد؟"
          }
          confirmText={buttonCopy[lang].signOut}
          cancelText={buttonCopy[lang].cancel}
          colors={colors}
          icon="logout"
        />

        {/* Help Modal */}
        <SmoothDialog
          visible={helpModalVisible}
          onClose={() => setHelpModalVisible(false)}
          title={lang === "fr" ? "Service scolarité ISSATK" : lang === "ar" ? "مصلحة شؤون الطلبة" : "Student Affairs Office"}
          message={
            lang === "fr"
              ? "Bureau de scolarité A12, Institut Supérieur des Sciences Appliquées et de Technologie de Kairouan.\nEmail : scolarite@issatk.rnu.tn"
              : lang === "ar"
              ? "مكتب شؤون الطلبة A12، المعهد العالي للعلوم التطبيقية والتكنولوجيا بالقيروان.\nالبريد الإلكتروني: scolarite@issatk.rnu.tn"
              : "Office A12, Higher Institute of Applied Sciences and Technology of Kairouan.\nEmail: scolarite@issatk.rnu.tn"
          }
          confirmText={buttonCopy[lang].done}
          colors={colors}
          icon="info"
        />
      </ScrollView>
    </View>
  );
}

/* ==========================================================================
   MAIN TABS PAGER (Horizontal swipe gestures between main tabs)
   ========================================================================== */
interface MainTabsPagerProps {
  currentTab: Screen;
  onTabChange: (screen: Screen) => void;
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (screen: Screen) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
  isDark: boolean;
  scrollX: Animated.Value;
  screenWidth: number;
  currentUser: any | null;
  onSelectClass: (c: any) => void;
  onSubmissionComplete: (result: any) => void;
  setSelectedAbsenceRecordId: (id: string | null) => void;
  onOpenApiConfig: () => void;
  onLogout: () => void;
  activeSession?: any | null;
}

const MAIN_TABS: Screen[] = ["home", "timetable", "attendance", "profile"];

function MainTabsPager({
  currentTab,
  setSelectedAbsenceRecordId,
  onTabChange,
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  setLang,
  theme,
  setTheme,
  colors,
  isDark,
  scrollX,
  screenWidth,
  currentUser,
  onSelectClass,
  onSubmissionComplete,
  onOpenApiConfig,
  onLogout,
  activeSession,
}: MainTabsPagerProps) {
  const pagerRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const isUserSwiping = useRef(false);

  useEffect(() => {
    if (!isUserSwiping.current) {
      const targetIndex = MAIN_TABS.indexOf(currentTab);
      if (targetIndex !== -1) {
        pagerRef.current?.scrollTo({
          x: targetIndex * screenWidth,
          animated: true,
        });
      }
    }
  }, [currentTab, screenWidth]);

  return (
    <ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      bounces={false}
      directionalLockEnabled={true}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => {
        isUserSwiping.current = true;
      }}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
      )}
      onMomentumScrollEnd={(e) => {
        isUserSwiping.current = false;
        const offset = e.nativeEvent.contentOffset.x;
        const pageIdx = Math.round(offset / screenWidth);
        const targetTab = MAIN_TABS[pageIdx];
        if (targetTab && targetTab !== currentTab) {
          onTabChange(targetTab);
        }
      }}
      style={{ flex: 1, width: screenWidth }}
      contentContainerStyle={{ width: screenWidth * 4 }}
    >
      <View style={{ width: screenWidth, flex: 1 }}>
        <HomeScreen
          role={role}
          online={online}
          toggleOnline={toggleOnline}
          navigate={navigate}
          lang={lang}
          colors={colors}
          isDark={isDark}
          currentUser={currentUser}
          onSelectClass={onSelectClass}
        />
      </View>

      <View style={{ width: screenWidth, flex: 1 }}>
        <TimetableScreen
          role={role}
          online={online}
          toggleOnline={toggleOnline}
          navigate={navigate}
          lang={lang}
          colors={colors}
          isDark={isDark}
          onSelectClass={onSelectClass}
        />
      </View>

      <View style={{ width: screenWidth, flex: 1 }}>
        <AttendanceScreen
          role={role}
          online={online}
          toggleOnline={toggleOnline}
          navigate={navigate}
          lang={lang}
          colors={colors}
          isDark={isDark}
          activeSession={activeSession}
          onSubmissionComplete={onSubmissionComplete}
          setSelectedAbsenceRecordId={setSelectedAbsenceRecordId}
        />
      </View>

      <View style={{ width: screenWidth, flex: 1 }}>
        <ProfileScreen
          role={role}
          online={online}
          toggleOnline={toggleOnline}
          navigate={navigate}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          colors={colors}
          isDark={isDark}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenApiConfig={onOpenApiConfig}
        />
      </View>
    </ScrollView>
  );
}

/* ==========================================================================
   ROOT APPLICATION
   ========================================================================== */
export default function App() {
  const [role, setRole] = useState<Role>("student");
  const [screen, setScreen] = useState<Screen>("login");
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("fr");
  const [online, setOnline] = useState(true);

  // Real backend authentication and state
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [apiConfigVisible, setApiConfigVisible] = useState(false);

  // Certificate scan shared state
  const [capturedDocument, setCapturedDocument] = useState<{
    uri: string;
    base64: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [selectedAbsenceRecordId, setSelectedAbsenceRecordId] = useState<string | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const effectiveDark =
    theme === "dark" || (theme === "system" && systemColorScheme === "dark");
  const colors = useMemo(() => getColors(effectiveDark), [effectiveDark]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const isMainTab = MAIN_TABS.includes(screen);

  const handleTabNavigate = useCallback((newScreen: Screen) => {
    setScreen(newScreen);
  }, []);

  // Set up 401 handler and check stored user session on mount
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
      setScreen("login");
    });

    getStoredUser().then((u) => {
      if (u) {
        setCurrentUser(u);
        if (u.role) {
          setRole(u.role === "TEACHER" ? "teacher" : "student");
        }
        setScreen("home");
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={effectiveDark ? "light" : "dark"} />

        {/* Global Stationary Architectural Background Layer (Fixed across all screens) */}
        <ArchitecturalHeaderBackground isDark={effectiveDark} colors={colors} />

        <SafeAreaView
          style={styles.rootSafeArea}
          edges={["top", "left", "right"]}
        >
          {/* Screen Routing & Paging Area */}
          <View style={{ flex: 1, backgroundColor: "transparent" }}>
          {screen === "login" && (
            <ScreenTransition screenKey="login">
              <LoginScreen
                onLogin={(user) => {
                  setCurrentUser(user);
                  if (user?.role) {
                    setRole(user.role === "TEACHER" ? "teacher" : "student");
                  }
                  setScreen("home");
                }}
                role={role}
                setRole={setRole}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                colors={colors}
                isDark={effectiveDark}
                onOpenApiConfig={() => setApiConfigVisible(true)}
              />
            </ScreenTransition>
          )}

          {isMainTab && (
            <MainTabsPager
              currentTab={screen}
              onTabChange={handleTabNavigate}
              role={role}
              online={online}
              toggleOnline={() => setOnline(!online)}
              navigate={setScreen}
              lang={lang}
              setLang={setLang}
              theme={theme}
              setTheme={setTheme}
              colors={colors}
              isDark={effectiveDark}
              scrollX={scrollX}
              screenWidth={screenWidth}
              currentUser={currentUser}
              onSelectClass={(cls) => {
                setActiveSession(cls);
              }}
              setSelectedAbsenceRecordId={setSelectedAbsenceRecordId}
              onSubmissionComplete={(result) => {
                setSubmissionResult(result);
                setScreen("submission");
              }}
              onOpenApiConfig={() => setApiConfigVisible(true)}
              onLogout={() => {
                setCurrentUser(null);
                setScreen("login");
              }}
              activeSession={activeSession}
            />
          )}

          {screen === "class" && (
            <ScreenTransition screenKey="class">
              <ClassDetailsScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
                activeSession={activeSession}
              />
            </ScreenTransition>
          )}

          {screen === "notifications" && (
            <ScreenTransition screenKey="notifications">
              <NotificationsScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
              />
            </ScreenTransition>
          )}

          {screen === "scanner" && (
            <ScreenTransition screenKey="scanner">
              <ScannerScreen
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                setCapturedDocument={setCapturedDocument}
                selectedAbsenceRecordId={selectedAbsenceRecordId}
              />
            </ScreenTransition>
          )}

          {screen === "preview" && (
            <ScreenTransition screenKey="preview">
              <DocumentPreviewScreen
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
                capturedDocument={capturedDocument}
                selectedAbsenceRecordId={selectedAbsenceRecordId}
                onSubmissionComplete={(result) => {
                  setSubmissionResult(result);
                  setCapturedDocument(null);
                  setSelectedAbsenceRecordId(null);
                }}
              />
            </ScreenTransition>
          )}

          {screen === "submission" && (
            <ScreenTransition screenKey="submission">
              <SubmissionScreen
                role={role}
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
                submissionResult={submissionResult}
              />
            </ScreenTransition>
          )}

          {screen === "announcement" && (
            <ScreenTransition screenKey="announcement">
              <AnnouncementScreen
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
                activeSession={activeSession}
              />
            </ScreenTransition>
          )}

          {screen === "requests" && (
            <ScreenTransition screenKey="requests">
              <RequestsScreen
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
                isDark={effectiveDark}
              />
            </ScreenTransition>
          )}
        </View>

        {isMainTab && (
          <BottomNav
            currentTab={screen}
            onNavigate={handleTabNavigate}
            lang={lang}
            colors={colors}
            isDark={effectiveDark}
            scrollX={scrollX}
            screenWidth={screenWidth}
          />
        )}
        </SafeAreaView>

        {/* In-app ngrok and API endpoint configuration modal */}
        <ApiConfigModal
          visible={apiConfigVisible}
          onClose={() => setApiConfigVisible(false)}
          colors={colors}
          isDark={effectiveDark}
        />
      </View>
    </SafeAreaProvider>
  );
}

/* ==========================================================================
   CENTRALIZED STYLESHEET — SPACIOUS, BALANCED, PREMIUM HERITAGE NAVY
   ========================================================================== */
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: "relative",
  },
  rootSafeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  /* Demo banner */
  demoRoleBanner: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    alignItems: "center",
    zIndex: 10,
  },
  demoRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoRoleLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  demoRoleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demoRoleBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* ==========================================================================
     PROMINENT STATIONARY ARCHITECTURAL BACKGROUND
     - 70–75% of screen width
     - 340px height
     - Soft atmospheric mist feathering mask (0 visible bands, 0 rectangular boundary)
     - Preserves building entrance, arches, sign, flag, palm trees
     ========================================================================== */
  archBgWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    height: 250,
    overflow: "hidden",
    zIndex: 0,
  },
  archBgImage: {
    position: "absolute",
    top: 0,
    right: -10,
    height: 255,
  },

  /* ==========================================================================
     HOME TOP BAR & GREETING SECTION (Matching Reference Image)
     ========================================================================== */
  homeTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 5,
  },
  homeTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectivity: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  connectivityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  notificationBellCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  notificationRedDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },

  /* Compact Greeting Section */
  homeGreetingSection: {
    paddingTop: 8,
    paddingBottom: 14,
    maxWidth: "58%", // leaves right side open for prominent university building
  },
  greetingSalutation: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 26,
    marginTop: 2,
  },
  greetingDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  greetingDateText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* ==========================================================================
     STANDARD HEADER FOR OTHER SCREENS
     ========================================================================== */
  standardHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButtonWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  titleStack: {
    flex: 1,
  },
  subtitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  standardHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadDotBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
  },

  /* ==========================================================================
     SPACIOUS SCREEN CONTENT & SECTIONS
     ========================================================================== */
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 85,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  offlineNoticeTexts: {
    flex: 1,
  },
  offlineNoticeTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  offlineNoticeDesc: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* Status Badge */
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  /* ==========================================================================
     NEXT CLASS CARD (Exact Heritage Navy Reference Design)
     ========================================================================== */
  nextCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  nextCardAccentBar: {
    width: 4,
  },
  nextCardBody: {
    flex: 1,
    padding: 14,
  },
  nextCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nextBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nextBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  nextCardContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  nextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  nextInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaDivider: {
    fontSize: 12,
  },
  nextInfoText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  nextCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 6,
  },

  /* Section Headings */
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionKicker: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Timeline List Card */
  timelineList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  classTimeCol: {
    width: 48,
  },
  classTimeMain: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  classTimeSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  timelineMark: {
    width: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    width: 1.5,
    top: -20,
    bottom: -20,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    zIndex: 2,
  },
  classContentCol: {
    flex: 1,
    gap: 3,
  },
  classHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  classSubject: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  classMeta: {
    fontSize: 11,
    fontWeight: "500",
  },

  /* Attendance Summary Card */
  attendanceSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  attendanceSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attendanceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  attendanceSummaryLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  attendanceSummaryBig: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  attendanceSummarySub: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10.5,
    marginTop: 1,
  },
  attendanceSummaryRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressRingSim: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressRingSegment: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 20,
    borderWidth: 3,
    borderTopColor: "transparent",
    borderLeftColor: "transparent",
  },

  /* Quick Actions Grid */
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "center",
  },

  /* Teacher request strip */
  requestStrip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  requestIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  requestStripTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  requestStripSub: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* Day picker (Timetable) */
  dayPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  dayPickerItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayPickerItemSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  dayPickerDay: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayPickerDate: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  weekControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  weekControlsText: {
    fontSize: 14,
    fontWeight: "800",
  },

  /* Attendance student view */
  summaryGrid: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRightWidth: 1,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11.5,
  },
  recordList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  statusMarkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  recordSubject: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  recordMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionCardSub: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* Attendance teacher roster */
  networkWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  networkWarningTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  networkWarningDesc: {
    fontSize: 10.5,
    marginTop: 1,
  },
  rosterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rosterSummaryCount: {
    fontSize: 11.5,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  rosterList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  studentId: {
    fontSize: 10.5,
    marginTop: 1,
  },
  attendanceToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  toggleBtn: {
    width: 34,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stickySubmit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  stickySubmitCount: {
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* Course Hero */
  courseHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  courseCodeBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  courseCodeText: {
    fontSize: 15,
    fontWeight: "900",
  },
  courseHeroTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  courseHeroSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  detailGridCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 13,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  detailCellLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  detailCellValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  statusPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  statusPanelLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  statusPanelValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  classActions: {
    gap: 10,
  },
  inlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  inlineWarningText: {
    fontSize: 11.5,
    fontWeight: "500",
    flex: 1,
  },
  announcementCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  announcementIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  announcementTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  announcementTime: {
    fontSize: 10.5,
  },
  announcementBody: {
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 10,
  },
  announcementAction: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* Notifications */
  notificationList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  noticeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  notificationSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  notificationTimeText: {
    fontSize: 10.5,
    marginTop: 2,
  },

  /* Scanner screen */
  scannerScreen: {
    flex: 1,
  },
  scannerHeaderWrap: {
    backgroundColor: "rgba(8, 26, 51, 0.70)",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  scannerEyebrow: {
    color: "#E9B544",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scannerHeaderTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  cameraView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  scanGuides: {
    width: 250,
    height: 330,
    position: "relative",
  },
  cornerGuide: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#E9B544",
  },
  guideTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  guideTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  guideBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  guideBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  documentSample: {
    position: "absolute",
    width: 200,
    height: 270,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: 16,
  },
  docHead: {
    width: 60,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
    borderRadius: 3,
  },
  docLine: {
    width: "70%",
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 8,
    borderRadius: 2,
  },
  docLineWide: {
    width: "90%",
  },
  docStamp: {
    position: "absolute",
    bottom: 24,
    right: 20,
    borderWidth: 1.5,
    borderColor: "#E9B544",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docStampText: {
    color: "#E9B544",
    fontSize: 8,
    fontWeight: "800",
  },
  cameraInstruction: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 22,
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#E9B544",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
  },
  pageCountBadge: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Document preview */
  previewDocumentSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E4EAF1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 18,
  },
  paperLogo: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#102B55",
    borderRadius: 5,
  },
  paperLogoText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#102B55",
  },
  paperDocTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17263D",
    textAlign: "center",
    marginVertical: 16,
    letterSpacing: 0.5,
  },
  paperTextLines: {
    gap: 8,
    marginVertical: 14,
  },
  paperLine: {
    height: 6,
    backgroundColor: "#E4EAF1",
    borderRadius: 3,
    width: "100%",
  },
  paperSignature: {
    fontSize: 11,
    color: "#748197",
    fontStyle: "italic",
    textAlign: "right",
    marginTop: 22,
  },
  editToolsRow: {
    flexDirection: "row",
    gap: 10,
  },
  editToolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  editToolBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  draftNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginVertical: 14,
    gap: 10,
  },
  draftNoticeText: {
    fontSize: 12,
    flex: 1,
  },

  /* Result screen */
  resultScreen: {
    padding: 26,
    alignItems: "center",
  },
  resultIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 4,
    textAlign: "center",
  },
  resultSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 300,
  },
  receiptBox: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  receiptLabel: {
    fontSize: 13,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* Announcement composer */
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarGroup: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGroupText: {
    fontSize: 13,
    fontWeight: "800",
  },
  recipientLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  recipientTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    height: 104,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  fieldCharCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  messagePreview: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  messagePreviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  messagePreviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  messagePreviewText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  inlineSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  inlineSuccessTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  inlineSuccessDesc: {
    fontSize: 13,
    marginTop: 2,
  },

  /* Requests */
  requestHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requestHistoryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  requestHistorySub: {
    fontSize: 11,
    marginTop: 2,
  },

  /* Profile */
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  avatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: {
    fontSize: 16,
    fontWeight: "800",
  },
  identityName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  identityDept: {
    fontSize: 11.5,
    marginTop: 2,
  },
  identityEmail: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 2,
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  themeSegmentContainer: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  themeSegmentBtnActive: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  themeSegmentIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  themeSegmentLabel: {
    fontSize: 12,
  },
  themeActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 2,
  },
  settingsBlock: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  settingsRowTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  settingsRowSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  settingsRowValue: {
    fontSize: 11.5,
    fontWeight: "700",
    marginRight: 6,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  dangerButtonIconWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  appVersion: {
    fontSize: 10.5,
    textAlign: "center",
    marginTop: 18,
    marginBottom: 8,
  },

  /* Bottom Navigation */
  bottomNavContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavCompactIndicator: {
    position: "absolute",
    top: 8,
    zIndex: 1,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    position: "relative",
    zIndex: 2,
  },
  bottomNavIconWrap: {
    width: 58,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomNavLabel: {
    fontSize: 10.5,
    marginTop: 2,
  },
  bottomNavIndicatorBar: {
    width: 20,
    height: 2.5,
    borderRadius: 1.5,
    marginTop: 3,
  },

  /* Login screen styles */
  loginScreenScroll: {
    flex: 1,
  },
  loginScreenContent: {
    padding: 22,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  loginTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  institutionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  institutionTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  loginTopActions: {
    flexDirection: "row",
    gap: 8,
  },
  compactControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactControlText: {
    fontSize: 11,
    fontWeight: "700",
  },
  loginCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 8,
  },
  brandSubtitle: {
    fontSize: 11.5,
    marginTop: 3,
    textAlign: "center",
  },
  roleSwitch: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  roleSwitchButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  roleSwitchButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roleSwitchText: {
    fontSize: 12.5,
  },
  formStack: {
    gap: 12,
  },
  field: {
    gap: 5,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    fontSize: 13.5,
  },
  inputPrefixIcon: {
    position: "absolute",
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  inputWithPrefix: {
    paddingLeft: 40,
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIconWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  ghostButton: {
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  loginFooter: {
    alignItems: "center",
    paddingTop: 14,
    gap: 6,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureNote: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  universityAffiliation: {
    fontSize: 10.5,
    textAlign: "center",
    lineHeight: 14,
    maxWidth: 320,
    opacity: 0.75,
  },

  /* Dialog Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 7,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  modalMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "700",
  },
});

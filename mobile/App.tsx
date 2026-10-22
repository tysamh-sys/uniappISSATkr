import React, { useMemo, useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";

type Role = "student" | "teacher";
type Theme = "light" | "dark" | "system";
type Lang = "fr" | "en";
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
    next: "Prochain cours",
    notifications: "Notifications",
    synced: "Synchronisé",
    offline: "Hors ligne",
    classes: "cours",
  },
  en: {
    home: "Home",
    timetable: "Timetable",
    attendance: "Attendance",
    profile: "Profile",
    today: "Today",
    next: "Next class",
    notifications: "Notifications",
    synced: "Synced",
    offline: "Offline",
    classes: "classes",
  },
};

const getColors = (isDark: boolean) => ({
  primary: isDark ? "#8ab4e1" : "#123865",
  primaryStrong: isDark ? "#b3d2f1" : "#0b294d",
  primarySoft: isDark ? "#182e47" : "#eaf1f9",
  surface: isDark ? "#121a24" : "#ffffff",
  surfaceMuted: isDark ? "#18222e" : "#f5f7f9",
  surfaceRaised: isDark ? "#1c2733" : "#ffffff",
  text: isDark ? "#eef3f8" : "#152234",
  textSecondary: isDark ? "#a8b5c4" : "#607083",
  border: isDark ? "#2c3947" : "#dfe5eb",
  success: isDark ? "#67bd92" : "#287454",
  successSoft: isDark ? "#16362b" : "#eaf6f0",
  danger: isDark ? "#ee8990" : "#b33c45",
  dangerSoft: isDark ? "#412326" : "#fbecee",
  warning: isDark ? "#e9b75f" : "#9b6715",
  warningSoft: isDark ? "#392f1e" : "#fff5dc",
  info: isDark ? "#81b8e7" : "#28649b",
  infoSoft: isDark ? "#1b3349" : "#eaf3fb",
  background: isDark ? "#0c121a" : "#f0f2f5",
});

function AppIcon({
  name,
  size = 20,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const iconColor = color || "#152234";

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
    case "more":
    default:
      return <Feather name="more-horizontal" size={size} color={iconColor} />;
  }
}

function StatusBadge({
  state,
  label,
  colors,
}: {
  state: "success" | "danger" | "warning" | "info" | "neutral";
  label: string;
  colors: ReturnType<typeof getColors>;
}) {
  let bg = colors.surfaceMuted;
  let text = colors.textSecondary;
  if (state === "success") {
    bg = colors.successSoft;
    text = colors.success;
  } else if (state === "danger") {
    bg = colors.dangerSoft;
    text = colors.danger;
  } else if (state === "warning") {
    bg = colors.warningSoft;
    text = colors.warning;
  } else if (state === "info") {
    bg = colors.infoSoft;
    text = colors.info;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

function Logo({ colors }: { colors: ReturnType<typeof getColors> }) {
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[
        styles.logoContainer,
        {
          backgroundColor: "#ffffff",
          borderColor: colors.border,
        },
      ]}
    >
      {failed ? (
        <View style={styles.logoPlaceholder}>
          <Text style={[styles.logoPlaceholderText, { color: colors.primary }]}>
            ISSAT Kairouan
          </Text>
        </View>
      ) : (
        <Image
          source={require("./assets/issatk_logo.jpg")}
          defaultSource={{ uri: logoUrl }}
          style={styles.brandLogo}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

// Lightweight, smooth screen transition wrapper
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

// Gentle subtle fade transition for tabs and filter state updates
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

// Smooth animated dialog modal for confirmations and information
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
  colors: ReturnType<typeof getColors>;
  icon?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
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
                outputRange: [0, 0.52],
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
                    outputRange: [0.93, 1],
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
            <AppIcon name={icon} size={22} color={colors.primary} />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.modalActions}>
            {cancelText && (
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                { backgroundColor: colors.primaryStrong },
              ]}
              onPress={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AppHeader({
  title,
  subtitle,
  online,
  onToggleOnline,
  onNotifications,
  lang,
  onBack,
  colors,
}: {
  title: string;
  subtitle?: string;
  online: boolean;
  onToggleOnline: () => void;
  onNotifications?: () => void;
  lang: Lang;
  onBack?: () => void;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View
      style={[
        styles.appHeader,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.headerLine}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <AppIcon name="back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.titleStack}>
          {subtitle ? (
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.text }]}
          >
            {title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onToggleOnline}
            activeOpacity={0.8}
            style={[
              styles.connectivity,
              {
                backgroundColor: online ? colors.successSoft : colors.surfaceMuted,
              },
            ]}
          >
            <AppIcon
              name={online ? "cloud" : "wifiOff"}
              size={13}
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
          </TouchableOpacity>
          {onNotifications && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={onNotifications}
              activeOpacity={0.7}
            >
              <AppIcon name="bell" size={18} color={colors.text} />
              <View style={[styles.unreadDotBadge, { backgroundColor: colors.danger, borderColor: colors.surface }]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function OfflineNotice({ colors }: { colors: ReturnType<typeof getColors> }) {
  return (
    <View style={[styles.offlineNotice, { backgroundColor: colors.warningSoft }]}>
      <AppIcon name="wifiOff" size={18} color={colors.warning} />
      <View style={styles.offlineNoticeTexts}>
        <Text style={[styles.offlineNoticeTitle, { color: colors.warning }]}>
          Données en cache
        </Text>
        <Text style={[styles.offlineNoticeDesc, { color: colors.warning }]}>
          Dernière mise à jour aujourd’hui à 10:42
        </Text>
      </View>
    </View>
  );
}

type ClassItem = {
  time: string;
  end: string;
  subject: string;
  meta: string;
  status: string;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  current?: boolean;
  unread?: boolean;
};

const studentClasses: ClassItem[] = [
  {
    time: "08:30",
    end: "10:00",
    subject: "Développement Web",
    meta: "Salle B12 · M. Ben Salem",
    status: "Présent",
    tone: "success",
  },
  {
    time: "10:15",
    end: "11:45",
    subject: "Bases de données",
    meta: "Labo 03 · Mme. Gharbi",
    status: "En cours",
    tone: "info",
    current: true,
  },
  {
    time: "13:30",
    end: "15:00",
    subject: "Réseaux informatiques",
    meta: "Amphi A · M. Trabelsi",
    status: "À venir",
    tone: "neutral",
    unread: true,
  },
];

const teacherClasses: ClassItem[] = [
  {
    time: "09:00",
    end: "10:30",
    subject: "Systèmes distribués",
    meta: "Salle C08 · ING3-A",
    status: "Enregistrée",
    tone: "success",
  },
  {
    time: "11:00",
    end: "12:30",
    subject: "Architecture logicielle",
    meta: "Labo 02 · ING2-B",
    status: "À enregistrer",
    tone: "warning",
    current: true,
  },
  {
    time: "14:00",
    end: "15:30",
    subject: "Projet intégré",
    meta: "Salle P04 · ING3-A",
    status: "À venir",
    tone: "neutral",
  },
];

function ClassRow({
  item,
  onClick,
  colors,
}: {
  item: ClassItem;
  onClick: () => void;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onClick}
      style={[
        styles.classRow,
        {
          backgroundColor: item.current ? colors.primarySoft : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.classTimeCol}>
        <Text style={[styles.classTimeMain, { color: colors.text }]}>{item.time}</Text>
        <Text style={[styles.classTimeSub, { color: colors.textSecondary }]}>{item.end}</Text>
      </View>
      <View style={styles.timelineMark}>
        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: item.current ? colors.info : colors.surface,
              borderColor: item.current ? colors.info : colors.textSecondary,
            },
          ]}
        />
      </View>
      <View style={styles.classContentCol}>
        <View style={styles.classHeadingRow}>
          <Text numberOfLines={1} style={[styles.classSubject, { color: colors.text }]}>
            {item.subject}
          </Text>
          {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />}
        </View>
        <Text numberOfLines={1} style={[styles.classMeta, { color: colors.textSecondary }]}>
          {item.meta}
        </Text>
        <StatusBadge state={item.tone} label={item.status} colors={colors} />
      </View>
      <AppIcon name="chevron" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function BottomNav({
  screen,
  onNavigate,
  lang,
  colors,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const insets = useSafeAreaInsets();
  const items: { icon: string; screen: Screen; label: string }[] = [
    { icon: "home", screen: "home", label: copy[lang].home },
    { icon: "calendar", screen: "timetable", label: copy[lang].timetable },
    { icon: "check", screen: "attendance", label: copy[lang].attendance },
    { icon: "user", screen: "profile", label: copy[lang].profile },
  ];

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {items.map((item) => {
        const isActive = screen === item.screen;
        return (
          <TouchableOpacity
            key={item.screen}
            onPress={() => onNavigate(item.screen)}
            style={styles.bottomNavItem}
            activeOpacity={0.7}
          >
            {isActive && (
              <View
                style={[styles.bottomNavIndicator, { backgroundColor: colors.primary }]}
              />
            )}
            <AppIcon
              name={item.icon}
              size={20}
              color={isActive ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LoginScreen({
  onLogin,
  role,
  setRole,
  lang,
  setLang,
  theme,
  setTheme,
  colors,
}: {
  onLogin: () => void;
  role: Role;
  setRole: (r: Role) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  colors: ReturnType<typeof getColors>;
}) {
  const [email, setEmail] = useState(
    role === "student" ? "etudiant@issatk.rnu.tn" : "enseignant@issatk.rnu.tn"
  );
  const [password, setPassword] = useState("issatk2025");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);

  // Sync default email when switching role
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setEmail(
      newRole === "student"
        ? "etudiant@issatk.rnu.tn"
        : "enseignant@issatk.rnu.tn"
    );
  };

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 350);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.loginScreenScroll}
        contentContainerStyle={[
          styles.loginScreenContent,
          { backgroundColor: colors.surface },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Actions */}
        <View style={styles.loginTopBar}>
          <View
            style={[
              styles.institutionTag,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <AppIcon name="shield" size={13} color={colors.primary} />
            <Text style={[styles.institutionTagText, { color: colors.primary }]}>
              Portail Universitaire
            </Text>
          </View>
          <View style={styles.loginTopActions}>
            <TouchableOpacity
              style={[
                styles.compactControl,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
              onPress={() => setLang(lang === "fr" ? "en" : "fr")}
              activeOpacity={0.7}
            >
              <AppIcon name="language" size={13} color={colors.textSecondary} />
              <Text style={[styles.compactControlText, { color: colors.textSecondary }]}>
                {lang === "fr" ? "FR" : "EN"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.compactControl,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
              onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
              activeOpacity={0.7}
            >
              <AppIcon
                name={theme === "dark" ? "sun" : "moon"}
                size={13}
                color={colors.textSecondary}
              />
              <Text style={[styles.compactControlText, { color: colors.textSecondary }]}>
                {theme === "dark" ? "Clair" : "Sombre"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Central Core: Brand, Role Switcher, and Credentials Form */}
        <View style={styles.loginMainSection}>
          <View style={styles.brandBlock}>
            <Logo colors={colors} />
            <Text style={[styles.institution, { color: colors.primary }]}>
              ISSAT Kairouan
            </Text>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              My ISSATkr
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
              {lang === "fr"
                ? "Gestion universitaire des présences"
                : "University Attendance Management"}
            </Text>
          </View>

          {/* Role Switcher */}
          <View
            style={[
              styles.roleSwitch,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
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
                    color: role === "student" ? colors.primary : colors.textSecondary,
                    fontWeight: role === "student" ? "700" : "500",
                  },
                ]}
              >
                {lang === "fr" ? "Étudiant" : "Student"}
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
                name="award"
                size={14}
                color={role === "teacher" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleSwitchText,
                  {
                    color: role === "teacher" ? colors.primary : colors.textSecondary,
                    fontWeight: role === "teacher" ? "700" : "500",
                  },
                ]}
              >
                {lang === "fr" ? "Enseignant" : "Teacher"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formStack}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {lang === "fr" ? "Identifiant institutionnel" : "Institutional ID"}
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
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
              <View style={styles.fieldHeader}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {lang === "fr" ? "Mot de passe" : "Password"}
                </Text>
              </View>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surface,
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
                  style={styles.passwordToggle}
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
              style={styles.forgotButton}
              onPress={() => setForgotModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                {lang === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primaryStrong },
              ]}
              onPress={submit}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <Text style={styles.primaryButtonText}>
                    {lang === "fr" ? "Connexion en cours…" : "Connecting…"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {lang === "fr" ? "Se connecter" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Academic Footer */}
        <View style={styles.loginFooter}>
          <View style={styles.securityRow}>
            <AppIcon name="lock" size={13} color={colors.textSecondary} />
            <Text style={[styles.secureNote, { color: colors.textSecondary }]}>
              {lang === "fr"
                ? "Accès sécurisé réservé aux membres de l’ISSATK"
                : "Restricted secure access for ISSATK members"}
            </Text>
          </View>
          <Text style={[styles.universityAffiliation, { color: colors.textSecondary }]}>
            Institut Supérieur des Sciences Appliquées et de Technologie de Kairouan
          </Text>
        </View>

        {/* Smooth Dialog for Forgot Password */}
        <SmoothDialog
          visible={forgotModalVisible}
          onClose={() => setForgotModalVisible(false)}
          title={lang === "fr" ? "Récupération d'accès" : "Access Recovery"}
          message={
            lang === "fr"
              ? "Veuillez contacter le service scolarité ou l'administrateur informatique de l'ISSATK (bureau A12 ou scolarite@issatk.rnu.tn) muni de votre carte d'étudiant ou identifiant enseignant."
              : "Please contact the ISSATK administration office or IT department (Office A12 or scolarite@issatk.rnu.tn) with your university ID."
          }
          confirmText={lang === "fr" ? "Compris" : "Got it"}
          colors={colors}
          icon="info"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const classes = role === "student" ? studentClasses : teacherClasses;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title={role === "student" ? "Bonjour, Amine" : "Bonjour, Mme. Mansouri"}
        subtitle="Mardi 18 mars 2025"
        online={online}
        onToggleOnline={toggleOnline}
        onNotifications={() => navigate("notifications")}
        lang={lang}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        {!online && <OfflineNotice colors={colors} />}

        <View style={[styles.nextCard, { backgroundColor: colors.primaryStrong }]}>
          <View style={styles.nextTop}>
            <Text style={styles.nextKicker}>{copy[lang].next}</Text>
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>Dans 12 min</Text>
            </View>
          </View>
          <Text style={styles.nextTitle}>{classes[1].subject}</Text>
          <View style={styles.nextInfoRow}>
            <AppIcon name="clock" size={14} color="#dcecff" />
            <Text style={styles.nextInfoText}>
              {classes[1].time} – {classes[1].end}
            </Text>
          </View>
          <View style={styles.nextInfoRow}>
            <AppIcon name="map" size={14} color="#dcecff" />
            <Text style={styles.nextInfoText}>{classes[1].meta}</Text>
          </View>
          <TouchableOpacity
            style={styles.nextCardButton}
            onPress={() => navigate("class")}
            activeOpacity={0.8}
          >
            <Text style={styles.nextCardButtonText}>Voir le cours</Text>
            <AppIcon name="chevron" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>
              {copy[lang].today}
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Votre journée
            </Text>
          </View>
          <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
            3 {copy[lang].classes}
          </Text>
        </View>

        <View
          style={[
            styles.timelineList,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {classes.map((item) => (
            <ClassRow
              item={item}
              key={item.time}
              onClick={() => navigate("class")}
              colors={colors}
            />
          ))}
        </View>

        {role === "teacher" && (
          <TouchableOpacity
            style={[
              styles.requestStrip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigate("requests")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.requestIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <AppIcon name="file" size={18} color={colors.primary} />
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
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function TimetableScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const classes = role === "student" ? studentClasses : teacherClasses;
  const days = [
    ["Lun", "17"],
    ["Mar", "18"],
    ["Mer", "19"],
    ["Jeu", "20"],
    ["Ven", "21"],
    ["Sam", "22"],
  ];
  const [selectedDay, setSelectedDay] = useState("18");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Emploi du temps"
        subtitle="17 – 22 mars 2025"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        {!online && <OfflineNotice colors={colors} />}

        <View
          style={[
            styles.dayPicker,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {days.map(([day, date]) => {
            const isSel = selectedDay === date;
            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dayPickerItem,
                  isSel && [
                    styles.dayPickerItemSelected,
                    { backgroundColor: colors.primaryStrong },
                  ],
                ]}
                onPress={() => setSelectedDay(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayPickerDay,
                    { color: isSel ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayPickerDate,
                    { color: isSel ? "#ffffff" : colors.text },
                  ]}
                >
                  {date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.weekControls}>
          <TouchableOpacity
            style={[
              styles.weekNavBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <AppIcon name="back" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.weekControlsText, { color: colors.text }]}>
            {selectedDay === "18" ? "Mardi 18 mars" : `Journée du ${selectedDay} mars`}
          </Text>
          <TouchableOpacity
            style={[
              styles.weekNavBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <AppIcon name="chevron" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        <SubtleFadeTransition triggerKey={selectedDay}>
          <View
            style={[
              styles.timelineList,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {classes.map((item) => (
              <ClassRow
                item={item}
                key={item.time}
                onClick={() => navigate("class")}
                colors={colors}
              />
            ))}
          </View>
        </SubtleFadeTransition>
      </ScrollView>
    </View>
  );
}

function AttendanceScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const [filter, setFilter] = useState<"Toutes" | "Absences" | "En attente">("Toutes");

  // Teacher roster state
  const [states, setStates] = useState<Record<number, "present" | "absent">>({
    0: "present",
    1: "present",
    2: "absent",
  });
  const students = [
    "Amine Ben Amor",
    "Sarra Khelifi",
    "Youssef Hamdi",
    "Mariem Jlassi",
    "Aziz Ayari",
    "Nour Chaabane",
  ];

  const studentRecords = [
    { date: "17 mars", subject: "Programmation mobile", status: "Présent", tone: "success" as const, type: "present" },
    { date: "14 mars", subject: "Réseaux informatiques", status: "Absence justifiée", tone: "info" as const, type: "absent" },
    { date: "13 mars", subject: "Bases de données", status: "Absent", tone: "danger" as const, type: "absent" },
    { date: "12 mars", subject: "Développement Web", status: "En attente", tone: "warning" as const, type: "pending" },
  ];

  const filteredRecords = studentRecords.filter((rec) => {
    if (filter === "Absences") return rec.type === "absent";
    if (filter === "En attente") return rec.type === "pending";
    return true;
  });

  if (role === "student") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
        <AppHeader
          title="Historique de présence"
          subtitle="Mars 2025"
          online={online}
          onToggleOnline={toggleOnline}
          lang={lang}
          colors={colors}
        />
        <ScrollView contentContainerStyle={styles.screenContent}>
          {!online && <OfflineNotice colors={colors} />}

          <View
            style={[
              styles.summaryGrid,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.summaryCell, { borderRightColor: colors.border }]}>
              <Text style={[styles.summaryNum, { color: colors.primary }]}>18</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Présences
              </Text>
            </View>
            <View style={[styles.summaryCell, { borderRightColor: colors.border }]}>
              <Text style={[styles.summaryNum, { color: colors.danger }]}>2</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Absences
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryNum, { color: colors.info }]}>1</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Justifiée
              </Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {(["Toutes", "Absences", "En attente"] as const).map((tab) => {
              const active = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? "700" : "500",
                      },
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SubtleFadeTransition triggerKey={filter}>
            <View
              style={[
                styles.recordList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {filteredRecords.map((r, i) => (
                <View
                  key={r.subject}
                  style={[
                    styles.recordRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: i === filteredRecords.length - 1 ? 0 : 1,
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
                      {r.date} · 08:30–10:00
                    </Text>
                  </View>
                  <StatusBadge state={r.tone} label={r.status} colors={colors} />
                </View>
              ))}
            </View>
          </SubtleFadeTransition>

          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigate("scanner")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <AppIcon name="camera" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                Justifier une absence
              </Text>
              <Text
                style={[
                  styles.actionCardSub,
                  { color: colors.textSecondary },
                ]}
              >
                Scanner et envoyer un certificat
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Teacher Roster View
  const presentCount = Object.values(states).filter((s) => s === "present").length;
  const absentCount = Object.values(states).filter((s) => s === "absent").length;
  const allMarked = Object.keys(states).length === students.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Enregistrer les présences"
        subtitle="Architecture logicielle · ING2-B"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("class")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        {!online && (
          <View style={[styles.networkWarning, { backgroundColor: colors.warningSoft }]}>
            <AppIcon name="wifiOff" size={18} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.networkWarningTitle, { color: colors.warning }]}>
                Connexion requise
              </Text>
              <Text style={[styles.networkWarningDesc, { color: colors.warning }]}>
                Une connexion active est nécessaire pour enregistrer et valider les présences.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.rosterSummaryRow}>
          <Text style={[styles.rosterSummaryCount, { color: colors.text }]}>
            <Text style={{ fontWeight: "700" }}>{Object.keys(states).length}</Text> /{" "}
            {students.length} marqués
          </Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Présent
            </Text>
            <View style={[styles.legendDot, { backgroundColor: colors.danger, marginLeft: 8 }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Absent
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.rosterList,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {students.map((student, index) => {
            const initials = student
              .split(" ")
              .map((n) => n[0])
              .join("");
            const isP = states[index] === "present";
            const isA = states[index] === "absent";

            return (
              <View
                key={student}
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
                    {student}
                  </Text>
                  <Text style={[styles.studentId, { color: colors.textSecondary }]}>
                    ING2-{String(index + 1).padStart(3, "0")}
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
                    onPress={() => setStates({ ...states, [index]: "present" })}
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
                    onPress={() => setStates({ ...states, [index]: "absent" })}
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
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.stickySubmitCount, { color: colors.textSecondary }]}>
            {presentCount} présents · {absentCount} absents
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.primaryStrong,
                opacity: !online || !allMarked ? 0.5 : 1,
                paddingHorizontal: 20,
              },
            ]}
            disabled={!online || !allMarked}
            onPress={() => navigate("submission")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function ClassDetailsScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const teacher = role === "teacher";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title={teacher ? "Architecture logicielle" : "Réseaux informatiques"}
        subtitle="Détails du cours"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        {!online && <OfflineNotice colors={colors} />}

        <View
          style={[
            styles.courseHero,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.courseCodeBadge,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text style={[styles.courseCodeText, { color: colors.primary }]}>
              {teacher ? "AL" : "RI"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>
              Mardi 18 mars 2025
            </Text>
            <Text style={[styles.courseHeroTitle, { color: colors.text }]}>
              {teacher ? "ING2-B" : "Réseaux informatiques"}
            </Text>
            <Text style={[styles.courseHeroSub, { color: colors.textSecondary }]}>
              {teacher ? "28 étudiants" : "M. Trabelsi"}
            </Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View
            style={[
              styles.detailGridCell,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <AppIcon name="clock" size={18} color={colors.primary} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.detailCellLabel, { color: colors.textSecondary }]}>
                Horaire
              </Text>
              <Text style={[styles.detailCellValue, { color: colors.text }]}>
                {teacher ? "11:00 – 12:30" : "13:30 – 15:00"}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.detailGridCell,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <AppIcon name="map" size={18} color={colors.primary} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.detailCellLabel, { color: colors.textSecondary }]}>
                Salle
              </Text>
              <Text style={[styles.detailCellValue, { color: colors.text }]}>
                {teacher ? "Labo 02" : "Amphi A"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusPanel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.statusPanelLabel, { color: colors.textSecondary }]}>
              État des présences
            </Text>
            <Text style={[styles.statusPanelValue, { color: colors.text }]}>
              {teacher ? "Pas encore enregistrées" : "Pas encore enregistrée"}
            </Text>
          </View>
          <StatusBadge state="warning" label="En attente" colors={colors} />
        </View>

        {teacher ? (
          <View style={styles.classActions}>
            {!online && (
              <View style={[styles.inlineWarning, { backgroundColor: colors.warningSoft }]}>
                <AppIcon name="wifiOff" size={16} color={colors.warning} />
                <Text style={[styles.inlineWarningText, { color: colors.warning }]}>
                  Connectez-vous au réseau autorisé pour enregistrer les présences.
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primaryStrong, opacity: !online ? 0.5 : 1 },
              ]}
              disabled={!online}
              onPress={() => navigate("attendance")}
              activeOpacity={0.8}
            >
              <AppIcon name="check" size={18} color="#ffffff" />
              <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                Enregistrer les présences
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => navigate("announcement")}
              activeOpacity={0.8}
            >
              <AppIcon name="megaphone" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary, marginLeft: 8 }]}>
                Envoyer une annonce
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.announcementCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.announcementHeader}>
              <View
                style={[
                  styles.announcementIcon,
                  { backgroundColor: colors.dangerSoft },
                ]}
              >
                <AppIcon name="megaphone" size={16} color={colors.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.announcementTitle, { color: colors.text }]}>
                  Nouvelle annonce
                </Text>
                <Text style={[styles.announcementTime, { color: colors.textSecondary }]}>
                  Aujourd’hui · 09:42
                </Text>
              </View>
              <View style={[styles.unreadDot, { backgroundColor: colors.danger }]} />
            </View>
            <Text style={[styles.announcementBody, { color: colors.textSecondary }]}>
              Le cours aura lieu dans l’amphithéâtre A au lieu de la salle C04.
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.announcementAction, { color: colors.primary }]}>
                Marquer comme lue
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NotificationsScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const notices =
    role === "student"
      ? [
          {
            title: "Changement de salle",
            text: "Réseaux informatiques aura lieu en Amphi A.",
            time: "Il y a 18 min",
            unread: true,
            icon: "megaphone",
          },
          {
            title: "Présence mise à jour",
            text: "Votre présence au cours de Développement Web est confirmée.",
            time: "Il y a 2 h",
            unread: false,
            icon: "check",
          },
          {
            title: "Justificatif approuvé",
            text: "Votre absence du 14 mars est maintenant justifiée.",
            time: "Hier",
            unread: false,
            icon: "calendar",
          },
        ]
      : [
          {
            title: "Cours dans 30 minutes",
            text: "Architecture logicielle · ING2-B · Labo 02",
            time: "Il y a 4 min",
            unread: true,
            icon: "clock",
          },
          {
            title: "Mise à jour administrative",
            text: "Votre demande a été transmise au département.",
            time: "Hier",
            unread: false,
            icon: "check",
          },
          {
            title: "Emploi du temps modifié",
            text: "Le cours du vendredi est déplacé à 10:00.",
            time: "16 mars",
            unread: false,
            icon: "calendar",
          },
        ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title={copy[lang].notifications}
        subtitle="3 nouvelles"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View
          style={[
            styles.notificationList,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {notices.map((n, i) => (
            <TouchableOpacity
              key={n.title}
              style={[
                styles.notificationRow,
                {
                  backgroundColor: n.unread ? colors.primarySoft : colors.surface,
                  borderBottomColor: colors.border,
                  borderBottomWidth: i === notices.length - 1 ? 0 : 1,
                },
              ]}
              onPress={() => i === 0 && navigate("class")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.noticeIconWrap,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <AppIcon name={n.icon} size={16} color={colors.primary} />
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ScannerScreen({
  online,
  navigate,
  lang,
  colors,
}: {
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View style={styles.scannerScreen}>
      <SafeAreaView style={{ backgroundColor: "#111923" }}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate("attendance")}
            activeOpacity={0.7}
          >
            <AppIcon name="back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.scannerEyebrow}>Justificatif d’absence</Text>
            <Text style={styles.scannerHeaderTitle}>Scanner le certificat</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.cameraView}>
        <View style={styles.scanGuides}>
          <View style={[styles.cornerGuide, styles.guideTL]} />
          <View style={[styles.cornerGuide, styles.guideTR]} />
          <View style={[styles.cornerGuide, styles.guideBL]} />
          <View style={[styles.cornerGuide, styles.guideBR]} />
        </View>

        <View style={styles.documentSample}>
          <View style={styles.docHead} />
          <View style={[styles.docLine, styles.docLineWide]} />
          <View style={styles.docLine} />
          <View style={[styles.docLine, styles.docLineWide]} />
          <View style={styles.docStamp}>
            <Text style={styles.docStampText}>CERTIFICAT</Text>
          </View>
        </View>

        <Text style={styles.cameraInstruction}>Placez le document dans le cadre</Text>
      </View>

      <View style={styles.cameraControls}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => navigate("preview")}
          activeOpacity={0.7}
        >
          <AppIcon name="file" size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => navigate("preview")}
          activeOpacity={0.7}
        >
          <View style={styles.captureInnerCircle} />
        </TouchableOpacity>
        <Text style={styles.pageCountBadge}>1 page</Text>
      </View>
    </View>
  );
}

function DocumentPreviewScreen({
  online,
  navigate,
  lang,
  colors,
}: {
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Vérifier le document"
        subtitle="Page 1 sur 1"
        online={online}
        onToggleOnline={() => {}}
        lang={lang}
        onBack={() => navigate("scanner")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.previewDocumentSheet}>
          <View style={styles.paperLogo}>
            <Text style={styles.paperLogoText}>CENTRE MÉDICAL</Text>
          </View>
          <Text style={styles.paperDocTitle}>CERTIFICAT MÉDICAL</Text>
          <View style={styles.paperTextLines}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View
                key={i}
                style={[
                  styles.paperLine,
                  i % 3 === 0 && { width: "65%" },
                ]}
              />
            ))}
          </View>
          <Text style={styles.paperSignature}>Signature et cachet</Text>
        </View>

        <View style={styles.editToolsRow}>
          <TouchableOpacity
            style={[
              styles.editToolBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => Alert.alert("Recadrer", "Mode recadrage activé")}
            activeOpacity={0.7}
          >
            <AppIcon name="camera" size={16} color={colors.text} />
            <Text style={[styles.editToolBtnText, { color: colors.text }]}>
              Recadrer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editToolBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => Alert.alert("Ajuster", "Contraste et luminosité ajustés")}
            activeOpacity={0.7}
          >
            <AppIcon name="more" size={16} color={colors.text} />
            <Text style={[styles.editToolBtnText, { color: colors.text }]}>
              Ajuster
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editToolBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigate("scanner")}
            activeOpacity={0.7}
          >
            <AppIcon name="file" size={16} color={colors.text} />
            <Text style={[styles.editToolBtnText, { color: colors.text }]}>
              Ajouter
            </Text>
          </TouchableOpacity>
        </View>

        {!online && (
          <View style={[styles.draftNotice, { backgroundColor: colors.warningSoft }]}>
            <AppIcon name="wifiOff" size={16} color={colors.warning} />
            <Text style={[styles.draftNoticeText, { color: colors.warning }]}>
              Le document sera enregistré comme brouillon non envoyé.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, marginTop: 12 },
          ]}
          onPress={() => navigate("submission")}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {online ? "Confirmer et envoyer" : "Enregistrer le brouillon"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SubmissionScreen({
  role,
  online,
  navigate,
  lang,
  colors,
}: {
  role: Role;
  online: boolean;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const teacher = role === "teacher";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <ScrollView contentContainerStyle={styles.resultScreen}>
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
        <Text style={[styles.sectionKicker, { color: colors.textSecondary }]}>
          {teacher ? "Présences" : "Justificatif"}
        </Text>
        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {online
            ? teacher
              ? "Présences enregistrées"
              : "Document envoyé"
            : "Brouillon enregistré"}
        </Text>
        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
          {online
            ? teacher
              ? "La feuille de présence a été confirmée par le serveur à 11:24."
              : "Votre justificatif est maintenant en cours d’examen."
            : "Ce document n’a pas été envoyé. Reconnectez-vous pour poursuivre."}
        </Text>

        <View
          style={[
            styles.receiptBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.receiptRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Référence
            </Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>
              {teacher ? "ATT-250318-042" : "JUS-250318-018"}
            </Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Statut
            </Text>
            <StatusBadge
              state={online ? "info" : "warning"}
              label={
                online
                  ? teacher
                    ? "Confirmé"
                    : "En examen"
                  : "Brouillon non envoyé"
              }
              colors={colors}
            />
          </View>
          <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
              Date
            </Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>
              18 mars 2025, 11:24
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, width: "100%", marginTop: 12 },
          ]}
          onPress={() => navigate("home")}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Retour à l’accueil</Text>
        </TouchableOpacity>

        {!teacher && (
          <TouchableOpacity
            style={[styles.ghostButton, { width: "100%", marginTop: 8 }]}
            onPress={() => navigate("attendance")}
            activeOpacity={0.7}
          >
            <Text style={[styles.ghostButtonText, { color: colors.primary }]}>
              Voir mes demandes
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnnouncementScreen({
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState("Retard prévu");
  const [msg, setMsg] = useState(
    "Je vais arriver avec environ 10 minutes de retard. Merci de rester dans la salle."
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Nouvelle annonce"
        subtitle="Architecture logicielle · ING2-B"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("class")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        {sent ? (
          <View
            style={[
              styles.inlineSuccessBox,
              { backgroundColor: colors.successSoft },
            ]}
          >
            <AppIcon name="check" size={28} color={colors.success} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.inlineSuccessTitle, { color: colors.success }]}>
                Annonce envoyée
              </Text>
              <Text style={[styles.inlineSuccessDesc, { color: colors.success }]}>
                28 étudiants ont été notifiés.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.recipientCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.avatarGroup,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Text style={[styles.avatarGroupText, { color: colors.primary }]}>
                  2B
                </Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>
                  Destinataires
                </Text>
                <Text style={[styles.recipientTitle, { color: colors.text }]}>
                  Groupe ING2-B · 28 étudiants
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
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.messagePreviewLabel, { color: colors.textSecondary }]}>
                Aperçu étudiant
              </Text>
              <Text style={[styles.messagePreviewTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.messagePreviewText, { color: colors.textSecondary }]}>
                {msg}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primaryStrong,
                  opacity: !online ? 0.5 : 1,
                  marginTop: 8,
                },
              ]}
              disabled={!online}
              onPress={() => setSent(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Envoyer l’annonce</Text>
            </TouchableOpacity>

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
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primaryStrong, marginTop: 20 },
            ]}
            onPress={() => navigate("class")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Retour au cours</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function RequestsScreen({
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
}: {
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  colors: ReturnType<typeof getColors>;
}) {
  const [requestType, setRequestType] = useState("Signaler une absence prévue");
  const [date, setDate] = useState("Vendredi 21 mars 2025");
  const [reason, setReason] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const submit = () => {
    setSuccessModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Demandes administratives"
        subtitle="Enseignant"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        onBack={() => navigate("home")}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
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

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primaryStrong, opacity: !online ? 0.5 : 1 },
          ]}
          disabled={!online}
          onPress={submit}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Soumettre la demande</Text>
        </TouchableOpacity>

        <View style={[styles.sectionHeading, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Demandes récentes
          </Text>
        </View>

        <View
          style={[
            styles.requestHistoryRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
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
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 },
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
}: {
  role: Role;
  online: boolean;
  toggleOnline: () => void;
  navigate: (s: Screen) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  colors: ReturnType<typeof getColors>;
}) {
  const teacher = role === "teacher";
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceMuted }}>
      <AppHeader
        title="Profil et réglages"
        subtitle="Compte institutionnel"
        online={online}
        onToggleOnline={toggleOnline}
        lang={lang}
        colors={colors}
      />
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
              {teacher ? "SM" : "AB"}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.identityName, { color: colors.text }]}>
              {teacher ? "Sonia Mansouri" : "Amine Ben Amor"}
            </Text>
            <Text style={[styles.identityDept, { color: colors.textSecondary }]}>
              {teacher ? "Département Informatique" : "ING2 · Groupe B"}
            </Text>
            <Text style={[styles.identityEmail, { color: colors.textSecondary }]}>
              {teacher ? "sonia.mansouri@issatk.rnu.tn" : "2023-ING-0142"}
            </Text>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary }]}>
            Apparence
          </Text>
          <View style={styles.themeOptionsGrid}>
            {(["light", "dark", "system"] as Theme[]).map((t) => {
              const selected = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setTheme(t)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.themePreviewBox,
                      t === "light"
                        ? { backgroundColor: "#f1f3f5" }
                        : t === "dark"
                        ? { backgroundColor: "#141c26" }
                        : { backgroundColor: "#e2e6eb" },
                    ]}
                  >
                    <View
                      style={[
                        styles.themePreviewBar,
                        { backgroundColor: t === "dark" ? "#8291a0" : "#b5bec8" },
                      ]}
                    />
                    <View
                      style={[
                        styles.themePreviewBlock,
                        { backgroundColor: t === "dark" ? "#26313e" : "#ffffff" },
                      ]}
                    />
                  </View>
                  <Text style={[styles.themeOptionLabel, { color: colors.text }]}>
                    {t === "light" ? "Clair" : t === "dark" ? "Sombre" : "Système"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.textSecondary }]}>
            Préférences
          </Text>
          <View
            style={[
              styles.settingsBlock,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.settingsRow, { borderBottomColor: colors.border }]}
              onPress={() => setLang(lang === "fr" ? "en" : "fr")}
              activeOpacity={0.7}
            >
              <AppIcon name="language" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text }]}>
                  Langue
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary }]}>
                  {lang === "fr" ? "Français" : "English"}
                </Text>
              </View>
              <Text style={[styles.settingsRowValue, { color: colors.textSecondary }]}>
                {lang === "fr" ? "FR" : "EN"}
              </Text>
              <AppIcon name="chevron" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.settingsRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: teacher ? 1 : 0,
                },
              ]}
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              activeOpacity={0.7}
            >
              <AppIcon name="bell" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.text }]}>
                  Notifications
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary }]}>
                  Cours, présences et annonces
                </Text>
              </View>
              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: notificationsEnabled
                      ? colors.primary
                      : colors.border,
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

            {teacher && (
              <TouchableOpacity
                style={[styles.settingsRow, { borderBottomWidth: 0 }]}
                onPress={() => navigate("requests")}
                activeOpacity={0.7}
              >
                <AppIcon name="file" size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.settingsRowTitle, { color: colors.text }]}>
                    Mes demandes
                  </Text>
                  <Text style={[styles.settingsRowSub, { color: colors.textSecondary }]}>
                    Historique administratif
                  </Text>
                </View>
                <AppIcon name="chevron" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: colors.dangerSoft, marginTop: 20 }]}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.8}
        >
          <AppIcon name="logout" size={18} color={colors.danger} />
          <Text style={[styles.dangerButtonText, { color: colors.danger, marginLeft: 8 }]}>
            {lang === "fr" ? "Se déconnecter" : "Sign Out"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
          My ISSATkr · Version 1.0 (Expo React Native)
        </Text>

        <SmoothDialog
          visible={logoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          onConfirm={() => {
            setLogoutModalVisible(false);
            navigate("login");
          }}
          title={lang === "fr" ? "Déconnexion" : "Sign Out"}
          message={
            lang === "fr"
              ? "Êtes-vous sûr de vouloir vous déconnecter de votre compte institutionnel ISSATK ?"
              : "Are you sure you want to sign out of your institutional ISSATK account?"
          }
          confirmText={lang === "fr" ? "Déconnexion" : "Sign Out"}
          cancelText={lang === "fr" ? "Annuler" : "Cancel"}
          colors={colors}
          icon="logout"
        />
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [role, setRole] = useState<Role>("student");
  const [screen, setScreen] = useState<Screen>("login");
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("fr");
  const [online, setOnline] = useState(true);

  const effectiveDark = theme === "dark";
  const colors = useMemo(() => getColors(effectiveDark), [effectiveDark]);
  const showNav = ![
    "login",
    "class",
    "notifications",
    "scanner",
    "preview",
    "submission",
    "announcement",
    "requests",
  ].includes(screen);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.rootContainer, { backgroundColor: colors.surface }]}
        edges={["top", "left", "right"]}
      >
        <StatusBar style={effectiveDark ? "light" : "dark"} />

        {/* Global Demo Switcher pill (allows instant role switching on device) */}
        {screen !== "login" && (
          <View
            style={[
              styles.demoRoleBanner,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.demoRoleBadge}>
              <Text style={[styles.demoRoleLabel, { color: colors.textSecondary }]}>
                Mode test:
              </Text>
              <TouchableOpacity
                style={[
                  styles.demoRoleBtn,
                  role === "student" && { backgroundColor: colors.primaryStrong },
                ]}
                onPress={() => setRole("student")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.demoRoleBtnText,
                    { color: role === "student" ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  Étudiant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.demoRoleBtn,
                  role === "teacher" && { backgroundColor: colors.primaryStrong },
                ]}
                onPress={() => setRole("teacher")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.demoRoleBtnText,
                    { color: role === "teacher" ? "#ffffff" : colors.textSecondary },
                  ]}
                >
                  Enseignant
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Screen Router */}
        <View style={{ flex: 1 }}>
          <ScreenTransition screenKey={screen}>
            {screen === "login" && (
              <LoginScreen
                onLogin={() => setScreen("home")}
                role={role}
                setRole={setRole}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                colors={colors}
              />
            )}
            {screen === "home" && (
              <HomeScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "timetable" && (
              <TimetableScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "attendance" && (
              <AttendanceScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "class" && (
              <ClassDetailsScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "notifications" && (
              <NotificationsScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "scanner" && (
              <ScannerScreen
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "preview" && (
              <DocumentPreviewScreen
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "submission" && (
              <SubmissionScreen
                role={role}
                online={online}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "announcement" && (
              <AnnouncementScreen
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "requests" && (
              <RequestsScreen
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                colors={colors}
              />
            )}
            {screen === "profile" && (
              <ProfileScreen
                role={role}
                online={online}
                toggleOnline={() => setOnline(!online)}
                navigate={setScreen}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                colors={colors}
              />
            )}
          </ScreenTransition>
        </View>

        {showNav && (
          <BottomNav
            screen={screen}
            onNavigate={setScreen}
            lang={lang}
            colors={colors}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  demoRoleBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  demoRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  demoRoleLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  demoRoleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  demoRoleBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  appHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingRight: 8,
  },
  titleStack: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerActions: {
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
    gap: 4,
  },
  connectivityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  unreadDotBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  screenContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  offlineNoticeTexts: {
    flex: 1,
  },
  offlineNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  offlineNoticeDesc: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.9,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  nextCard: {
    padding: 16,
    borderRadius: 14,
    shadowColor: "#0b294d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  nextTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextKicker: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },
  nextBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nextBadgeText: {
    color: "#dcecff",
    fontSize: 10,
    fontWeight: "700",
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 8,
    marginBottom: 6,
  },
  nextInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  nextInfoText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  nextCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    borderRadius: 9,
    marginTop: 14,
    gap: 6,
  },
  nextCardButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  countLabel: {
    fontSize: 11,
  },
  timelineList: {
    borderRadius: 13,
    borderWidth: 1,
    overflow: "hidden",
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  classTimeCol: {
    width: 44,
  },
  classTimeMain: {
    fontSize: 12,
    fontWeight: "700",
  },
  classTimeSub: {
    fontSize: 10,
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
    width: 1,
    top: -15,
    bottom: -15,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    gap: 6,
  },
  classSubject: {
    fontSize: 13,
    fontWeight: "700",
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  classMeta: {
    fontSize: 11,
  },
  requestStrip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  requestIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  requestStripTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  requestStripSub: {
    fontSize: 10,
    marginTop: 2,
  },
  dayPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayPickerItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  dayPickerItemSelected: {
    // handled dynamically
  },
  dayPickerDay: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayPickerDate: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  weekControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  weekControlsText: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 10,
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
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
  },
  recordList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  statusMarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recordSubject: {
    fontSize: 12,
    fontWeight: "700",
  },
  recordMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    gap: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionCardSub: {
    fontSize: 10,
    marginTop: 2,
  },
  networkWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  networkWarningTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  networkWarningDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  rosterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rosterSummaryCount: {
    fontSize: 11,
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
    fontSize: 10,
  },
  rosterList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
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
    fontSize: 11,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 12,
    fontWeight: "700",
  },
  studentId: {
    fontSize: 10,
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
    fontSize: 11,
    fontWeight: "800",
  },
  stickySubmit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  stickySubmitCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  courseHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    gap: 12,
  },
  courseCodeBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  courseCodeText: {
    fontSize: 16,
    fontWeight: "800",
  },
  courseHeroTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 2,
  },
  courseHeroSub: {
    fontSize: 11,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  detailGridCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
  },
  detailCellLabel: {
    fontSize: 9,
  },
  detailCellValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  statusPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 10,
  },
  statusPanelLabel: {
    fontSize: 9,
  },
  statusPanelValue: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  classActions: {
    gap: 10,
    marginTop: 18,
  },
  inlineWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 9,
    gap: 8,
  },
  inlineWarningText: {
    fontSize: 11,
    flex: 1,
  },
  announcementCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  announcementIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  announcementTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  announcementTime: {
    fontSize: 9,
    marginTop: 1,
  },
  announcementBody: {
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 10,
  },
  announcementAction: {
    fontSize: 11,
    fontWeight: "700",
  },
  notificationList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  noticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notificationSubText: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  notificationTimeText: {
    fontSize: 9,
    marginTop: 4,
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: "#090e14",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scannerEyebrow: {
    fontSize: 10,
    color: "#a7b1bf",
    fontWeight: "600",
  },
  scannerHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  cameraView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  scanGuides: {
    position: "absolute",
    width: 260,
    height: 340,
    zIndex: 2,
  },
  cornerGuide: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#edf5fb",
  },
  guideTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  guideTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  guideBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  guideBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  documentSample: {
    width: 220,
    height: 300,
    backgroundColor: "#f6f3ed",
    borderRadius: 4,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ rotate: "-1deg" }],
    position: "relative",
  },
  docHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#67717b",
    alignSelf: "center",
    marginBottom: 20,
  },
  docLine: {
    height: 4,
    backgroundColor: "#c7c8c5",
    marginVertical: 6,
    width: "70%",
    borderRadius: 2,
  },
  docLineWide: {
    width: "100%",
  },
  docStamp: {
    position: "absolute",
    bottom: 24,
    right: 20,
    borderWidth: 2,
    borderColor: "#7b96ae",
    padding: 6,
    transform: [{ rotate: "-8deg" }],
  },
  docStampText: {
    color: "#7b96ae",
    fontSize: 9,
    fontWeight: "800",
  },
  cameraInstruction: {
    position: "absolute",
    bottom: 20,
    color: "#ced5dd",
    fontSize: 11,
  },
  cameraControls: {
    height: 100,
    backgroundColor: "#111923",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
  },
  galleryButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#1d2834",
    borderWidth: 1,
    borderColor: "#435060",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffffff",
  },
  pageCountBadge: {
    color: "#aeb9c5",
    fontSize: 11,
    fontWeight: "600",
  },
  previewDocumentSheet: {
    backgroundColor: "#fffefa",
    padding: 30,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#dfe5eb",
  },
  paperLogo: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#66717e",
    padding: 4,
  },
  paperLogoText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#303840",
  },
  paperDocTitle: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#303840",
    marginVertical: 24,
  },
  paperTextLines: {
    gap: 8,
  },
  paperLine: {
    height: 3,
    backgroundColor: "#d8d8d2",
    borderRadius: 1.5,
  },
  paperSignature: {
    textAlign: "right",
    fontStyle: "italic",
    fontSize: 10,
    color: "#607083",
    marginTop: 30,
  },
  editToolsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  editToolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    gap: 6,
  },
  editToolBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  draftNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 9,
    marginTop: 12,
    gap: 8,
  },
  draftNoticeText: {
    fontSize: 10,
    flex: 1,
  },
  resultScreen: {
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  resultIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  receiptBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  receiptLabel: {
    fontSize: 11,
  },
  receiptValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarGroup: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGroupText: {
    fontSize: 11,
    fontWeight: "800",
  },
  recipientLabel: {
    fontSize: 9,
  },
  recipientTitle: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  fieldCharCount: {
    alignSelf: "flex-end",
    fontSize: 9,
    marginTop: 2,
  },
  messagePreview: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginVertical: 10,
  },
  messagePreviewLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  messagePreviewTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  messagePreviewText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  inlineSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginVertical: 40,
  },
  inlineSuccessTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  inlineSuccessDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  requestHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  requestHistoryTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  requestHistorySub: {
    fontSize: 9,
    marginTop: 2,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: {
    fontSize: 15,
    fontWeight: "800",
  },
  identityName: {
    fontSize: 15,
    fontWeight: "700",
  },
  identityDept: {
    fontSize: 11,
    marginTop: 2,
  },
  identityEmail: {
    fontSize: 10,
    marginTop: 1,
  },
  settingsSection: {
    marginTop: 18,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  themeOptionsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  themePreviewBox: {
    width: "100%",
    height: 40,
    borderRadius: 6,
    padding: 6,
    justifyContent: "space-between",
  },
  themePreviewBar: {
    width: "60%",
    height: 4,
    borderRadius: 2,
  },
  themePreviewBlock: {
    width: "85%",
    height: 14,
    borderRadius: 3,
  },
  themeOptionLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  settingsBlock: {
    borderRadius: 11,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  settingsRowTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  settingsRowSub: {
    fontSize: 9,
    marginTop: 2,
  },
  settingsRowValue: {
    fontSize: 10,
    marginRight: 6,
  },
  switchTrack: {
    width: 34,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  switchThumbActive: {
    transform: [{ translateX: 14 }],
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  appVersion: {
    textAlign: "center",
    fontSize: 9,
    marginTop: 16,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    position: "relative",
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
  },
  bottomNavIndicator: {
    position: "absolute",
    top: -8,
    width: 28,
    height: 2,
    borderRadius: 1,
  },
  bottomNavLabel: {
    fontSize: 10,
  },
  loginScreenScroll: {
    flex: 1,
  },
  loginScreenContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 22,
  },
  loginTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  institutionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  institutionTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginTopActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  compactControl: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  compactControlText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loginMainSection: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginVertical: 10,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    width: 230,
    height: 84,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  brandLogo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  institution: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 3,
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 3,
    textAlign: "center",
  },
  roleSwitch: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 20,
  },
  roleSwitchButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  roleSwitchButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  roleSwitchText: {
    fontSize: 13,
  },
  formStack: {
    gap: 15,
  },
  field: {
    gap: 6,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    height: 48,
    borderRadius: 11,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 48,
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
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ghostButton: {
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loginFooter: {
    alignItems: "center",
    paddingTop: 16,
    gap: 6,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureNote: {
    fontSize: 11,
    fontWeight: "500",
  },
  universityAffiliation: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
    maxWidth: 320,
    opacity: 0.75,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

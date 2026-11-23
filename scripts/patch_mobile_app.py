#!/usr/bin/env python3
"""
Patch mobile/App.tsx to fully activate the Scan Certificate feature:
1. Fix AttendanceScreen parameter destructuring (add setSelectedAbsenceRecordId).
2. Add prominent 'Scanner un certificat' button in AttendanceScreen and HomeScreen.
3. Enhance ScannerScreen with 3 distinct, intuitive buttons (Camera, Gallery, PDF) and interactive viewfinder.
4. Ensure base64 fallback reading and robust error handling.
"""
import sys

FILE = r'c:\Users\otays\Desktop\projects\uniapp\mobile\App.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

patches = 0

# 1. Fix AttendanceScreen parameter destructuring
old_att_header = '''function AttendanceScreen({
  role,
  online,
  toggleOnline,
  navigate,
  lang,
  colors,
  isDark,
  activeSession,
  onSubmissionComplete,
}: {'''

new_att_header = '''function AttendanceScreen({
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
}: {'''

if old_att_header in content:
    content = content.replace(old_att_header, new_att_header, 1)
    patches += 1
    print("✓ Patched AttendanceScreen parameter destructuring")
else:
    print("ℹ AttendanceScreen parameter destructuring already patched or not matched")

# 2. Add 'Scanner un certificat' strip in HomeScreen for students
old_teacher_strip = '''        {/* Teacher Administrative Requests Strip */}
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
        )}'''

new_teacher_and_student_strip = '''        {/* Teacher Administrative Requests Strip */}
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
        )}'''

if old_teacher_strip in content:
    content = content.replace(old_teacher_strip, new_teacher_and_student_strip, 1)
    patches += 1
    print("✓ Added Student Quick Scan Certificate Banner in HomeScreen")
else:
    print("ℹ Teacher strip not found or already modified")

# 3. Add prominent top action card in AttendanceScreen
old_attendance_top = '''          <View style={[styles.filterRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>'''
new_attendance_top = '''          {/* Prominent Scan Action Card for Student */}
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
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: 13.5 }]}>
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
                  : "Scan with camera or select a PDF file"}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.accent} />
          </PressableScale>

          <View style={[styles.filterRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>'''

if old_attendance_top in content:
    content = content.replace(old_attendance_top, new_attendance_top, 1)
    patches += 1
    print("✓ Added top Scan Action Card in AttendanceScreen")
else:
    print("ℹ Top filterRow not found or already modified")

# 4. Enhance ScannerScreen with 3 crystal clear buttons and interactive camera frame
old_scanner_func_start = "function ScannerScreen({"
idx_scanner = content.find(old_scanner_func_start)
idx_preview = content.find("function DocumentPreviewScreen(")

if idx_scanner != -1 and idx_preview != -1:
    new_scanner_implementation = '''function ScannerScreen({
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

'''
    content = content[:idx_scanner] + new_scanner_implementation + content[idx_preview:]
    patches += 1
    print("✓ Replaced ScannerScreen with enhanced interactive implementation")
else:
    print("✗ Could not locate ScannerScreen boundaries")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n=== Done: {patches} patches applied to mobile/App.tsx ===")

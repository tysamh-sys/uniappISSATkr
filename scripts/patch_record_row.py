#!/usr/bin/env python3
"""
Patch record row and add top scan banner in AttendanceScreen in mobile/App.tsx
"""
FILE = r'c:\Users\otays\Desktop\projects\uniapp\mobile\App.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add top Scan Action Card in AttendanceScreen right before {/* Filter Chips */}
old_summary_end = '''          </View>

          {/* Filter Chips */}'''

new_summary_end = '''          </View>

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

          {/* Filter Chips */}'''

if old_summary_end in content:
    content = content.replace(old_summary_end, new_summary_end, 1)
    print("✓ Added top Scan Action Card in AttendanceScreen")
else:
    print("ℹ Top summary end not matched")

# 2. Update record row inside AttendanceScreen
old_record_block = '''                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recordSubject, { color: colors.text }]}>
                        {r.subject}
                      </Text>
                      <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                        {r.date} · {r.timeSlot || "08:30–10:00"}
                      </Text>
                    </View>
                    <StatusBadge state={r.tone || "neutral"} label={r.status} colors={colors} />
                    {(r.tone === "danger" || r.tone === "warning") && !r.certificateReference && (
                      <TouchableOpacity
                        style={{
                          marginTop: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: colors.accentSoft,
                          borderRadius: 6,
                          alignSelf: "flex-start",
                        }}
                        onPress={() => {
                          setSelectedAbsenceRecordId(r.id);
                          navigate("scanner");
                        }}
                      >
                        <Text style={{ fontSize: 11, color: colors.accent, fontWeight: "600" }}>
                          Justifier
                        </Text>
                      </TouchableOpacity>
                    )}
                    {r.certificateReference && (
                      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 11, color:
                          r.certificateStatus === "ACCEPTED" ? colors.success :
                          r.certificateStatus === "REJECTED" ? colors.danger :
                          colors.warning,
                          fontWeight: "600"
                        }}>
                          {r.certificateStatus === "ACCEPTED" ? "✅ Valide" :
                           r.certificateStatus === "REJECTED" ? "❌ Refuse" :
                           "🕐 En attente"}
                        </Text>
                      </View>
                    )}'''

new_record_block = '''                    <View style={{ flex: 1 }}>
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
                    <StatusBadge state={r.tone || "neutral"} label={r.status} colors={colors} />'''

if old_record_block in content:
    content = content.replace(old_record_block, new_record_block, 1)
    print("✓ Updated record row layout with aligned Justifier button and status")
else:
    print("ℹ Record block not matched directly, checking normalized whitespace")
    # try replacing line by line
    old_norm = old_record_block.replace('\r\n', '\n')
    content_norm = content.replace('\r\n', '\n')
    if old_norm in content_norm:
        content = content_norm.replace(old_norm, new_record_block.replace('\r\n', '\n'), 1)
        print("✓ Updated record row layout (normalized)")
    else:
        print("✗ Could not match record row block")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")

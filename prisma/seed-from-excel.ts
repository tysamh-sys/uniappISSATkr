/**
 * Direct Excel → PostgreSQL import script for ISSAT Kairouan dataset
 * Usage: npx tsx prisma/seed-from-excel.ts
 *
 * Maps:
 *   Classes       → classes
 *   Students      → users + students
 *   Teachers_Unique → users + teachers
 *   Course_Candidates → subjects
 *   Room_Candidates   → rooms
 *   Timetable_Cells   → timetable_versions + timetable_entries
 */

import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { PrismaClient, DayOfWeek } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// ─── Counters ────────────────────────────────────────────────────────────────
const report = {
  classes:   { inserted: 0, skipped: 0, errors: 0 },
  subjects:  { inserted: 0, skipped: 0, errors: 0 },
  rooms:     { inserted: 0, skipped: 0, errors: 0 },
  teachers:  { inserted: 0, skipped: 0, errors: 0 },
  students:  { inserted: 0, skipped: 0, errors: 0 },
  timetable: { inserted: 0, skipped: 0, errors: 0 },
  warnings:  [] as string[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalise(s: string) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(s: string) {
  return s.trim().replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60);
}

/** Convert "ABDELKHALEK S." → firstName:"S.", lastName:"ABDELKHALEK" */
function parseTCHName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  // Last token is usually initial like "S." or "Mohamed"
  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, parts.length - 1).join(' ');
  return { firstName, lastName };
}

function parseClassInfo(className: string): { niveau: string; filiere: string; groupe: string } {
  const clean = (className || '').trim();
  if (!clean) return { niveau: '', filiere: '', groupe: '' };
  const m1 = clean.match(/^(\d+)([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(\d+)$/);
  if (m1) {
    return { niveau: m1[1], filiere: m1[2], groupe: `G${m1[3]}` };
  }
  const m2 = clean.match(/^([a-zA-Z]+\d+)[.\-_]?([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(?:G|g|gr|GR)?(\d+)$/);
  if (m2) {
    return { niveau: m2[1], filiere: m2[2], groupe: `G${m2[3]}` };
  }
  return { niveau: '1', filiere: clean, groupe: 'G1' };
}

function mapDay(d: string): DayOfWeek | null {
  const map: Record<string, DayOfWeek> = {
    monday: 'MONDAY', lundi: 'MONDAY', lun: 'MONDAY',
    tuesday: 'TUESDAY', mardi: 'TUESDAY', mar: 'TUESDAY',
    wednesday: 'WEDNESDAY', mercredi: 'WEDNESDAY', mer: 'WEDNESDAY',
    thursday: 'THURSDAY', jeudi: 'THURSDAY', jeu: 'THURSDAY',
    friday: 'FRIDAY', vendredi: 'FRIDAY', ven: 'FRIDAY',
    saturday: 'SATURDAY', samedi: 'SATURDAY', sam: 'SATURDAY',
    sunday: 'SUNDAY', dimanche: 'SUNDAY', dim: 'SUNDAY',
  };
  return map[normalise(d).toLowerCase()] ?? null;
}

/** Parse "08:30-10:00" → { startTime, endTime } */
function parseTimeSlot(ts: string): { startTime: string; endTime: string } | null {
  if (!ts) return null;
  const m = String(ts).match(/(\d{1,2})[h:](\d{2})\s*[-–]\s*(\d{1,2})[h:](\d{2})/);
  if (!m) return null;
  return {
    startTime: `${m[1].padStart(2,'0')}:${m[2]}`,
    endTime:   `${m[3].padStart(2,'0')}:${m[4]}`,
  };
}

/** Extract course name and room from cell_text like "TP Fond BD | LAB INF4 | MRABET N." */
function parseCellText(cell: string): { courseName: string | null; roomLabel: string | null; teacherLabel: string | null } {
  if (!cell) return { courseName: null, roomLabel: null, teacherLabel: null };

  // Split on | separator (most common pattern in this dataset)
  const parts = cell.split(/\s*[\|\|]\s*/).map(p => p.trim()).filter(Boolean);

  // If only 1 part, it's just the course
  if (parts.length === 0) return { courseName: null, roomLabel: null, teacherLabel: null };

  // Heuristics:
  // - Teacher: ends with initials like "MRABET N." or "BEN SALEM M." (ALLCAPS + initial)
  // - Room: looks like "LAB INF4", "AMPH Jallel", "Salle 01", "AMPHI"
  // - Course: the rest (usually first part, may start with TP/TD/Cr/CM)

  let courseName: string | null = null;
  let roomLabel: string | null = null;
  let teacherLabel: string | null = null;

  for (const part of parts) {
    // Teacher: ALLCAPS surname + initials pattern
    if (/^[A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+\s+[A-Z]\.$/.test(part) || /^[A-ZÀÂÉÈÊËÎÏÔÙÛÜ]{2,}[\s\-][A-ZÀÂÉÈÊËÎÏÔÙÛÜ]{2,}.*[A-Z]\.$/.test(part)) {
      if (!teacherLabel) teacherLabel = part;
      continue;
    }
    // Room: starts with known room patterns
    if (/^(LAB|AMPH|AMPHI|Salle|SALLE|BLOC|BL|B\d|Lab|Labo|Atelier|labo)/i.test(part)) {
      if (!roomLabel) roomLabel = part;
      continue;
    }
    // Course: typically first part or starts with TP/TD/Cr/CM
    if (!courseName) {
      courseName = part.replace(/^(TP|TD|Cr|CM|cours?|COURS?)\s+/i, '').trim();
      if (!courseName) courseName = part;
    }
  }

  // If nothing matched the teacher pattern, try last segment if it looks like initials
  if (!teacherLabel && parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+\s+[A-Z]\.$/.test(last)) {
      teacherLabel = last;
    }
  }

  // If nothing matched room, try second-to-last if not already the teacher
  if (!roomLabel && parts.length >= 3) {
    const candidate = parts[parts.length - 2];
    if (!teacherLabel || candidate !== teacherLabel) {
      roomLabel = candidate;
    }
  }

  return { courseName, roomLabel, teacherLabel };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const xlsxPath = path.resolve('ISSAT_Kairouan_Test_Dataset.xlsx');
  console.log('📂 Reading Excel file:', xlsxPath);

  const wb = xlsx.readFile(xlsxPath, { cellDates: true });

  const sheet = (name: string) => {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`Sheet "${name}" not found`);
    return xlsx.utils.sheet_to_json<any>(ws);
  };

  const classRows        = sheet('Classes');
  const studentRows      = sheet('Students');
  const teacherRows      = sheet('Teachers_Unique');
  const courseRows       = sheet('Course_Candidates');
  const roomRows         = sheet('Room_Candidates');
  const timetableCells   = sheet('Timetable_Cells');

  const DEFAULT_PASSWORD_HASH = await bcrypt.hash('issatk2026', 10);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CLASSES
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 Inserting classes...');
  const classIdMap = new Map<string, string>(); // excel class_id → db id
  const classNameMap = new Map<string, string>(); // class_name lower → db id
  const classInfoMap = new Map<string, { filiere: string; niveau: string; groupe: string }>();

  for (const row of classRows) {
    const name: string = (row.class_name ?? '').trim();
    if (!name) continue;
    const code = slugify(name).toUpperCase();
    const parsed = parseClassInfo(name);
    const filiere = (row.program_code ?? parsed.filiere).trim();
    const niveau = String(row.level ?? parsed.niveau);
    const groupe = parsed.groupe || 'G1';

    try {
      const existing = await prisma.class.findFirst({ where: { name } });
      if (existing) {
        classIdMap.set(row.class_id, existing.id);
        classNameMap.set(normalise(name), existing.id);
        classInfoMap.set(existing.id, { filiere, niveau, groupe });
        await prisma.class.update({
          where: { id: existing.id },
          data: { filiere, niveau, groupe },
        });
        report.classes.skipped++;
      } else {
        const c = await prisma.class.create({
          data: { name, code, filiere, niveau, groupe },
        });
        classIdMap.set(row.class_id, c.id);
        classNameMap.set(normalise(name), c.id);
        classInfoMap.set(c.id, { filiere, niveau, groupe });
        report.classes.inserted++;
      }
    } catch (e: any) {
      report.classes.errors++;
      report.warnings.push(`Class "${name}": ${e.message}`);
    }
  }
  console.log(`  ✅ ${report.classes.inserted} inserted, ${report.classes.skipped} skipped, ${report.classes.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SUBJECTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📚 Inserting subjects...');
  const subjectMap = new Map<string, string>(); // name lower → db id

  // Collect unique course names (some are duplicates/noise, we normalise)
  const seenSubjects = new Set<string>();
  for (const row of courseRows) {
    const name: string = (row.course_name ?? '').trim();
    if (!name || name.length < 2) continue;
    const key = normalise(name);
    if (seenSubjects.has(key)) continue;
    seenSubjects.add(key);

    const code = `CRS-${Buffer.from(key).toString('base64').replace(/[^A-Z0-9]/gi,'').slice(0,8).toUpperCase()}`;

    try {
      const existing = await prisma.subject.findFirst({ where: { name } });
      if (existing) {
        subjectMap.set(key, existing.id);
        report.subjects.skipped++;
      } else {
        // Try inserting, code must be unique
        let finalCode = code;
        let attempt = 0;
        while (true) {
          try {
            const s = await prisma.subject.create({ data: { name, code: finalCode } });
            subjectMap.set(key, s.id);
            report.subjects.inserted++;
            break;
          } catch (e2: any) {
            if (e2.code === 'P2002' && attempt < 5) {
              attempt++;
              finalCode = code + attempt;
            } else throw e2;
          }
        }
      }
    } catch (e: any) {
      report.subjects.errors++;
      report.warnings.push(`Subject "${name}": ${e.message}`);
    }
  }
  console.log(`  ✅ ${report.subjects.inserted} inserted, ${report.subjects.skipped} skipped, ${report.subjects.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ROOMS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🏫 Inserting rooms...');
  const roomMap = new Map<string, string>(); // label lower → db id

  for (const row of roomRows) {
    const name: string = (row.room_label ?? '').trim();
    if (!name) continue;
    const key = normalise(name);

    // Determine building from name
    let building: string | null = null;
    if (/amph/i.test(name)) building = 'Amphithéâtre';
    else if (/lab/i.test(name)) building = 'Laboratoire';
    else if (/salle/i.test(name)) building = 'Salles de cours';

    try {
      const existing = await prisma.room.findFirst({ where: { name } });
      if (existing) {
        roomMap.set(key, existing.id);
        report.rooms.skipped++;
      } else {
        const r = await prisma.room.create({ data: { name, building } });
        roomMap.set(key, r.id);
        report.rooms.inserted++;
      }
    } catch (e: any) {
      report.rooms.errors++;
      report.warnings.push(`Room "${name}": ${e.message}`);
    }
  }
  console.log(`  ✅ ${report.rooms.inserted} inserted, ${report.rooms.skipped} skipped, ${report.rooms.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TEACHERS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n👨‍🏫 Inserting teachers...');
  const teacherMap = new Map<string, string>(); // raw name lower → teacher db id

  for (let i = 0; i < teacherRows.length; i++) {
    const row = teacherRows[i];
    const rawName: string = (row.teacher_name_as_written ?? '').trim();
    if (!rawName) continue;

    const { firstName, lastName } = parseTCHName(rawName);
    const teacherNumber = `TCH${String(i + 1).padStart(4, '0')}`;
    const emailLocal = normalise(rawName).replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    const email = `${emailLocal}@issatk.rnu.tn`;

    try {
      // Check by teacherNumber uniqueness
      const existing = await prisma.teacher.findFirst({
        where: { OR: [{ email }, { teacherNumber }] },
      });
      if (existing) {
        teacherMap.set(normalise(rawName), existing.id);
        report.teachers.skipped++;
        continue;
      }

      // Create user then teacher
      let userEmail = email;
      let emailAttempt = 0;
      let user: any = null;
      while (!user) {
        try {
          user = await prisma.user.create({
            data: {
              email: userEmail,
              passwordHash: DEFAULT_PASSWORD_HASH,
              role: 'TEACHER',
            },
          });
        } catch (e2: any) {
          if (e2.code === 'P2002' && emailAttempt < 5) {
            emailAttempt++;
            userEmail = `${emailLocal}.${emailAttempt}@issatk.rnu.tn`;
          } else throw e2;
        }
      }

      let tn = teacherNumber;
      let tnAttempt = 0;
      while (true) {
        try {
          const t = await prisma.teacher.create({
            data: {
              userId: user.id,
              teacherNumber: tn,
              firstName: firstName || 'N.',
              lastName: lastName || rawName,
              email: user.email,
              department: 'Informatique',
            },
          });
          teacherMap.set(normalise(rawName), t.id);
          report.teachers.inserted++;
          break;
        } catch (e2: any) {
          if (e2.code === 'P2002' && tnAttempt < 5) {
            tnAttempt++;
            tn = `${teacherNumber}-${tnAttempt}`;
          } else throw e2;
        }
      }
    } catch (e: any) {
      report.teachers.errors++;
      report.warnings.push(`Teacher "${rawName}": ${e.message}`);
    }
  }
  console.log(`  ✅ ${report.teachers.inserted} inserted, ${report.teachers.skipped} skipped, ${report.teachers.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. STUDENTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🎓 Inserting students...');

  for (const row of studentRows) {
    const studentNumber: string = String(row.student_number ?? '').trim();
    const firstName: string = (row.first_name ?? '').trim();
    const lastName: string = (row.last_name ?? '').trim();
    const email: string = (row.email ?? '').trim() || null!;
    const className: string = (row.class_name ?? '').trim();

    if (!studentNumber || !firstName || !lastName) continue;

    const classId = classNameMap.get(normalise(className));
    if (!classId) {
      report.students.errors++;
      report.warnings.push(`Student ${studentNumber}: class "${className}" not found in DB`);
      continue;
    }

    try {
      const existing = await prisma.student.findUnique({ where: { studentNumber } });
      const classInfo = classInfoMap.get(classId) || parseClassInfo(className);

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            filiere: classInfo.filiere,
            niveau: classInfo.niveau,
            groupe: classInfo.groupe,
            classId,
          },
        });
        report.students.skipped++;
        continue;
      }

      let userRecord: any = null;
      if (email) {
        try {
          userRecord = await prisma.user.create({
            data: { email, passwordHash: DEFAULT_PASSWORD_HASH, role: 'STUDENT' },
          });
        } catch {
          // Email conflict — create without user account
        }
      }

      await prisma.student.create({
        data: {
          studentNumber,
          firstName,
          lastName,
          email: email || null,
          classId,
          userId: userRecord?.id ?? null,
          filiere: classInfo.filiere,
          niveau: classInfo.niveau,
          groupe: classInfo.groupe,
        },
      });
      report.students.inserted++;
    } catch (e: any) {
      report.students.errors++;
      report.warnings.push(`Student ${studentNumber}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${report.students.inserted} inserted, ${report.students.skipped} skipped, ${report.students.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TIMETABLE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📅 Inserting timetable entries...');

  // Create or fetch timetable version
  let tvId: string;
  const existingTV = await prisma.timetableVersion.findFirst({
    where: { name: 'Semestre 1 — 2026/2027' },
  });
  if (existingTV) {
    tvId = existingTV.id;
    console.log('  ℹ️  Timetable version already exists, reusing.');
  } else {
    const tv = await prisma.timetableVersion.create({
      data: {
        name: 'Semestre 1 — 2026/2027',
        validFrom: new Date('2026-09-15'),
        validUntil: new Date('2027-01-31'),
        status: 'ACTIVE',
      },
    });
    tvId = tv.id;
    console.log('  ✅ Timetable version created:', tvId);
  }

  // Build a fuzzy lookup for subjects from cell text
  const subjectKeys = Array.from(subjectMap.keys());

  function findSubjectId(courseName: string | null): string | null {
    if (!courseName) return null;
    const q = normalise(courseName);
    // Exact
    if (subjectMap.has(q)) return subjectMap.get(q)!;
    // Partial match
    for (const k of subjectKeys) {
      if (k.includes(q) || q.includes(k.slice(0, 6))) return subjectMap.get(k)!;
    }
    return null;
  }

  function findRoomId(label: string | null): string | null {
    if (!label) return null;
    const q = normalise(label);
    if (roomMap.has(q)) return roomMap.get(q)!;
    for (const [k, v] of roomMap.entries()) {
      if (k.includes(q.slice(0, 6)) || q.includes(k.slice(0, 6))) return v;
    }
    return null;
  }

  function findTeacherId(label: string | null): string | null {
    if (!label) return null;
    const q = normalise(label);
    if (teacherMap.has(q)) return teacherMap.get(q)!;
    for (const [k, v] of teacherMap.entries()) {
      if (k.includes(q.slice(0, 6)) || q.startsWith(k.slice(0, 6))) return v;
    }
    return null;
  }

  // Pick a default teacher and room to use as fallback (required FK)
  const anyTeacher = await prisma.teacher.findFirst();
  const anyRoom = await prisma.room.findFirst();
  const anySubject = await prisma.subject.findFirst();

  if (!anyTeacher || !anyRoom || !anySubject) {
    console.error('  ❌ Cannot insert timetable: no teacher/room/subject in DB');
  } else {
    for (const row of timetableCells) {
      const className: string = (row.class_name ?? '').trim();
      const dayRaw: string = (row.day ?? '').trim();
      const timeSlotRaw: string = (row.time_slot ?? '').trim();
      const cellText: string = (row.cell_text ?? '').trim();

      if (!className || !dayRaw || !timeSlotRaw) continue;

      // Handle merged cells: split on " || " (double pipe = multiple sessions)
      const sessions = cellText.split(/\s*\|\|\s*/);

      for (const sess of sessions) {
        const { courseName, roomLabel, teacherLabel } = parseCellText(sess);

        const day = mapDay(dayRaw);
        if (!day) {
          report.timetable.errors++;
          continue;
        }

        const times = parseTimeSlot(timeSlotRaw);
        if (!times) {
          report.timetable.errors++;
          continue;
        }

        const classId = classNameMap.get(normalise(className));
        if (!classId) {
          report.timetable.errors++;
          continue;
        }

        const subjectId = findSubjectId(courseName) ?? anySubject.id;
        const roomId = findRoomId(roomLabel) ?? anyRoom.id;
        const teacherId = findTeacherId(teacherLabel) ?? anyTeacher.id;

        try {
          // Check for exact duplicate
          const dup = await prisma.timetableEntry.findFirst({
            where: { timetableVersionId: tvId, dayOfWeek: day, startTime: times.startTime, classId, subjectId, teacherId },
          });
          if (dup) {
            report.timetable.skipped++;
            continue;
          }

          await prisma.timetableEntry.create({
            data: {
              timetableVersionId: tvId,
              dayOfWeek: day,
              startTime: times.startTime,
              endTime: times.endTime,
              classId,
              subjectId,
              teacherId,
              roomId,
            },
          });
          report.timetable.inserted++;
        } catch (e: any) {
          report.timetable.errors++;
          report.warnings.push(`Timetable ${className} ${day} ${times.startTime}: ${e.message}`);
        }
      }
    }
  }
  console.log(`  ✅ ${report.timetable.inserted} inserted, ${report.timetable.skipped} skipped, ${report.timetable.errors} errors`);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. VERIFICATION COUNTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 Verification — DB counts after import:');
  const [nc, ns, nt, nsu, nr, ntv, nte, nu] = await Promise.all([
    prisma.class.count(),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.subject.count(),
    prisma.room.count(),
    prisma.timetableVersion.count(),
    prisma.timetableEntry.count(),
    prisma.user.count(),
  ]);
  console.log(`  classes: ${nc} | students: ${ns} | teachers: ${nt} | subjects: ${nsu} | rooms: ${nr}`);
  console.log(`  timetable_versions: ${ntv} | timetable_entries: ${nte} | users: ${nu}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Final report
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log('  IMPORT REPORT');
  console.log('════════════════════════════════════════════════');
  for (const [entity, stats] of Object.entries(report)) {
    if (entity === 'warnings') continue;
    const s = stats as any;
    console.log(`  ${entity.padEnd(10)} : +${s.inserted} inserted | ${s.skipped} skipped | ${s.errors} errors`);
  }
  if (report.warnings.length > 0) {
    console.log(`\n  ⚠️  ${report.warnings.length} warning(s) (first 20):`);
    report.warnings.slice(0, 20).forEach(w => console.log('   -', w));
  }
  console.log('════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

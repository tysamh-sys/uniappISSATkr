const { PrismaClient, AttendanceStatus, AttendanceSessionStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Generating Realistic Attendance Sessions and Absences ---');

  // Check if timetable entries exist
  const entries = await prisma.timetableEntry.findMany({
    include: {
      class: true,
      subject: true,
      teacher: true,
      room: true,
    },
    take: 30, // 30 sessions across different classes
  });

  if (entries.length === 0) {
    console.log('No timetable entries found.');
    return;
  }

  console.log(`Found ${entries.length} sample timetable entries to instantiate as sessions.`);

  let createdSessions = 0;
  let createdRecords = 0;
  let createdAbsences = 0;

  const today = new Date();
  // Generate dates for the past 3 days and today
  const targetDates = [
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
  ];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const sessionDate = targetDates[i % targetDates.length];

    // Find students in this class
    const classStudents = await prisma.student.findMany({
      where: { classId: entry.classId },
      include: { user: true },
    });

    if (classStudents.length === 0) continue;

    // Check if session already exists
    const existing = await prisma.attendanceSession.findFirst({
      where: {
        timetableEntryId: entry.id,
        date: sessionDate,
      },
    });

    let session = existing;
    if (!session) {
      const ref = `ATT-${String(sessionDate.getFullYear()).slice(-2)}${String(sessionDate.getMonth() + 1).padStart(2, '0')}${String(sessionDate.getDate()).padStart(2, '0')}-${String(100 + i)}`;
      session = await prisma.attendanceSession.create({
        data: {
          reference: ref,
          timetableEntryId: entry.id,
          date: sessionDate,
          teacherId: entry.teacherId,
          classId: entry.classId,
          subjectId: entry.subjectId,
          roomId: entry.roomId,
          startTime: entry.startTime,
          endTime: entry.endTime,
          status: AttendanceSessionStatus.SUBMITTED,
          submittedAt: new Date(sessionDate.getTime() + 90 * 60 * 1000),
        },
      });
      createdSessions++;
    }

    // Create attendance records for each student in the class
    for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
      const student = classStudents[sIdx];

      // Check if record already exists
      const recExists = await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: student.id,
          },
        },
      });

      if (!recExists) {
        // Mark 20% as absent (e.g., student index % 4 === 0)
        const isAbsent = sIdx % 4 === 0;
        await prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: isAbsent ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
            remarks: isAbsent ? 'Absent non justifié (appel séance)' : null,
          },
        });
        createdRecords++;
        if (isAbsent) createdAbsences++;
      }
    }
  }

  console.log(`✓ Created ${createdSessions} attendance sessions`);
  console.log(`✓ Created ${createdRecords} attendance records (${createdAbsences} absences)`);

  // Find 3 students who now have absences so the user knows who to log in with
  const absentStudents = await prisma.student.findMany({
    where: {
      attendanceRecords: {
        some: {
          status: AttendanceStatus.ABSENT,
        },
      },
    },
    take: 3,
    include: {
      user: true,
      class: true,
      attendanceRecords: {
        where: { status: AttendanceStatus.ABSENT },
        include: { session: { include: { subject: true } } },
      },
    },
  });

  console.log('\n--- Sample Students with Real Absences Ready to Justify ---');
  absentStudents.forEach((st) => {
    console.log(`Student: ${st.firstName} ${st.lastName} (${st.class.name})`);
    console.log(`  Email: ${st.user?.email || st.email}`);
    console.log(`  Absences: ${st.attendanceRecords.length}`);
    st.attendanceRecords.forEach((ar) => {
      console.log(`    - [ID: ${ar.id}] ${ar.session.subject.name} le ${ar.session.date.toISOString().slice(0, 10)} (${ar.session.startTime}-${ar.session.endTime})`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

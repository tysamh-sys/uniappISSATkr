import xlsx from 'xlsx';

/**
 * Creates the sample university test workbook with all 7 sheets matching the dataset in the prompt:
 * 1. Summary
 * 2. Programmes
 * 3. Classes
 * 4. Students
 * 5. Teachers
 * 6. Courses (Subjects)
 * 7. Rooms
 * 8. Timetables
 */
export function generateTestUniversityWorkbook(): Buffer {
  const wb = xlsx.utils.book_new();

  // 1. Summary
  const summaryData = [
    { item: 'Source PDF', value: 'EDT-groupes-27-09-2026.pdf' },
    { item: 'Classes / sections', value: '62' },
    { item: 'Programmes / Filières', value: '12' },
    { item: 'Synthetic students', value: '1528' },
    { item: 'Distinct teachers extracted', value: '120' },
    { item: 'Timetable blocks', value: '2107' },
    { item: 'Important', value: 'Dataset de test généré à partir des documents d\'emploi du temps. Fictif pour les étudiants.' },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(summaryData), 'Summary');

  // 2. Programmes
  const programmesData = [
    { program_id: 'FIL01', program_code: 'BigData', program_name: 'BigData', classes_count: 5 },
    { program_id: 'FIL02', program_code: 'EEA', program_name: 'EEA', classes_count: 9 },
    { program_id: 'FIL03', program_code: 'EEA-AII', program_name: 'EEA-AII', classes_count: 1 },
    { program_id: 'FIL04', program_code: 'EEA-SE', program_name: 'EEA-SE', classes_count: 1 },
    { program_id: 'FIL05', program_code: 'ENR', program_name: 'ENR', classes_count: 6 },
    { program_id: 'FIL06', program_code: 'GM', program_name: 'GM', classes_count: 17 },
    { program_id: 'FIL07', program_code: 'ISI', program_name: 'ISI', classes_count: 12 },
    { program_id: 'FIL08', program_code: 'MasMMSI', program_name: 'MasMMSI', classes_count: 3 },
    { program_id: 'FIL09', program_code: 'MastCSI', program_name: 'MastCSI', classes_count: 2 },
    { program_id: 'FIL10', program_code: 'MastGM', program_name: 'MastGM', classes_count: 2 },
    { program_id: 'FIL11', program_code: 'MRAII', program_name: 'MRAII', classes_count: 2 },
    { program_id: 'FIL12', program_code: 'MRDS', program_name: 'MRDS', classes_count: 2 },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(programmesData), 'Programmes');

  // 3. Classes
  const classesData = [
    { class_id: 'GRP001', class_name: '1BigData1', program_code: 'BigData', level: '1', academic_year: '2026/2027', students_count: 27 },
    { class_id: 'GRP002', class_name: '1BigData2', program_code: 'BigData', level: '1', academic_year: '2026/2027', students_count: 21 },
    { class_id: 'GRP003', class_name: '1BigData3', program_code: 'BigData', level: '1', academic_year: '2026/2027', students_count: 27 },
    { class_id: 'GRP004', class_name: '1BigData4', program_code: 'BigData', level: '1', academic_year: '2026/2027', students_count: 29 },
    { class_id: 'GRP005', class_name: '1BigData5', program_code: 'BigData', level: '1', academic_year: '2026/2027', students_count: 21 },
    { class_id: 'GRP006', class_name: '1EEA1', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 29 },
    { class_id: 'GRP007', class_name: '1EEA2', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 20 },
    { class_id: 'GRP008', class_name: '1EEA3', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 27 },
    { class_id: 'GRP009', class_name: '1EEA4', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 23 },
    { class_id: 'GRP010', class_name: '1EEA5', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 27 },
    { class_id: 'GRP011', class_name: '1EEA6', program_code: 'EEA', level: '1', academic_year: '2026/2027', students_count: 26 },
    { class_id: 'GRP012', class_name: '1ENR1', program_code: 'ENR', level: '1', academic_year: '2026/2027', students_count: 25 },
    { class_id: 'GRP013', class_name: '1ENR2', program_code: 'ENR', level: '1', academic_year: '2026/2027', students_count: 22 },
    { class_id: 'GRP014', class_name: '1GM1', program_code: 'GM', level: '1', academic_year: '2026/2027', students_count: 29 },
    { class_id: 'GRP024', class_name: '1ISI1', program_code: 'ISI', level: '1', academic_year: '2026/2027', students_count: 25 },
    { class_id: 'GRP025', class_name: '1ISI2', program_code: 'ISI', level: '1', academic_year: '2026/2027', students_count: 26 },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(classesData), 'Classes');

  // 4. Students
  const studentsData = [
    { student_id: 'STU00001', student_number: '202600001', first_name: 'Hiba', last_name: 'Bouzid', email: 'stu00001@students.example.test', class_name: '1BigData1' },
    { student_id: 'STU00002', student_number: '202600002', first_name: 'Hiba', last_name: 'Sassi', email: 'stu00002@students.example.test', class_name: '1BigData1' },
    { student_id: 'STU00003', student_number: '202600003', first_name: 'Seif', last_name: 'Khemiri', email: 'stu00003@students.example.test', class_name: '1BigData1' },
    { student_id: 'STU00004', student_number: '202600004', first_name: 'Nourhene', last_name: 'Ben Ali', email: 'stu00004@students.example.test', class_name: '1BigData1' },
    { student_id: 'STU00005', student_number: '202600005', first_name: 'Hamza', last_name: 'Mami', email: 'stu00005@students.example.test', class_name: '1BigData1' },
    { student_id: 'STU00028', student_number: '202600028', first_name: 'Rania', last_name: 'Abid', email: 'stu00028@students.example.test', class_name: '1BigData2' },
    { student_id: 'STU00029', student_number: '202600029', first_name: 'Alaa', last_name: 'Dridi', email: 'stu00029@students.example.test', class_name: '1BigData2' },
    { student_id: 'STU00126', student_number: '202600126', first_name: 'Maha', last_name: 'Karray', email: 'stu00126@students.example.test', class_name: '1EEA1' },
    { student_id: 'STU00127', student_number: '202600127', first_name: 'Mohamed', last_name: 'Hajji', email: 'stu00127@students.example.test', class_name: '1EEA1' },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(studentsData), 'Students');

  // 5. Teachers
  const teachersData = [
    { teacher_id: 'TCH001', teacher_name_as_written: 'ABDELKHALEK S.', occurrences_in_pdf: 14, department: 'Génie Électrique' },
    { teacher_id: 'TCH006', teacher_name_as_written: 'AJIMI R.', occurrences_in_pdf: 11, department: 'Informatique' },
    { teacher_id: 'TCH016', teacher_name_as_written: 'BEN ABDALLAH H.', occurrences_in_pdf: 8, department: 'Informatique' },
    { teacher_id: 'TCH026', teacher_name_as_written: 'BEN JABRA S.', occurrences_in_pdf: 9, department: 'Informatique' },
    { teacher_id: 'TCH028', teacher_name_as_written: 'BEN SALEM M.', occurrences_in_pdf: 11, department: 'Informatique' },
    { teacher_id: 'TCH044', teacher_name_as_written: 'FARHAT M.', occurrences_in_pdf: 32, department: 'Informatique' },
    { teacher_id: 'TCH059', teacher_name_as_written: 'JABNOUNI H.', occurrences_in_pdf: 15, department: 'Informatique' },
    { teacher_id: 'TCH099', teacher_name_as_written: 'RABBOUCH B.', occurrences_in_pdf: 14, department: 'Informatique' },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(teachersData), 'Teachers');

  // 6. Courses (Subjects)
  const coursesData = [
    { course_id: 'CRS0008', course_name: 'Algébre 1' },
    { course_id: 'CRS0009', course_name: 'Analyse 1' },
    { course_id: 'CRS0020', course_name: 'Arch ord & sys. log' },
    { course_id: 'CRS0062', course_name: 'Atelier prog 1' },
    { course_id: 'CRS0106', course_name: 'Fond BD' },
    { course_id: 'CRS0108', course_name: 'Fond DS & Python' },
    { course_id: 'CRS0109', course_name: 'Français Pro1' },
    { course_id: 'CRS0195', course_name: 'Sys. d\'expl 1' },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(coursesData), 'Courses');

  // 7. Rooms
  const roomsData = [
    { room_id: 'ROM0001', room_label: 'AMPH Chiheb Lbib', building: 'Amphithéâtres', capacity: 150 },
    { room_id: 'ROM0002', room_label: 'AMPH Jallel Ghabi', building: 'Amphithéâtres', capacity: 150 },
    { room_id: 'ROM0053', room_label: 'LAB INF1', building: 'Laboratoires Informatique', capacity: 30 },
    { room_id: 'ROM0071', room_label: 'LAB INF4', building: 'Laboratoires Informatique', capacity: 30 },
    { room_id: 'ROM0129', room_label: 'Salle 01', building: 'Bloc Principal', capacity: 40 },
    { room_id: 'ROM0132', room_label: 'Salle 04', building: 'Bloc Principal', capacity: 40 },
    { room_id: 'ROM0138', room_label: 'Salle 10', building: 'Bloc Principal', capacity: 40 },
    { room_id: 'ROM0143', room_label: 'Salle 15', building: 'Bloc Principal', capacity: 40 },
    { room_id: 'ROM0146', room_label: 'Salle 18', building: 'Bloc Principal', capacity: 40 },
    { room_id: 'ROM0148', room_label: 'Salle 20', building: 'Bloc Principal', capacity: 40 },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(roomsData), 'Rooms');

  // 8. Timetables
  const timetablesData = [
    { class_name: '1BigData1', day: 'Monday', time_slot: '10:05-11:35', teacher_name: 'BEN SALEM M.', subject_name: 'Fond BD', room_name: 'AMPH Chiheb Lbib' },
    { class_name: '1BigData1', day: 'Monday', time_slot: '14:00-15:30', teacher_name: 'HENI R.', subject_name: 'Algébre 1', room_name: 'Salle 18' },
    { class_name: '1BigData1', day: 'Tuesday', time_slot: '08:30-10:00', teacher_name: 'AJIMI R.', subject_name: 'Arch ord & sys. log', room_name: 'Salle 01' },
    { class_name: '1BigData1', day: 'Tuesday', time_slot: '14:00-15:30', teacher_name: 'ZIDANI N.', subject_name: 'Analyse 1', room_name: 'Salle 15' },
    { class_name: '1BigData1', day: 'Wednesday', time_slot: '10:05-11:35', teacher_name: 'BEN ABDALLAH H.', subject_name: 'Sys. d\'expl 1', room_name: 'AMPH Chiheb Lbib' },
    { class_name: '1BigData1', day: 'Friday', time_slot: '11:40-13:10', teacher_name: 'RABBOUCH B.', subject_name: 'Fond DS & Python', room_name: 'AMPH Jallel Ghabi' },
    { class_name: '1BigData1', day: 'Friday', time_slot: '15:35-17:05', teacher_name: 'CHATTY L.', subject_name: 'Français Pro1', room_name: 'Salle 04' },
  ];
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(timetablesData), 'Timetables');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

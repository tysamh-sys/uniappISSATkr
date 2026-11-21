import { generateTestUniversityWorkbook } from '../src/services/dataImport/sampleDatasetService.js';
import { analyzeUploadBuffer, normalizeToken } from '../src/services/dataImport/fileAnalyzer.js';
import { splitFullName, parseTimeSlot } from '../src/services/dataImport/dataValidator.js';

describe('Flexible University Data Import System', () => {
  describe('Helper Functions', () => {
    it('normalizes tokens correctly for multi-lingual fuzzy matching', () => {
      expect(normalizeToken('Prénom de l\'étudiant')).toBe('prenomdeletudiant');
      expect(normalizeToken('Matricule_N°')).toBe('matriculen');
      expect(normalizeToken('Course / Module Name')).toBe('coursemodulename');
    });

    it('splits full names into first and last name correctly', () => {
      expect(splitFullName('BEN SALEM Mohamed')).toEqual({
        firstName: 'Mohamed',
        lastName: 'BEN SALEM',
      });
      expect(splitFullName('Hiba Bouzid')).toEqual({
        firstName: 'Hiba',
        lastName: 'Bouzid',
      });
      expect(splitFullName('Dr. Ahmed Trabelsi')).toEqual({
        firstName: 'Dr.',
        lastName: 'Ahmed Trabelsi',
      });
      expect(splitFullName('TCH001')).toEqual({
        firstName: 'TCH001',
        lastName: 'TCH001',
      });
    });

    it('parses composite time slot ranges correctly', () => {
      expect(parseTimeSlot('08:30-10:00')).toEqual({ startTime: '08:30', endTime: '10:00' });
      expect(parseTimeSlot('10:05 - 11:35')).toEqual({ startTime: '10:05', endTime: '11:35' });
      expect(parseTimeSlot('14h00 – 15h30')).toEqual({ startTime: '14:00', endTime: '15:30' });
      expect(parseTimeSlot('invalid')).toBeNull();
    });
  });

  describe('Excel File Analyzer', () => {
    it('detects all worksheets and suggests entities accurately on university test dataset', () => {
      const buffer = generateTestUniversityWorkbook();
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const analysis = analyzeUploadBuffer(buffer, 'test-workbook.xlsx');
      expect(analysis.fileName).toBe('test-workbook.xlsx');
      expect(analysis.totalSheets).toBe(8); // Summary, Programmes, Classes, Students, Teachers, Courses, Rooms, Timetables

      const sheetMap = new Map(analysis.sheets.map((s) => [s.sheetName, s]));

      // Verify Classes sheet detection
      const classesSheet = sheetMap.get('Classes');
      expect(classesSheet).toBeDefined();
      expect(classesSheet?.suggestedEntity).toBe('CLASS');
      expect(classesSheet?.suggestedMappings.name).toBe('class_name');

      // Verify Students sheet detection
      const studentsSheet = sheetMap.get('Students');
      expect(studentsSheet).toBeDefined();
      expect(studentsSheet?.suggestedEntity).toBe('STUDENT');
      expect(studentsSheet?.suggestedMappings.studentNumber).toBe('student_number');
      expect(studentsSheet?.suggestedMappings.firstName).toBe('first_name');
      expect(studentsSheet?.suggestedMappings.lastName).toBe('last_name');
      expect(studentsSheet?.suggestedMappings.className).toBe('class_name');

      // Verify Teachers sheet detection
      const teachersSheet = sheetMap.get('Teachers');
      expect(teachersSheet).toBeDefined();
      expect(teachersSheet?.suggestedEntity).toBe('TEACHER');
      expect(teachersSheet?.suggestedMappings.fullName).toBe('teacher_name_as_written');

      // Verify Courses/Subjects sheet detection
      const coursesSheet = sheetMap.get('Courses');
      expect(coursesSheet).toBeDefined();
      expect(coursesSheet?.suggestedEntity).toBe('SUBJECT');
      expect(coursesSheet?.suggestedMappings.name).toBe('course_name');

      // Verify Rooms sheet detection
      const roomsSheet = sheetMap.get('Rooms');
      expect(roomsSheet).toBeDefined();
      expect(roomsSheet?.suggestedEntity).toBe('ROOM');
      expect(roomsSheet?.suggestedMappings.name).toBe('room_label');

      // Verify Timetables sheet detection
      const timetablesSheet = sheetMap.get('Timetables');
      expect(timetablesSheet).toBeDefined();
      expect(timetablesSheet?.suggestedEntity).toBe('TIMETABLE');
      expect(timetablesSheet?.suggestedMappings.dayOfWeek).toBe('day');
      expect(timetablesSheet?.suggestedMappings.timeSlot).toBe('time_slot');
      expect(timetablesSheet?.suggestedMappings.className).toBe('class_name');
      expect(timetablesSheet?.suggestedMappings.teacherName).toBe('teacher_name');
      expect(timetablesSheet?.suggestedMappings.subjectName).toBe('subject_name');
      expect(timetablesSheet?.suggestedMappings.roomName).toBe('room_name');
    });

    it('gracefully handles arbitrary/unknown column names without crashing', () => {
      // Create a small custom workbook with unconventional headers
      const xlsx = require('xlsx');
      const customWb = xlsx.utils.book_new();
      const customData = [
        { ID_ALPHA: 'XYZ-1', INVENTED_COL: 'Foo', RANDOM_NOTE: 'Bar' },
        { ID_ALPHA: 'XYZ-2', INVENTED_COL: 'Baz', RANDOM_NOTE: 'Qux' },
      ];
      xlsx.utils.book_append_sheet(customWb, xlsx.utils.json_to_sheet(customData), 'FeuilleInconnue');
      const customBuffer = xlsx.write(customWb, { type: 'buffer', bookType: 'xlsx' });

      const analysis = analyzeUploadBuffer(customBuffer, 'custom.xlsx');
      expect(analysis.sheets.length).toBe(1);
      expect(analysis.sheets[0].headers).toEqual(['ID_ALPHA', 'INVENTED_COL', 'RANDOM_NOTE']);
      // Should not falsely claim high confidence
      expect(analysis.sheets[0].confidence).toBeLessThan(0.4);
    });
  });
});

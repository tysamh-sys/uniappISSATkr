import { EntityFieldDefinition, ImportEntityType } from './types.js';

export const ENTITY_DEFINITIONS: Record<ImportEntityType, {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  fields: EntityFieldDefinition[];
}> = {
  CLASS: {
    nameFr: 'Classes / Groupes',
    nameEn: 'Classes / Groups',
    descriptionFr: 'Filières, niveaux et groupes de classes académiques.',
    descriptionEn: 'Academic departments, levels, and student class groups.',
    fields: [
      {
        key: 'name',
        labelFr: 'Nom de la classe',
        labelEn: 'Class Name',
        required: true,
        type: 'string',
        description: 'Ex: "1BigData1", "2CS", "ING2-B"',
        aliases: ['classe', 'class', 'nom', 'nom_classe', 'class_name', 'classname', 'groupe', 'group', 'section', 'libelle'],
      },
      {
        key: 'code',
        labelFr: 'Code de la classe',
        labelEn: 'Class Code',
        required: false,
        type: 'string',
        description: 'Identifiant unique (déduit du nom si omis). Ex: "GRP001", "1BD1"',
        aliases: ['code', 'code_classe', 'class_code', 'class_id', 'classid', 'id', 'id_classe', 'reference'],
      },
      {
        key: 'filiere',
        labelFr: 'Filière / Programme',
        labelEn: 'Programme / Department',
        required: false,
        type: 'string',
        description: 'Ex: "BigData", "Informatique", "EEA", "GM"',
        aliases: ['filiere', 'programme', 'program', 'program_code', 'program_name', 'specialite', 'departement', 'department', 'branch', 'track'],
      },
      {
        key: 'niveau',
        labelFr: 'Niveau d\'études',
        labelEn: 'Study Level',
        required: false,
        type: 'string',
        description: 'Ex: "1", "2", "3", "L1", "L3", "M1"',
        aliases: ['niveau', 'level', 'annee', 'grade', 'year', 'cycle', 'semestre', 'level_code'],
      },
      {
        key: 'groupe',
        labelFr: 'Sous-groupe / Section',
        labelEn: 'Group / Sub-group',
        required: false,
        type: 'string',
        description: 'Ex: "G1", "1", "TD1", "TP2"',
        aliases: ['groupe', 'group', 'subgroup', 'td', 'tp', 'section', 'num_groupe'],
      },
    ],
  },

  STUDENT: {
    nameFr: 'Étudiants',
    nameEn: 'Students',
    descriptionFr: 'Inscriptions des étudiants avec numéro d\'étudiant et classe.',
    descriptionEn: 'Student registrations with student ID and class assignment.',
    fields: [
      {
        key: 'studentNumber',
        labelFr: 'Numéro d\'étudiant / Matricule',
        labelEn: 'Student Registration Number',
        required: true,
        type: 'string',
        description: 'Matricule universitaire ou numéro de carte. Ex: "202600001", "STU001"',
        aliases: ['matricule', 'num_etudiant', 'numero_etudiant', 'no_etudiant', 'netudiant', 'ndetudiant', 'matricule_etudiant', 'student_number', 'student_id', 'studentid', 'studentnumber', 'registration_number', 'cin', 'code_etudiant', 'identifiant'],
      },
      {
        key: 'firstName',
        labelFr: 'Prénom',
        labelEn: 'First Name',
        required: true,
        type: 'string',
        description: 'Prénom de l\'étudiant.',
        aliases: ['prenom', 'first_name', 'firstname', 'prenoms', 'given_name', 'prenom_etudiant'],
      },
      {
        key: 'lastName',
        labelFr: 'Nom de famille',
        labelEn: 'Last Name',
        required: true,
        type: 'string',
        description: 'Nom de famille de l\'étudiant.',
        aliases: ['nom', 'last_name', 'lastname', 'family_name', 'nom_de_famille', 'nom_etudiant', 'surname'],
      },
      {
        key: 'fullName',
        labelFr: 'Nom complet (si unique)',
        labelEn: 'Full Name',
        required: false,
        type: 'string',
        description: 'Découpé en prénom et nom si les deux colonnes ne sont pas séparées.',
        aliases: ['nom_complet', 'nom_prenom', 'prenom_nom', 'full_name', 'fullname', 'nom_et_prenom', 'nom_etudiant_complet', 'student_name'],
      },
      {
        key: 'email',
        labelFr: 'Adresse email',
        labelEn: 'Email Address',
        required: false,
        type: 'email',
        description: 'Email institutionnel ou personnel.',
        aliases: ['email', 'mail', 'courriel', 'e-mail', 'adresse_email', 'student_email', 'email_etudiant'],
      },
      {
        key: 'className',
        labelFr: 'Classe / Groupe assigné',
        labelEn: 'Assigned Class / Group',
        required: true,
        type: 'string',
        description: 'Code ou nom de la classe. Ex: "1BigData1", "GRP001", "2CS"',
        aliases: ['classe', 'class', 'class_name', 'classname', 'class_id', 'classid', 'groupe', 'group', 'section', 'nom_classe'],
      },
      {
        key: 'filiere',
        labelFr: 'Filière (optionnel)',
        labelEn: 'Programme (Optional)',
        required: false,
        type: 'string',
        description: 'Déduit de la classe si non spécifié.',
        aliases: ['filiere', 'programme', 'program', 'specialite', 'departement'],
      },
      {
        key: 'niveau',
        labelFr: 'Niveau (optionnel)',
        labelEn: 'Level (Optional)',
        required: false,
        type: 'string',
        description: 'Déduit de la classe si non spécifié.',
        aliases: ['niveau', 'level', 'annee'],
      },
      {
        key: 'groupe',
        labelFr: 'Groupe TD/TP (optionnel)',
        labelEn: 'Group (Optional)',
        required: false,
        type: 'string',
        description: 'Déduit de la classe si non spécifié.',
        aliases: ['groupe', 'group', 'td', 'tp'],
      },
    ],
  },

  TEACHER: {
    nameFr: 'Enseignants',
    nameEn: 'Teachers',
    descriptionFr: 'Membres du corps professoral et département académique.',
    descriptionEn: 'Faculty members and academic departments.',
    fields: [
      {
        key: 'teacherNumber',
        labelFr: 'Matricule / Identifiant enseignant',
        labelEn: 'Teacher Number / ID',
        required: false,
        type: 'string',
        description: 'Généré automatiquement si absent. Ex: "TCH001", "ENS-102"',
        aliases: ['matricule', 'matricule_enseignant', 'no_enseignant', 'n_enseignant', 'teacher_number', 'teacher_id', 'teacherid', 'code_enseignant', 'id_enseignant', 'prof_id'],
      },
      {
        key: 'firstName',
        labelFr: 'Prénom',
        labelEn: 'First Name',
        required: false,
        type: 'string',
        description: 'Prénom de l\'enseignant.',
        aliases: ['prenom', 'first_name', 'firstname', 'given_name', 'prenom_enseignant'],
      },
      {
        key: 'lastName',
        labelFr: 'Nom',
        labelEn: 'Last Name',
        required: false,
        type: 'string',
        description: 'Nom de l\'enseignant.',
        aliases: ['nom', 'last_name', 'lastname', 'family_name', 'nom_enseignant', 'nom_prof', 'surname'],
      },
      {
        key: 'fullName',
        labelFr: 'Nom complet / Libellé',
        labelEn: 'Full Name / Label',
        required: true,
        type: 'string',
        description: 'Nom complet ou format officiel. Ex: "BEN SALEM M.", "Ahmed Trabelsi"',
        aliases: ['nom_complet', 'nom_prenom', 'teacher_name_as_written', 'teacher_name', 'professeur', 'enseignant', 'teacher', 'nom_complet_prof'],
      },
      {
        key: 'email',
        labelFr: 'Email professionnel',
        labelEn: 'Email Address',
        required: false,
        type: 'email',
        description: 'Généré automatiquement si absent (@issatk.rnu.tn).',
        aliases: ['email', 'mail', 'courriel', 'e-mail', 'adresse_email', 'email_enseignant', 'teacher_email'],
      },
      {
        key: 'department',
        labelFr: 'Département',
        labelEn: 'Department',
        required: false,
        type: 'string',
        description: 'Ex: "Informatique", "Génie Mécanique", "Génie Électrique"',
        aliases: ['departement', 'department', 'dept', 'filiere', 'unite'],
      },
      {
        key: 'phone',
        labelFr: 'Téléphone',
        labelEn: 'Phone Number',
        required: false,
        type: 'string',
        description: 'Numéro de contact professionnel.',
        aliases: ['telephone', 'phone', 'tel', 'mobile', 'gsm'],
      },
    ],
  },

  SUBJECT: {
    nameFr: 'Matières / Cours',
    nameEn: 'Subjects / Courses',
    descriptionFr: 'Unités d\'enseignement et modules académiques.',
    descriptionEn: 'Academic modules and teaching subjects.',
    fields: [
      {
        key: 'name',
        labelFr: 'Nom de la matière',
        labelEn: 'Subject / Course Name',
        required: true,
        type: 'string',
        description: 'Ex: "Algorithmique et Structures de Données", "Big data"',
        aliases: ['nom_matiere', 'nom_de_la_matiere', 'intitule_matiere', 'intitule', 'course_name', 'subject_name', 'nom_cours', 'nom_module', 'libelle', 'titre', 'matiere', 'cours', 'module', 'subject', 'course'],
      },
      {
        key: 'code',
        labelFr: 'Code matière',
        labelEn: 'Subject Code',
        required: false,
        type: 'string',
        description: 'Code abrégé unique (généré automatiquement si absent). Ex: "CRS001", "INFO101"',
        aliases: ['code_matiere', 'code_cours', 'code_module', 'course_id', 'subject_code', 'code', 'ref', 'reference'],
      },
    ],
  },

  ROOM: {
    nameFr: 'Salles de cours',
    nameEn: 'Classrooms / Rooms',
    descriptionFr: 'Salles d\'enseignement, laboratoires et amphithéâtres.',
    descriptionEn: 'Lecture halls, laboratories, and standard classrooms.',
    fields: [
      {
        key: 'name',
        labelFr: 'Nom ou numéro de salle',
        labelEn: 'Room Name / Number',
        required: true,
        type: 'string',
        description: 'Ex: "Salle 01", "AMPH Chiheb Lbib", "LAB INF1"',
        aliases: ['nom_salle', 'room_label', 'room_name', 'code_salle', 'num_salle', 'numero_salle', 'libelle_salle', 'salle', 'room', 'amphi', 'labo', 'laboratoire', 'local'],
      },
      {
        key: 'building',
        labelFr: 'Bâtiment / Bloc',
        labelEn: 'Building',
        required: false,
        type: 'string',
        description: 'Ex: "Bloc A", "Bâtiment Principal", "Amphis"',
        aliases: ['batiment', 'building', 'bloc', 'pavillon', 'etage', 'localisation'],
      },
      {
        key: 'capacity',
        labelFr: 'Capacité d\'accueil',
        labelEn: 'Capacity',
        required: false,
        type: 'number',
        description: 'Nombre de places assises.',
        aliases: ['capacite', 'capacity', 'places', 'nbr_places', 'places_assises', 'max_students', 'capacitedaccueil'],
      },
    ],
  },

  TIMETABLE: {
    nameFr: 'Emploi du temps',
    nameEn: 'Timetable Schedule',
    descriptionFr: 'Séances programmées par jour, horaire, classe, enseignant, matière et salle.',
    descriptionEn: 'Scheduled sessions by day, time, class, teacher, subject, and room.',
    fields: [
      {
        key: 'dayOfWeek',
        labelFr: 'Jour de la semaine',
        labelEn: 'Day of Week',
        required: true,
        type: 'dayOfWeek',
        description: 'Ex: "Monday", "Lundi", "Lun", "Mardi", "Mercredi", etc.',
        aliases: ['jour', 'day', 'day_of_week', 'jour_semaine', 'jour_de_la_semaine', 'weekday', 'date'],
      },
      {
        key: 'startTime',
        labelFr: 'Heure de début',
        labelEn: 'Start Time',
        required: false,
        type: 'time',
        description: 'Format HH:mm. Ex: "08:30"',
        aliases: ['debut', 'start', 'start_time', 'heure_debut', 'time_start', 'slot_start', 'from', 'h_debut'],
      },
      {
        key: 'endTime',
        labelFr: 'Heure de fin',
        labelEn: 'End Time',
        required: false,
        type: 'time',
        description: 'Format HH:mm. Ex: "10:00"',
        aliases: ['fin', 'end', 'end_time', 'heure_fin', 'time_end', 'slot_end', 'to', 'h_fin'],
      },
      {
        key: 'timeSlot',
        labelFr: 'Plage horaire combinée (si une seule colonne)',
        labelEn: 'Time Slot (Combined Range)',
        required: false,
        type: 'timeSlot',
        description: 'Ex: "08:30-10:00" ou "08:30 - 10:00"',
        aliases: ['horaire', 'time_slot', 'timeslot', 'creneau', 'slot', 'plage_horaire', 'horaires', 'seance'],
      },
      {
        key: 'className',
        labelFr: 'Classe / Groupe',
        labelEn: 'Class / Group',
        required: true,
        type: 'string',
        description: 'Classe ou section. Ex: "1BigData1", "GRP001", "ING2-B"',
        aliases: ['classe', 'class', 'class_name', 'class_id', 'groupe', 'group', 'section', 'nom_classe', 'code_classe'],
      },
      {
        key: 'teacherName',
        labelFr: 'Enseignant',
        labelEn: 'Teacher',
        required: false,
        type: 'string',
        description: 'Nom ou matricule de l\'enseignant. Ex: "BEN SALEM M.", "TCH001"',
        aliases: ['enseignant', 'teacher', 'teacher_name', 'teacher_id', 'prof', 'professeur', 'teacher_names_found', 'nom_enseignant', 'nom_prof'],
      },
      {
        key: 'subjectName',
        labelFr: 'Matière / Cours',
        labelEn: 'Subject / Course',
        required: true,
        type: 'string',
        description: 'Nom ou code du module. Ex: "Fond BD", "CRS001", "Analyse 1"',
        aliases: ['matiere', 'subject', 'subject_name', 'course', 'course_name', 'module', 'cell_text', 'nom_matiere', 'cours'],
      },
      {
        key: 'roomName',
        labelFr: 'Salle de cours',
        labelEn: 'Room',
        required: false,
        type: 'string',
        description: 'Nom de la salle. Ex: "Salle 01", "AMPH Chiheb Lbib", "LAB INF1"',
        aliases: ['salle', 'room', 'room_name', 'room_label', 'local', 'nom_salle'],
      },
      {
        key: 'versionName',
        labelFr: 'Version / Semestre (optionnel)',
        labelEn: 'Version / Term (Optional)',
        required: false,
        type: 'string',
        description: 'Ex: "Semestre 1 2026/2027"',
        aliases: ['version', 'timetable_version', 'semestre', 'academic_year', 'annee_universitaire'],
      },
    ],
  },
};

/**
 * Automatically extracts study level (niveau), programme/filière, and group (groupe)
 * from university class names like "1BigData1", "2EEA1", "3ISI.3", "1MRDS1", "1GM10", "2ENR.1", "3EEA-AII1".
 */
export function parseClassInfo(className: string): {
  niveau: string;
  filiere: string;
  groupe: string;
} {
  const clean = (className || '').trim();
  if (!clean) return { niveau: '', filiere: '', groupe: '' };

  // 1. Standard format: Level (digits) + Filiere (letters/hyphen) + optional separator + Groupe (digits)
  // e.g. "1BigData1" -> niveau: "1", filiere: "BigData", groupe: "G1"
  //      "2EEA1"     -> niveau: "2", filiere: "EEA",     groupe: "G1"
  //      "3EEA-AII1" -> niveau: "3", filiere: "EEA-AII", groupe: "G1"
  //      "1GM10"     -> niveau: "1", filiere: "GM",      groupe: "G10"
  //      "2ENR.1"    -> niveau: "2", filiere: "ENR",     groupe: "G1"
  //      "1MRDS1"    -> niveau: "1", filiere: "MRDS",    groupe: "G1"
  const m1 = clean.match(/^(\d+)([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(\d+)$/);
  if (m1) {
    return {
      niveau: m1[1],
      filiere: m1[2],
      groupe: `G${m1[3]}`,
    };
  }

  // 2. Format with letter prefix in level: e.g. "L1-EEA-G1", "M2_DS_2", "L3-ISI-1"
  const m2 = clean.match(/^([a-zA-Z]+\d+)[.\-_]?([a-zA-Z][a-zA-Z\-]*?)[.\-_]?(?:G|g|gr|GR)?(\d+)$/);
  if (m2) {
    return {
      niveau: m2[1],
      filiere: m2[2],
      groupe: `G${m2[3]}`,
    };
  }

  // 3. Fallback: Level + Filiere without trailing group
  const m3 = clean.match(/^(\d+|[a-zA-Z]+\d+)([a-zA-Z\-]+)$/);
  if (m3) {
    return {
      niveau: m3[1],
      filiere: m3[2],
      groupe: 'G1',
    };
  }

  return {
    niveau: '',
    filiere: clean,
    groupe: 'G1',
  };
}


export const FILIERES = [
  "Informatique",
  "Mathématiques",
  "Gestion",
  "Génie Civil",
] as const;

export const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"] as const;

export const GROUPES = ["G1", "G2", "G3", "G4"] as const;

export const DEMO_ACCOUNTS = [
  { role: "admin", label: "Administrateur", email: "admin@univ.tn", password: "Admin123!" },
  { role: "teacher", label: "Enseignant (Dr. Amine Larbi)", email: "a.larbi@univ.tn", password: "Prof123!" },
  { role: "student", label: "Étudiante (Lina Benali)", email: "lina.benali@etu.univ.tn", password: "Etud123!" },
] as const;
 
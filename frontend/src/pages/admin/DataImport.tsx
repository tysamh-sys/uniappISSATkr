import { useState, useEffect, useRef, useMemo } from "react";
import * as api from "../../api";
import {
  FileAnalysisResponse,
  SheetMappingConfig,
  ImportPreviewResponse,
  ImportExecutionReport,
  ImportHistoryItem,
  ImportEntityType,
  EntityPreviewItem,
} from "../../api";
import { Button, Card, Icon, Modal, useToast } from "../../components/ui";

const ENTITY_CONFIG: Record<
  ImportEntityType,
  {
    label: string;
    icon: string;
    badgeClass: string;
    fields: {
      key: string;
      label: string;
      required: boolean;
      description: string;
    }[];
  }
> = {
  CLASS: {
    label: "Classes / Groupes",
    icon: "grid",
    badgeClass: "badge-primary",
    fields: [
      { key: "name", label: "Nom de la classe", required: true, description: "Ex: 1BigData1, 2CS, ING2-B" },
      { key: "code", label: "Code de la classe", required: false, description: "Identifiant court (ou nom)" },
      { key: "filiere", label: "Filière / Programme", required: false, description: "Ex: BigData, ISI, EEA" },
      { key: "niveau", label: "Niveau", required: false, description: "Ex: 1, 2, L3, M1" },
      { key: "groupe", label: "Groupe / Section", required: false, description: "Ex: G1, TD1" },
    ],
  },
  STUDENT: {
    label: "Étudiants",
    icon: "students",
    badgeClass: "badge-success",
    fields: [
      { key: "studentNumber", label: "Matricule / N° Étudiant", required: true, description: "Matricule unique" },
      { key: "firstName", label: "Prénom", required: true, description: "Prénom de l'étudiant" },
      { key: "lastName", label: "Nom", required: true, description: "Nom de famille" },
      { key: "fullName", label: "Nom complet (si unique)", required: false, description: "Découpé automatiquement" },
      { key: "email", label: "Email", required: false, description: "Adresse email institutionnelle" },
      { key: "className", label: "Classe assignée", required: true, description: "Nom de la classe (ex: 1BigData1)" },
      { key: "filiere", label: "Filière", required: false, description: "Optionnel" },
      { key: "niveau", label: "Niveau", required: false, description: "Optionnel" },
      { key: "groupe", label: "Groupe", required: false, description: "Optionnel" },
    ],
  },
  TEACHER: {
    label: "Enseignants",
    icon: "teacher",
    badgeClass: "badge-info",
    fields: [
      { key: "fullName", label: "Nom de l'enseignant", required: true, description: "Ex: BEN SALEM M., Dr. Dupont" },
      { key: "teacherNumber", label: "Matricule enseignant", required: false, description: "Optionnel (généré si absent)" },
      { key: "firstName", label: "Prénom", required: false, description: "Optionnel si nom complet fourni" },
      { key: "lastName", label: "Nom", required: false, description: "Optionnel si nom complet fourni" },
      { key: "email", label: "Email professionnel", required: false, description: "Optionnel (généré si absent)" },
      { key: "department", label: "Département", required: false, description: "Ex: Informatique, Mécanique" },
      { key: "phone", label: "Téléphone", required: false, description: "Optionnel" },
    ],
  },
  SUBJECT: {
    label: "Matières / Modules",
    icon: "book",
    badgeClass: "badge-warning",
    fields: [
      { key: "name", label: "Nom du cours / matière", required: true, description: "Ex: Algorithmique, Fond BD" },
      { key: "code", label: "Code matière", required: false, description: "Ex: CRS001, INFO101 (généré si absent)" },
    ],
  },
  ROOM: {
    label: "Salles de cours",
    icon: "grid",
    badgeClass: "badge-neutral",
    fields: [
      { key: "name", label: "Nom de la salle", required: true, description: "Ex: Salle 01, AMPH Chiheb Lbib" },
      { key: "building", label: "Bâtiment / Bloc", required: false, description: "Ex: Bloc A, Amphis" },
      { key: "capacity", label: "Capacité", required: false, description: "Nombre de places" },
    ],
  },
  TIMETABLE: {
    label: "Emploi du temps",
    icon: "calendar",
    badgeClass: "badge-danger",
    fields: [
      { key: "dayOfWeek", label: "Jour de la semaine", required: true, description: "Lundi, Mardi, etc." },
      { key: "startTime", label: "Heure début (HH:mm)", required: false, description: "Ex: 08:30" },
      { key: "endTime", label: "Heure fin (HH:mm)", required: false, description: "Ex: 10:00" },
      { key: "timeSlot", label: "Plage horaire combinée", required: false, description: "Ex: 08:30-10:00" },
      { key: "className", label: "Classe", required: true, description: "Ex: 1BigData1" },
      { key: "teacherName", label: "Enseignant", required: false, description: "Nom ou matricule (optionnel)" },
      { key: "subjectName", label: "Matière", required: true, description: "Nom ou code matière" },
      { key: "roomName", label: "Salle", required: false, description: "Nom de salle (optionnel)" },
    ],
  },
};

export default function DataImportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"wizard" | "history">("wizard");
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // File analysis state
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FileAnalysisResponse | null>(null);

  // Sheet configuration state
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [sheetEntities, setSheetEntities] = useState<Record<string, ImportEntityType>>({});
  const [sheetMappings, setSheetMappings] = useState<Record<string, Record<string, string>>>({});
  const [activeMappingSheet, setActiveMappingSheet] = useState<string>("");

  // Validation & preview state
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>("");
  const [previewFilterStatus, setPreviewFilterStatus] = useState<string>("ALL");
  const [previewSearch, setPreviewSearch] = useState<string>("");
  const [previewPage, setPreviewPage] = useState<number>(1);
  const PREVIEW_PAGE_SIZE = 15;

  // Options
  const [strategy, setStrategy] = useState<"SKIP" | "UPDATE">("SKIP");
  const [generateUserAccounts, setGenerateUserAccounts] = useState(false);

  // Execution state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportExecutionReport | null>(null);

  // History state
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<ImportExecutionReport | null>(null);

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.listImportHistory(30);
      setHistory(data);
    } catch {
      toast.error("Impossible de charger l'historique des imports.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Step 1: File selection & upload analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      await processFile(dropped);
    }
  };

  const processFile = async (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      toast.error("Format non supporté. Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV.");
      return;
    }

    setFile(selectedFile);
    setAnalyzing(true);
    try {
      const res = await api.analyzeImportFile(selectedFile);
      setAnalysis(res);

      const initSelected: Record<string, boolean> = {};
      const initEntities: Record<string, ImportEntityType> = {};
      const initMappings: Record<string, Record<string, string>> = {};

      res.sheets.forEach((s) => {
        const hasEntity = !!s.suggestedEntity && s.rowCount > 0;
        initSelected[s.sheetName] = hasEntity;
        if (s.suggestedEntity) {
          initEntities[s.sheetName] = s.suggestedEntity;
          initMappings[s.sheetName] = { ...s.suggestedMappings };
        } else {
          initEntities[s.sheetName] = "STUDENT";
          initMappings[s.sheetName] = {};
        }
      });

      setSelectedSheets(initSelected);
      setSheetEntities(initEntities);
      setSheetMappings(initMappings);

      const firstSelected =
        res.sheets.find((s) => initSelected[s.sheetName])?.sheetName ||
        res.sheets[0]?.sheetName ||
        "";
      setActiveMappingSheet(firstSelected);

      toast.success(`${res.sheets.length} feuille(s) détectée(s) dans ${selectedFile.name}.`);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse du fichier.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 3: Run Validation & Preview
  const handleValidatePreview = async () => {
    if (!analysis) return;

    const configs: SheetMappingConfig[] = [];
    for (const s of analysis.sheets) {
      if (selectedSheets[s.sheetName]) {
        configs.push({
          sheetName: s.sheetName,
          entityType: sheetEntities[s.sheetName] || "STUDENT",
          columnMappings: sheetMappings[s.sheetName] || {},
        });
      }
    }

    if (configs.length === 0) {
      toast.error("Veuillez sélectionner au moins une feuille à importer.");
      return;
    }

    // Required fields check
    for (const cfg of configs) {
      const def = ENTITY_CONFIG[cfg.entityType];
      for (const f of def.fields) {
        if (f.required) {
          // STUDENT: firstName/lastName required, but fullName alone is also acceptable
          if (cfg.entityType === "STUDENT" && (f.key === "firstName" || f.key === "lastName")) {
            if (cfg.columnMappings.fullName) continue;
          }
          // TEACHER: fullName required, but firstName+lastName together is acceptable
          if (cfg.entityType === "TEACHER" && f.key === "fullName") {
            if (cfg.columnMappings.firstName && cfg.columnMappings.lastName) continue;
          }
          if (cfg.entityType === "TEACHER" && (f.key === "firstName" || f.key === "lastName")) {
            if (cfg.columnMappings.fullName) continue;
          }
          // TIMETABLE: teacherName and roomName are optional (already marked required:false)
          if (cfg.entityType === "TIMETABLE" && (f.key === "teacherName" || f.key === "roomName")) {
            continue;
          }
          if (!cfg.columnMappings[f.key]) {
            toast.error(
              `La feuille '${cfg.sheetName}' nécessite le mappage du champ obligatoire '${f.label}'.`
            );
            setActiveMappingSheet(cfg.sheetName);
            setStep(3);
            return;
          }
        }
      }
    }

    setValidating(true);
    try {
      const previewRes = await api.previewImportData({
        fileToken: analysis.fileToken,
        sheets: configs,
      });
      setPreview(previewRes);
      setActivePreviewSheet(configs[0]?.sheetName || "");
      setPreviewPage(1);
      setStep(4);
      toast.success("Validation terminée. Vérifiez l'aperçu avant de confirmer.");
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation.");
    } finally {
      setValidating(false);
    }
  };

  // Step 5: Execute Import
  const handleExecuteImport = async () => {
    if (!analysis || !preview) return;
    setConfirmModalOpen(false);
    setImporting(true);

    const configs: SheetMappingConfig[] = [];
    for (const s of analysis.sheets) {
      if (selectedSheets[s.sheetName]) {
        configs.push({
          sheetName: s.sheetName,
          entityType: sheetEntities[s.sheetName],
          columnMappings: sheetMappings[s.sheetName] || {},
        });
      }
    }

    try {
      const rep = await api.executeImportData({
        fileToken: analysis.fileToken,
        sheets: configs,
        options: {
          strategy,
          generateUserAccounts,
        },
      });
      setReport(rep);
      setStep(5);
      toast.success("Importation terminée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'importation.");
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setAnalysis(null);
    setPreview(null);
    setReport(null);
    setSelectedSheets({});
    setSheetEntities({});
    setSheetMappings({});
    setStep(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered & Paginated preview rows for active sheet
  const activeSheetValidation = useMemo(() => {
    if (!preview) return null;
    return preview.sheets.find((s) => s.sheetName === activePreviewSheet) || null;
  }, [preview, activePreviewSheet]);

  const filteredPreviewRows = useMemo(() => {
    if (!activeSheetValidation) return [];
    let rows = activeSheetValidation.previewRows;

    if (previewFilterStatus !== "ALL") {
      rows = rows.filter((r) => r.status === previewFilterStatus);
    }

    if (previewSearch.trim()) {
      const q = previewSearch.trim().toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.parsed).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    return rows;
  }, [activeSheetValidation, previewFilterStatus, previewSearch]);

  const totalPreviewPages = Math.max(1, Math.ceil(filteredPreviewRows.length / PREVIEW_PAGE_SIZE));
  const paginatedPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return filteredPreviewRows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [filteredPreviewRows, previewPage]);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="page-title">Importation des données</h1>
          <p className="page-subtitle">
            Système d'importation dynamique et sécurisé (réservé aux administrateurs).
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={api.getSampleDatasetDownloadUrl()}
            className="btn btn-outline"
            download="EDT-groupes-dataset-test.xlsx"
            title="Télécharger le jeu de données de test universitaire"
          >
            <Icon name="download" />
            <span>Télécharger le jeu de données de test</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`tab ${activeTab === "wizard" ? "active" : ""}`}
          onClick={() => setActiveTab("wizard")}
        >
          <Icon name="upload" />
          <span>Assistant d'importation</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <Icon name="clock" />
          <span>Historique & Audit</span>
        </button>
      </div>

      {activeTab === "wizard" && (
        <>
          {/* Multi-step progress bar */}
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem 1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
              }}
            >
              {[
                { num: 1, title: "1. Fichier" },
                { num: 2, title: "2. Analyse des feuilles" },
                { num: 3, title: "3. Mappage des colonnes" },
                { num: 4, title: "4. Aperçu & Contrôles" },
                { num: 5, title: "5. Résultats" },
              ].map((s) => {
                // Determine if this step is clickable (can navigate back/forward)
                const canClick = (() => {
                  if (step === 5) return false; // lock after import
                  if (s.num === 1) return step > 1;
                  if (s.num === 2) return !!analysis && step !== 2;
                  if (s.num === 3) return !!analysis && step > 3;
                  if (s.num === 4) return !!preview && step !== 4;
                  return false;
                })();
                return (
                <div
                  key={s.num}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: canClick ? "pointer" : "default",
                    opacity: step >= s.num ? 1 : 0.45,
                  }}
                  onClick={() => {
                    if (canClick) setStep(s.num as any);
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor:
                        step === s.num
                          ? "var(--color-primary)"
                          : step > s.num
                          ? "var(--color-success)"
                          : "var(--color-border)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {step > s.num ? "✓" : s.num}
                  </span>
                  <span style={{ fontWeight: step === s.num ? 700 : 500, fontSize: "0.9rem" }}>
                    {s.title}
                  </span>
                </div>
              )})}
            </div>
          </div>

          {/* STEP 1: Upload File */}
          {step === 1 && (
            <Card title="Sélection du fichier source Excel ou CSV">
              {/* If analysis already exists (came back from step 2+), show resume banner */}
              {analysis && (
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "8px",
                    background: "rgba(16, 43, 85, 0.05)",
                    border: "1.5px solid var(--color-primary)",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      📄 {analysis.fileName} — {(analysis.fileSize / 1024).toFixed(1)} Ko
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                      {analysis.sheets.length} feuille(s) déjà analysée(s). Continuez sans re-télécharger.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="outline" onClick={resetWizard}>
                      Changer de fichier
                    </Button>
                    <Button variant="primary" onClick={() => setStep(2)}>
                      <span>Continuer vers les feuilles détectées</span>
                      <Icon name="chevron" />
                    </Button>
                  </div>
                </div>
              )}

              <div
                style={{
                  border: isDragOver
                    ? "2px dashed var(--color-primary)"
                    : "2px dashed var(--color-border)",
                  borderRadius: "12px",
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  background: isDragOver ? "rgba(16, 43, 85, 0.04)" : "var(--color-surface)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <span style={{ fontSize: "2.8rem" }}>📁</span>
                </div>
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem" }}>
                  {analysis ? "Remplacer le fichier : glissez-déposez ou parcourez" : "Glissez-déposez votre classeur Excel (.xlsx, .xls) ou CSV"}
                </h3>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    maxWidth: "540px",
                    margin: "0 auto 1.5rem auto",
                    fontSize: "0.9rem",
                  }}
                >
                  Le système est dynamique : il s'adapte à n'importe quelle disposition, ordre ou nom de
                  colonnes. Aucune structure prédéfinie n'est imposée.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                />
                <Button variant="primary" loading={analyzing}>
                  <Icon name="upload" />
                  <span>{analyzing ? "Analyse du fichier en cours…" : "Parcourir les fichiers"}</span>
                </Button>
              </div>

              {/* Sample Dataset Notice */}
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <Icon name="info" />
                  <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                    <strong>Notice relative aux tests :</strong> Vous pouvez tester immédiatement la
                    procédure complète avec le classeur de test généré à partir des documents d'emploi du temps.
                    <div style={{ marginTop: "0.4rem", fontStyle: "italic", color: "#64748b" }}>
                      « Ce fichier contient des données fictives destinées uniquement aux tests. Il ne
                      représente pas le format officiel d'importation de l'université. »
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* STEP 2: File Analysis */}
          {step === 2 && analysis && (
            <Card
              title={`Feuilles détectées dans "${analysis.fileName}" (${(analysis.fileSize / 1024).toFixed(1)} Ko)`}
              actions={
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="outline" onClick={resetWizard}>
                    Remplacer le fichier
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const hasSelected = Object.values(selectedSheets).some(Boolean);
                      if (!hasSelected) {
                        toast.error("Veuillez sélectionner au moins une feuille à importer.");
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    <span>Suivant : Mappage des colonnes</span>
                    <Icon name="chevron" />
                  </Button>
                </div>
              }
            >
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  marginBottom: "1.25rem",
                  fontSize: "0.9rem",
                }}
              >
                Cochez les feuilles que vous souhaitez importer. L'analyse heuristique a automatiquement
                identifié les entités cibles et leur degré de confiance. Vous pouvez modifier l'entité si
                nécessaire.
              </p>

              <div style={{ display: "grid", gap: "1rem" }}>
                {analysis.sheets.map((s) => {
                  const isChecked = !!selectedSheets[s.sheetName];
                  const currentEntity = sheetEntities[s.sheetName] || "STUDENT";
                  const entityMeta = ENTITY_CONFIG[currentEntity];

                  return (
                    <div
                      key={s.sheetName}
                      style={{
                        padding: "1rem 1.25rem",
                        borderRadius: "8px",
                        border: isChecked
                          ? "1.5px solid var(--color-primary)"
                          : "1px solid var(--color-border)",
                        background: isChecked ? "rgba(16, 43, 85, 0.02)" : "var(--color-surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedSheets({
                              ...selectedSheets,
                              [s.sheetName]: e.target.checked,
                            })
                          }
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <strong style={{ fontSize: "1rem" }}>{s.sheetName}</strong>
                            <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                              {s.rowCount} lignes
                            </span>
                            {s.confidence > 0 && (
                              <span
                                className={`badge ${
                                  s.confidence >= 0.7
                                    ? "badge-success"
                                    : s.confidence >= 0.4
                                    ? "badge-warning"
                                    : "badge-neutral"
                                }`}
                                style={{ fontSize: "0.75rem" }}
                              >
                                Détection : {Math.round(s.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-text-secondary)",
                              marginTop: "0.25rem",
                            }}
                          >
                            Colonnes ({s.headers.length}) : {s.headers.slice(0, 6).join(", ")}
                            {s.headers.length > 6 ? ` (+${s.headers.length - 6})` : ""}
                          </div>
                        </div>
                      </div>

                      {isChecked && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                            Importer en tant que :
                          </span>
                          <select
                            className="input"
                            style={{ width: "220px", padding: "0.4rem 0.6rem" }}
                            value={currentEntity}
                            onChange={(e) => {
                              const newEntity = e.target.value as ImportEntityType;
                              setSheetEntities({
                                ...sheetEntities,
                                [s.sheetName]: newEntity,
                              });
                            }}
                          >
                            <option value="CLASS">Classes / Groupes</option>
                            <option value="STUDENT">Étudiants</option>
                            <option value="TEACHER">Enseignants</option>
                            <option value="SUBJECT">Matières / Modules</option>
                            <option value="ROOM">Salles de cours</option>
                            <option value="TIMETABLE">Emploi du temps</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* STEP 3: Column Mapping */}
          {step === 3 && analysis && (
            <Card
              title="Mappage des colonnes"
              actions={
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <Icon name="chevronLeft" />
                    <span>Retour</span>
                  </Button>
                  <Button variant="primary" loading={validating} onClick={handleValidatePreview}>
                    <span>Valider & Prévisualiser</span>
                    <Icon name="chevron" />
                  </Button>
                </div>
              }
            >
              {/* Sheet selector tabs */}
              <div className="tabs" style={{ marginBottom: "1rem" }}>
                {analysis.sheets
                  .filter((s) => selectedSheets[s.sheetName])
                  .map((s) => {
                    const ent = sheetEntities[s.sheetName] || "STUDENT";
                    const meta = ENTITY_CONFIG[ent];
                    return (
                      <button
                        key={s.sheetName}
                        type="button"
                        className={`tab ${activeMappingSheet === s.sheetName ? "active" : ""}`}
                        onClick={() => setActiveMappingSheet(s.sheetName)}
                      >
                        <span>{s.sheetName}</span>
                        <span
                          className={`badge ${meta.badgeClass}`}
                          style={{ fontSize: "0.7rem", marginLeft: "0.4rem" }}
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Mapping table for active sheet */}
              {(() => {
                const sheet = analysis.sheets.find((s) => s.sheetName === activeMappingSheet);
                if (!sheet) return <div>Sélectionnez une feuille.</div>;
                const entityType = sheetEntities[sheet.sheetName] || "STUDENT";
                const entityDef = ENTITY_CONFIG[entityType];
                const currentMappings = sheetMappings[sheet.sheetName] || {};

                return (
                  <div>
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155" }}>
                        Associez chaque champ attendu à la colonne de votre fichier. Les champs avec une
                        étoile rouge (*) sont obligatoires. Des échantillons réels du fichier s'affichent
                        instantanément à droite.
                      </p>
                    </div>

                    <table className="table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "28%" }}>Champ attendu</th>
                          <th style={{ width: "32%" }}>Colonne dans le fichier</th>
                          <th style={{ width: "40%" }}>Échantillon de valeurs réelles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entityDef.fields.map((f) => {
                          const mappedCol = currentMappings[f.key] || "";
                          const samples = sheet.sampleRows
                            .map((r) => r[mappedCol])
                            .filter(Boolean)
                            .slice(0, 3);

                          return (
                            <tr key={f.key}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <strong>{f.label}</strong>
                                  {f.required && (
                                    <span
                                      style={{ color: "var(--color-danger)", fontWeight: 700 }}
                                      title="Obligatoire"
                                    >
                                      *
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                                  {f.description}
                                </div>
                              </td>

                              <td>
                                <select
                                  className="input"
                                  style={{
                                    width: "100%",
                                    borderColor:
                                      f.required && !mappedCol ? "var(--color-danger)" : undefined,
                                  }}
                                  value={mappedCol}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSheetMappings({
                                      ...sheetMappings,
                                      [sheet.sheetName]: {
                                        ...sheetMappings[sheet.sheetName],
                                        [f.key]: val,
                                      },
                                    });
                                  }}
                                >
                                  <option value="">-- Non mappé --</option>
                                  {sheet.headers.map((h) => (
                                    <option key={h} value={h}>
                                      {h}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td>
                                {mappedCol ? (
                                  samples.length > 0 ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                      {samples.map((val, idx) => (
                                        <span
                                          key={idx}
                                          className="badge badge-neutral"
                                          style={{
                                            fontSize: "0.75rem",
                                            maxWidth: "200px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                        >
                                          {String(val)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span
                                      style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}
                                    >
                                      (Échantillon vide)
                                    </span>
                                  )
                                ) : (
                                  <span
                                    style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* STEP 4: Validation & Preview */}
          {step === 4 && preview && (
            <Card
              title="Aperçu et contrôle de cohérence avant insertion"
              actions={
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <Icon name="chevronLeft" />
                    <span>Modifier les mappages</span>
                  </Button>
                  <Button
                    variant="primary"
                    disabled={preview.overallSummary.totalRecords === 0}
                    onClick={() => setConfirmModalOpen(true)}
                  >
                    <Icon name="check" />
                    <span>Confirmer et lancer l'importation</span>
                  </Button>
                </div>
              }
            >
              {/* Stat Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Total lignes détectées
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                    {preview.overallSummary.totalRecords}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(34, 160, 107, 0.08)",
                    border: "1px solid rgba(34, 160, 107, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-success)" }}>
                    Prêts à insérer
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-success)" }}>
                    {preview.overallSummary.validRecords}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(234, 179, 8, 0.08)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#ca8a04" }}>
                    Déjà en base / Doublons
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#ca8a04" }}>
                    {preview.overallSummary.duplicateRecords}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-danger)" }}>
                    Lignes en conflit / Erreur
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-danger)" }}>
                    {preview.overallSummary.errorRecords}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Entités cibles
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                    {preview.overallSummary.entitiesDetected.length} types
                  </div>
                </div>
              </div>

              {/* Dependency Status */}
              {preview.dependenciesSummary.unresolvedDependencies.length > 0 ? (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      color: "var(--color-danger)",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Icon name="alert" />
                    <span>Dépendances non résolues :</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.85rem", color: "#991b1b" }}>
                    {preview.dependenciesSummary.unresolvedDependencies.map((dep, idx) => (
                      <li key={idx}>{dep}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(34, 160, 107, 0.08)",
                    border: "1px solid rgba(34, 160, 107, 0.3)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      color: "var(--color-success)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="check" />
                    <span>Toutes les relations et dépendances entre feuilles sont résolues.</span>
                  </div>
                </div>
              )}

              {/* Options: Duplicate Strategy & Accounts */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>
                  Options d'exécution de l'import :
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem" }}>
                  <div>
                    <label
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Gestion des enregistrements existants (Doublons) :
                    </label>
                    <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.85rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="strategy"
                          checked={strategy === "SKIP"}
                          onChange={() => setStrategy("SKIP")}
                        />
                        <span>Ignorer (SKIP) — Conserver les données existantes</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="strategy"
                          checked={strategy === "UPDATE"}
                          onChange={() => setStrategy("UPDATE")}
                        />
                        <span>Mettre à jour (UPDATE / Upsert)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Sécurité des comptes :
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={generateUserAccounts}
                        onChange={(e) => setGenerateUserAccounts(e.target.checked)}
                      />
                      <span>
                        Générer un mot de passe temporaire unique et sécurisé par utilisateur
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sheet selector tabs */}
              <div className="tabs" style={{ marginBottom: "1rem" }}>
                {preview.sheets.map((s) => (
                  <button
                    key={s.sheetName}
                    type="button"
                    className={`tab ${activePreviewSheet === s.sheetName ? "active" : ""}`}
                    onClick={() => {
                      setActivePreviewSheet(s.sheetName);
                      setPreviewPage(1);
                    }}
                  >
                    <span>{s.sheetName}</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                      {s.totalRows}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter & Search Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Filtrer :</span>
                  {["ALL", "VALID", "DUPLICATE", "WARNING", "ERROR"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${previewFilterStatus === st ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setPreviewFilterStatus(st);
                        setPreviewPage(1);
                      }}
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    >
                      {st === "ALL"
                        ? "Tous"
                        : st === "VALID"
                        ? "Valides"
                        : st === "DUPLICATE"
                        ? "Existants"
                        : st === "WARNING"
                        ? "Avertissements"
                        : "Erreurs"}
                    </button>
                  ))}
                </div>

                <div style={{ width: "240px" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Rechercher dans l'aperçu…"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "70px" }}>Ligne</th>
                      <th style={{ width: "120px" }}>Statut</th>
                      <th>Données à insérer</th>
                      {strategy === "UPDATE" && <th>Comparaison (Existant vs Fichier)</th>}
                      <th>Détails & Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={strategy === "UPDATE" ? 5 : 4} style={{ textAlign: "center", padding: "2rem" }}>
                          Aucun enregistrement ne correspond au filtre sélectionné.
                        </td>
                      </tr>
                    ) : (
                      paginatedPreviewRows.map((item) => (
                        <tr key={item.line}>
                          <td><strong>#{item.line}</strong></td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "VALID"
                                  ? "badge-success"
                                  : item.status === "DUPLICATE"
                                  ? "badge-warning"
                                  : item.status === "WARNING"
                                  ? "badge-neutral"
                                  : "badge-danger"
                              }`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {item.status === "VALID"
                                ? "Valide"
                                : item.status === "DUPLICATE"
                                ? "Existant"
                                : item.status === "WARNING"
                                ? "Avertissement"
                                : "Erreur"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {Object.entries(item.parsed)
                                .filter(([_, v]) => v)
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    style={{
                                      background: "#f1f5f9",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    <strong>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                            </div>
                          </td>
                          {strategy === "UPDATE" && (
                            <td>
                              {item.diff ? (
                                <div style={{ fontSize: "0.75rem" }}>
                                  <div style={{ color: "#64748b" }}>
                                    <strong>Base :</strong>{" "}
                                    {Object.entries(item.diff.existing)
                                      .map(([k, v]) => `${k}=${v}`)
                                      .join(", ")}
                                  </div>
                                  <div style={{ color: "#0284c7", marginTop: "2px" }}>
                                    <strong>Nouveau :</strong>{" "}
                                    {Object.entries(item.diff.incoming)
                                      .map(([k, v]) => `${k}=${v}`)
                                      .join(", ")}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                                  Nouveau
                                </span>
                              )}
                            </td>
                          )}
                          <td>
                            {item.errors.map((err, idx) => (
                              <div key={idx} style={{ color: "var(--color-danger)", fontSize: "0.8rem" }}>
                                ❌ {err}
                              </div>
                            ))}
                            {item.warnings.map((w, idx) => (
                              <div key={idx} style={{ color: "#ca8a04", fontSize: "0.8rem" }}>
                                ℹ️ {w}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPreviewPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Affichage {paginatedPreviewRows.length} sur {filteredPreviewRows.length} lignes
                  </span>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <Button
                      variant="outline"
                      disabled={previewPage === 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
                    >
                      Précédent
                    </Button>
                    <span style={{ padding: "0.2rem 0.6rem", fontSize: "0.85rem", alignSelf: "center" }}>
                      Page {previewPage} / {totalPreviewPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={previewPage === totalPreviewPages}
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 5: Import Results Report */}
          {step === 5 && report && (
            <Card
              title="Résultats de l'importation"
              actions={
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="outline" onClick={resetWizard}>
                    <Icon name="upload" />
                    <span>Nouvelle importation</span>
                  </Button>
                  <Button variant="primary" onClick={() => setActiveTab("history")}>
                    <Icon name="clock" />
                    <span>Consulter l'historique complet</span>
                  </Button>
                </div>
              }
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "8px",
                  background:
                    report.status === "SUCCESS"
                      ? "rgba(34, 160, 107, 0.1)"
                      : report.status === "PARTIAL"
                      ? "rgba(234, 179, 8, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                  border:
                    report.status === "SUCCESS"
                      ? "1px solid rgba(34, 160, 107, 0.3)"
                      : report.status === "PARTIAL"
                      ? "1px solid rgba(234, 179, 8, 0.3)"
                      : "1px solid rgba(239, 68, 68, 0.3)",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "2rem" }}>
                    {report.status === "SUCCESS" ? "✅" : report.status === "PARTIAL" ? "⚠️" : "❌"}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                      {report.status === "SUCCESS"
                        ? "Importation réussie dans la base de données !"
                        : report.status === "PARTIAL"
                        ? "Importation partiellement réussie (certaines lignes ignorées)."
                        : "L'importation a échoué."}
                    </h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.85rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Opération #{report.id} · Initiée par {report.adminName} le{" "}
                      {new Date(report.importedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stat Metrics Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(34, 160, 107, 0.08)",
                    border: "1px solid rgba(34, 160, 107, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-success)" }}>
                    Enregistrements insérés
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-success)" }}>
                    +{report.totalInserted}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#2563eb" }}>
                    Enregistrements mis à jour
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#2563eb" }}>
                    {report.totalUpdated}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(234, 179, 8, 0.08)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#ca8a04" }}>
                    Enregistrements ignorés
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#ca8a04" }}>
                    {report.totalSkipped}
                  </div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--color-danger)" }}>Échecs</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-danger)" }}>
                    {report.totalFailed}
                  </div>
                </div>
              </div>

              {/* Per-Entity Breakdown */}
              <h4 style={{ margin: "0 0 0.75rem 0" }}>Bilan par catégorie :</h4>
              <table className="table" style={{ width: "100%", marginBottom: "1.5rem" }}>
                <thead>
                  <tr>
                    <th>Entité</th>
                    <th>Insérés</th>
                    <th>Mis à jour</th>
                    <th>Ignorés</th>
                    <th>Erreurs</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entityReports.map((r) => (
                    <tr key={r.entityType}>
                      <td>
                        <strong>{ENTITY_CONFIG[r.entityType]?.label || r.entityType}</strong>
                      </td>
                      <td style={{ color: "var(--color-success)", fontWeight: 600 }}>+{r.inserted}</td>
                      <td style={{ color: "#2563eb" }}>{r.updated}</td>
                      <td style={{ color: "#ca8a04" }}>{r.skipped}</td>
                      <td style={{ color: r.failed > 0 ? "var(--color-danger)" : "inherit" }}>
                        {r.failed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Explicit Confirmation Modal */}
          {confirmModalOpen && (
            <Modal
              onClose={() => setConfirmModalOpen(false)}
              title="Confirmation explicite de l'importation"
            >
              <div style={{ padding: "0.5rem 0" }}>
                <p style={{ margin: "0 0 1rem 0" }}>
                  Vous vous apprêtez à importer <strong>{preview?.overallSummary.validRecords}</strong>{" "}
                  enregistrements dans la base de données PostgreSQL universitaire.
                </p>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    marginBottom: "1.25rem",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong>Stratégie :</strong>{" "}
                    {strategy === "SKIP"
                      ? "Ignorer les existants (les données de la base ne seront pas modifiées)"
                      : "Mettre à jour les existants (les champs modifiés seront synchronisés)"}
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    <strong>Sécurité des comptes :</strong>{" "}
                    {generateUserAccounts
                      ? "Mot de passe temporaire unique généré par utilisateur (aucune clé partagée)"
                      : "Aucun compte utilisateur généré"}
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    <strong>Transaction :</strong> Atomique et sécurisée via Prisma ORM (rollback en cas
                    d'erreur critique)
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button variant="primary" loading={importing} onClick={handleExecuteImport}>
                    <span>Confirmer l'insertion</span>
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* HISTORY & AUDIT TAB */}
      {activeTab === "history" && (
        <Card
          title="Historique des opérations d'importation"
          actions={
            <Button variant="outline" onClick={loadHistory} loading={historyLoading}>
              <Icon name="refresh" />
              <span>Actualiser</span>
            </Button>
          }
        >
          {history.length === 0 && !historyLoading ? (
            <div className="empty-state" style={{ padding: "3rem 0" }}>
              <Icon name="clock" />
              <h3>Aucun import enregistré</h3>
              <p>L'historique et l'audit de toutes les importations effectuées apparaîtront ici.</p>
            </div>
          ) : (
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Fichier</th>
                  <th>Administrateur</th>
                  <th>Entités</th>
                  <th>Insérés</th>
                  <th>Mis à jour</th>
                  <th>Ignorés</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.importedAt).toLocaleString("fr-FR")}</td>
                    <td>
                      <strong>{item.fileName}</strong>
                    </td>
                    <td>{item.adminName}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {item.entityTypes.map((e) => (
                          <span key={e} className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                            {ENTITY_CONFIG[e]?.label.split(" ")[0] || e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: "var(--color-success)", fontWeight: 600 }}>+{item.insertedCount}</td>
                    <td>{item.updatedCount}</td>
                    <td style={{ color: "#ca8a04" }}>{item.skippedCount}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.status === "SUCCESS"
                            ? "badge-success"
                            : item.status === "PARTIAL"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {item.status === "SUCCESS" ? "Succès" : item.status === "PARTIAL" ? "Partiel" : "Échec"}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => setSelectedHistoryReport(item.summary)}
                      >
                        <span>Détails</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* History Details Modal */}
          {selectedHistoryReport && (
            <Modal
              onClose={() => setSelectedHistoryReport(null)}
              title={`Détail de l'importation : ${selectedHistoryReport.id}`}
            >
              <div style={{ padding: "0.5rem 0" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ padding: "0.5rem", background: "#f1f5f9", borderRadius: "6px" }}>
                    <small>Insérés</small>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-success)" }}>
                      +{selectedHistoryReport.totalInserted}
                    </div>
                  </div>
                  <div style={{ padding: "0.5rem", background: "#f1f5f9", borderRadius: "6px" }}>
                    <small>Mis à jour</small>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2563eb" }}>
                      {selectedHistoryReport.totalUpdated}
                    </div>
                  </div>
                  <div style={{ padding: "0.5rem", background: "#f1f5f9", borderRadius: "6px" }}>
                    <small>Ignorés</small>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ca8a04" }}>
                      {selectedHistoryReport.totalSkipped}
                    </div>
                  </div>
                  <div style={{ padding: "0.5rem", background: "#f1f5f9", borderRadius: "6px" }}>
                    <small>Échoués</small>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-danger)" }}>
                      {selectedHistoryReport.totalFailed}
                    </div>
                  </div>
                </div>

                <h4 style={{ margin: "0 0 0.5rem 0" }}>Détail par entité :</h4>
                <table className="table" style={{ width: "100%", fontSize: "0.8rem", marginBottom: "1rem" }}>
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Insérés</th>
                      <th>Mis à jour</th>
                      <th>Ignorés</th>
                      <th>Erreurs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryReport.entityReports.map((r) => (
                      <tr key={r.entityType}>
                        <td>{ENTITY_CONFIG[r.entityType]?.label || r.entityType}</td>
                        <td style={{ color: "var(--color-success)" }}>+{r.inserted}</td>
                        <td>{r.updated}</td>
                        <td>{r.skipped}</td>
                        <td style={{ color: r.failed > 0 ? "var(--color-danger)" : "inherit" }}>
                          {r.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="outline" onClick={() => setSelectedHistoryReport(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </Card>
      )}
    </div>
  );
}

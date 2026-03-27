import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { GripVertical, Plus, Trash2, Copy, ChevronDown, ChevronRight, ChevronLeft, Sparkles, List, Table, Columns2, AlertTriangle, BookOpen, Brain, CircleDot, LayoutGrid, FileText, Minus, Eye, Edit3, Zap, X, Check, HelpCircle, ArrowRight, Activity, Heart, Pill, Stethoscope, Shield, FlaskConical, Clock, Lightbulb, Target, AlertCircle, Info, CheckCircle2, RotateCcw, Image, AlignLeft, AlignRight, Trash, PanelLeftOpen, Search, Sun, Moon, Undo2, Redo2, Highlighter, MessageSquare, StickyNote, Palette, Send, Bookmark, BookmarkCheck, Volume2, VolumeX, Settings2, Timer, Pencil, Eraser, Type, Play, Pause, RotateCw, Maximize2, Minimize2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS — Production: these map to Tailwind/colors.ts
   ═══════════════════════════════════════════════════════════════ */
const LIGHT = {
  darkTeal: "#1B3B36", tealAccent: "#2a8c7a", teal50: "#e8f5f1", teal100: "#d1f0e7",
  pageBg: "#F0F2F5", white: "#FFFFFF", border: "#E5E7EB",
  textPrimary: "#111827", textSecondary: "#6b7280", textTertiary: "#9CA3AF",
  cardBg: "#FFFFFF", headerBg: "#1B3B36",
};
const DARK = {
  darkTeal: "#3cc9a8", tealAccent: "#3cc9a8", teal50: "#1a2e2a", teal100: "#1f3b35",
  pageBg: "#111215", white: "#1a1b20", border: "#2d2e34",
  textPrimary: "#e6e7eb", textSecondary: "#9ca3af", textTertiary: "#6b7280",
  cardBg: "#1e1f25", headerBg: "#0d0e11",
};

const MASTERY = {
  gray:   { bg: "#f4f4f5", border: "#a1a1aa", text: "#52525b", label: "Por descubrir" },
  red:    { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", label: "Emergente" },
  yellow: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", label: "En progreso" },
  green:  { bg: "#f0fdf4", border: "#10b981", text: "#065f46", label: "Consolidado" },
  blue:   { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", label: "Maestría" },
};
const MASTERY_DARK = {
  gray:   { bg: "#27272a", border: "#71717a", text: "#a1a1aa", label: "Por descubrir" },
  red:    { bg: "#2a1215", border: "#ef4444", text: "#fca5a5", label: "Emergente" },
  yellow: { bg: "#2a2010", border: "#f59e0b", text: "#fcd34d", label: "En progreso" },
  green:  { bg: "#0f2a1d", border: "#10b981", text: "#6ee7b7", label: "Consolidado" },
  blue:   { bg: "#0f1a2e", border: "#3b82f6", text: "#93c5fd", label: "Maestría" },
};

function getMasteryStyle(level, dark) {
  const m = dark ? MASTERY_DARK : MASTERY;
  if (level >= 1.1) return m.blue;
  if (level >= 1.0) return m.green;
  if (level >= 0.85) return m.yellow;
  if (level >= 0.5) return m.red;
  return m.gray;
}

const CALLOUT = {
  tip:      { bg: "#f0fdf4", border: "#10b981", accent: "#065f46", icon: Lightbulb, label: "Tip" },
  warning:  { bg: "#fffbeb", border: "#f59e0b", accent: "#92400e", icon: AlertTriangle, label: "Atención" },
  clinical: { bg: "#eff6ff", border: "#3b82f6", accent: "#1e40af", icon: Stethoscope, label: "Correlación Clínica" },
  mnemonic: { bg: "#f5f3ff", border: "#8b5cf6", accent: "#5b21b6", icon: Brain, label: "Mnemotecnia" },
  exam:     { bg: "#fef2f2", border: "#ef4444", accent: "#b91c1c", icon: Target, label: "Importante para Examen" },
};
const CALLOUT_DARK = {
  tip:      { bg: "#0f2a1d", border: "#10b981", accent: "#6ee7b7", icon: Lightbulb, label: "Tip" },
  warning:  { bg: "#2a2010", border: "#f59e0b", accent: "#fcd34d", icon: AlertTriangle, label: "Atención" },
  clinical: { bg: "#0f1a2e", border: "#3b82f6", accent: "#93c5fd", icon: Stethoscope, label: "Correlación Clínica" },
  mnemonic: { bg: "#1a1530", border: "#8b5cf6", accent: "#c4b5fd", icon: Brain, label: "Mnemotecnia" },
  exam:     { bg: "#2a1215", border: "#ef4444", accent: "#fca5a5", icon: Target, label: "Importante para Examen" },
};

const SEVERITY = { mild: "#10b981", moderate: "#f59e0b", critical: "#ef4444" };

/* ═══════════════════════════════════════════════════════════════
   HOOK: useUndoRedo — Generic undo/redo with history stack
   ═══════════════════════════════════════════════════════════════ */
function useUndoRedo(initialState, maxHistory = 30) {
  const [history, setHistory] = useState([initialState]);
  const [pointer, setPointer] = useState(0);
  const pointerRef = useRef(0);
  pointerRef.current = pointer;

  const state = history[pointer];

  const setState = useCallback((newStateOrFn) => {
    setHistory(prev => {
      const p = pointerRef.current;
      const current = prev[p] ?? prev[prev.length - 1];
      const newState = typeof newStateOrFn === "function" ? newStateOrFn(current) : newStateOrFn;
      const truncated = prev.slice(0, p + 1);
      const updated = [...truncated, newState].slice(-maxHistory);
      setPointer(updated.length - 1);
      pointerRef.current = updated.length - 1;
      return updated;
    });
  }, [maxHistory]);

  const undo = useCallback(() => setPointer(p => { pointerRef.current = Math.max(0, p - 1); return pointerRef.current; }), []);
  const redo = useCallback(() => setPointer(p => { const next = Math.min(p + 1, history.length - 1); pointerRef.current = next; return next; }), [history.length]);
  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { state, setState, undo, redo, canUndo, canRedo };
}

/* ═══════════════════════════════════════════════════════════════
   SAMPLE DATA — Aterosclerosis (in production: from API)
   ═══════════════════════════════════════════════════════════════ */
const SAMPLE_KEYWORDS = {
  aterosclerosis: { term: "Aterosclerosis", definition: "Enfermedad inflamatoria crónica de las arterias caracterizada por la acumulación de lípidos, células inflamatorias y tejido fibroso en la pared arterial, formando placas ateromatosas.", related: ["Placa ateromatosa", "Endotelio", "LDL oxidado"] },
  endotelio: { term: "Endotelio", definition: "Capa unicelular que reviste el interior de los vasos sanguíneos. Regula el tono vascular, la coagulación y la respuesta inflamatoria.", related: ["Óxido nítrico", "Disfunción endotelial"] },
  ldl: { term: "LDL oxidado", definition: "Lipoproteína de baja densidad que ha sufrido oxidación. Es el principal iniciador de la respuesta inflamatoria en la pared arterial.", related: ["Colesterol", "Macrófagos", "Células espumosas"] },
  macrofagos: { term: "Macrófagos", definition: "Células del sistema inmune que migran al subendotelio y fagocitan LDL oxidado, transformándose en células espumosas.", related: ["Células espumosas", "Inflamación"] },
  estatinas: { term: "Estatinas", definition: "Grupo farmacológico que inhibe la HMG-CoA reductasa, reduciendo la síntesis hepática de colesterol. Primera línea en el tratamiento de la hipercolesterolemia.", related: ["HMG-CoA reductasa", "LDL", "Colesterol"] },
  trombosis: { term: "Trombosis", definition: "Formación de un coágulo dentro de un vaso sanguíneo. Complicación aguda de la ruptura de placa ateromatosa.", related: ["Plaquetas", "Fibrina", "IAM"] },
};

const BLOCK_MASTERY = { b1: 0.4, b2: 1.15, b3: 0.9, b4: 0.6, b5: 1.05, b6: 0.3, b7: 0.88, b8: 1.0, b9: 0.7, b10: 0.95, b11: 0.5, b12: 1.2 };

const INITIAL_BLOCKS = [
  { id: "b1", type: "prose", title: "Definición y Concepto General", content: "La {{aterosclerosis}} es una enfermedad inflamatoria crónica de las arterias de mediano y gran calibre. Se caracteriza por la acumulación progresiva de lípidos, células inflamatorias y tejido fibroso en la íntima de la pared arterial, formando lesiones conocidas como placas ateromatosas.\n\nEs la principal causa de enfermedad cardiovascular a nivel mundial, incluyendo infarto agudo de miocardio, accidente cerebrovascular y enfermedad arterial periférica." },
  { id: "b2", type: "key_point", title: "Concepto Central", content: "La aterosclerosis NO es simplemente una acumulación pasiva de grasa — es un proceso inflamatorio activo donde el sistema inmune responde a la presencia de {{ldl}} en la pared arterial, generando un ciclo de daño y reparación que eventualmente estrecha o obstruye el vaso.", importance: "critical" },
  { id: "b3", type: "stages", title: "Patogénesis — Etapas de Formación de la Placa", items: [
    { stage: 1, title: "Disfunción endotelial", content: "El {{endotelio}} sufre daño por factores como hipertensión, tabaco, hiperglucemia o LDL elevado.", severity: "mild" },
    { stage: 2, title: "Infiltración de LDL", content: "El {{ldl}} penetra al subendotelio y sufre oxidación, actuando como señal de alarma.", severity: "mild" },
    { stage: 3, title: "Formación de células espumosas", content: "Los {{macrofagos}} migran al subendotelio y fagocitan LDL oxidado sin control, formando la estría grasa.", severity: "moderate" },
    { stage: 4, title: "Placa fibrosa", content: "Las células musculares lisas migran, proliferan y producen colágeno, formando una capa fibrosa sobre el núcleo lipídico.", severity: "moderate" },
    { stage: 5, title: "Ruptura y trombosis", content: "Si la capa fibrosa es delgada o inflamada, puede romperse causando {{trombosis}} aguda.", severity: "critical" },
  ]},
  { id: "b4", type: "list_detail", title: "Factores de Riesgo", intro: "Se clasifican en modificables y no modificables. Múltiples factores tienen efecto multiplicador.", items: [
    { label: "Hipercolesterolemia", detail: "LDL elevado es el factor más directamente aterogénico. Meta: LDL < 70 mg/dL en alto riesgo.", icon: "Activity", severity: "high" },
    { label: "Hipertensión arterial", detail: "Daña el endotelio por estrés mecánico. Cada 20 mmHg de PAS duplica el riesgo CV.", icon: "Heart", severity: "high" },
    { label: "Tabaquismo", detail: "Causa disfunción endotelial directa, aumenta LDL oxidado, reduce HDL.", icon: "AlertCircle", severity: "high" },
    { label: "Diabetes mellitus", detail: "La hiperglucemia crónica acelera la aterosclerosis por glicación de proteínas.", icon: "Activity", severity: "medium" },
  ]},
  { id: "b5", type: "comparison", title: "Diagnóstico Diferencial: Tipos de Angina", headers: ["Característica", "Angina Estable", "Angina Inestable", "IAM"], rows: [
    ["Dolor", "Con esfuerzo, cede con reposo", "En reposo o progresiva", "Intenso, prolongado (>20 min)"],
    ["ECG", "Normal o ST descendente", "ST descendente o T invertida", "ST elevado o nuevo BCRI"],
    ["Troponina", "Normal", "Normal o levemente elevada", "Elevada (diagnóstica)"],
    ["Tratamiento", "Nitratos + betabloqueantes", "Anticoagulación + internación", "Reperfusión urgente"],
  ], highlight_column: 3 },
  { id: "b6", type: "callout", variant: "clinical", title: "Correlación Clínica", content: "Paciente de 58 años, fumador, con HTA y dislipidemia que consulta por dolor torácico opresivo de 30 minutos con supradesnivel del ST en V1-V4 sugiere IAM anterior por oclusión de la DA. Conducta: reperfusión urgente." },
  { id: "b7", type: "two_column", columns: [
    { title: "Factores Modificables", content_type: "list_detail", items: [
      { label: "Dislipidemia", detail: "Control con estatinas y dieta" },
      { label: "HTA", detail: "Meta < 130/80 mmHg" },
      { label: "Tabaquismo", detail: "Cesación tabáquica" },
      { label: "Sedentarismo", detail: "150 min/semana de actividad" },
    ]},
    { title: "Factores No Modificables", content_type: "list_detail", items: [
      { label: "Edad", detail: "> 45H / > 55M" },
      { label: "Sexo", detail: "Masculino > Femenino (pre-menopausia)" },
      { label: "Genética", detail: "Historia familiar de ECV precoz" },
    ]},
  ]},
  { id: "b8", type: "grid", title: "Territorios Vasculares Afectados", columns: 3, items: [
    { label: "Coronarias", detail: "→ Angina, IAM", icon: "Heart" },
    { label: "Carótidas", detail: "→ ACV isquémico, AIT", icon: "Brain" },
    { label: "Aorta", detail: "→ Aneurisma, disección", icon: "Activity" },
    { label: "Renales", detail: "→ HTA renovascular, IR", icon: "FlaskConical" },
    { label: "Ilíacas/femorales", detail: "→ Claudicación", icon: "Activity" },
    { label: "Mesentéricas", detail: "→ Isquemia mesentérica", icon: "AlertCircle" },
  ]},
  { id: "b9", type: "callout", variant: "exam", title: "Clave para el Examen", content: "La placa VULNERABLE (capa fibrosa delgada, núcleo lipídico grande, macrófagos) es más peligrosa que la placa ESTABLE. Una placa del 40% puede causar IAM si se rompe, mientras que una del 90% puede ser asintomática si es estable." },
  { id: "b10", type: "prose", title: "Tratamiento Farmacológico", content: "El manejo se basa en la reducción agresiva de factores de riesgo. Las {{estatinas}} son la piedra angular del tratamiento, reduciendo el LDL entre 30-50%. Además tienen efectos pleiotrópicos: mejoran la función endotelial, reducen la inflamación y estabilizan la placa.\n\nLa aspirina en dosis bajas (75-100 mg/día) inhibe la agregación plaquetaria y reduce el riesgo de eventos trombóticos en prevención secundaria." },
  { id: "b11", type: "callout", variant: "mnemonic", title: "ABCDE de Prevención", content: "A — Aspirina y Anticoagulación\nB — Betabloqueantes y Blood pressure\nC — Colesterol (estatinas) y Cesación tabáquica\nD — Dieta y Diabetes (control glucémico)\nE — Ejercicio regular" },
];

/* ═══════════════════════════════════════════════════════════════
   KEYWORD CHIP — inline {{keyword}} → teal chip with popover
   ═══════════════════════════════════════════════════════════════ */
function KeywordChip({ id, keywords, T: theme }) {
  const kw = keywords[id];
  const [show, setShow] = useState(false);
  const [above, setAbove] = useState(true);
  const chipRef = useRef(null);

  const handleEnter = () => {
    setShow(true);
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      // If less than 200px from top, show below
      setAbove(rect.top > 200);
    }
  };

  if (!kw) return <span>{`{{${id}}}`}</span>;
  return (
    <span style={{ position: "relative", display: "inline" }} ref={chipRef}>
      <span onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}
        role="button" tabIndex={0} aria-describedby={show ? `kw-pop-${id}` : undefined}
        onFocus={handleEnter} onBlur={() => setShow(false)}
        style={{ backgroundColor: theme.teal50, color: theme.darkTeal, padding: "2px 8px", borderRadius: 12, fontWeight: 600, cursor: "pointer", fontSize: "0.95em", border: `1px solid ${theme.teal100}`, transition: "all 0.15s" }}>
        {kw.term}
      </span>
      {show && (
        <div id={`kw-pop-${id}`} role="tooltip"
          style={{ position: "absolute", ...(above ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }), left: "50%", transform: "translateX(-50%)", width: 320, background: theme.cardBg, borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", padding: 16, zIndex: 100, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.darkTeal, fontFamily: "Georgia, serif", marginBottom: 6 }}>{kw.term}</div>
          <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>{kw.definition}</div>
          {kw.related?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {kw.related.map(r => <span key={r} style={{ fontSize: 11, background: theme.teal50, color: theme.darkTeal, padding: "2px 8px", borderRadius: 10 }}>{r}</span>)}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

function renderTextWithKeywords(text, keywords, theme) {
  if (!text) return null;
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    const match = part.match(/^\{\{(.+)\}\}$/);
    if (match) return <KeywordChip key={i} id={match[1]} keywords={keywords} T={theme} />;
    return part.split("\n\n").map((p, j) => <span key={`${i}-${j}`}>{j > 0 && <><br /><br /></>}{p}</span>);
  });
}

/* Icon map helper */
const ICONS = { Activity, Heart, Pill, Stethoscope, Shield, FlaskConical, Clock, Lightbulb, Target, AlertCircle, Brain, Info, AlertTriangle, HelpCircle, CheckCircle2 };
function IconByName({ name, size = 16, color }) {
  const Icon = ICONS[name] || CircleDot;
  return <Icon size={size} color={color} />;
}

/* ═══════════════════════════════════════════════════════════════
   BLOCK RENDERERS (10 types) — Production-ready props interface
   ═══════════════════════════════════════════════════════════════ */
function ProseBlock({ block, keywords, T: theme }) {
  return (
    <div>
      {block.title && <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.darkTeal, marginBottom: 10, marginTop: 0 }}>{block.title}</h3>}
      <div style={{ fontSize: 15, lineHeight: 1.75, color: theme.textSecondary }}>{renderTextWithKeywords(block.content, keywords, theme)}</div>
    </div>
  );
}

function KeyPointBlock({ block, keywords, T: theme, dark }) {
  // This block ALWAYS has a dark background (headerBg), so text must always be light
  // regardless of the current theme mode
  const lightText = { tealAccent: "#3cc9a8", textBody: "#d1d5db", darkTeal: "#3cc9a8", teal50: "#1a2e2a", teal100: "#1f3b35" };
  // Merge a "forced light text" theme for renderTextWithKeywords inside this block
  const innerTheme = { ...theme, tealAccent: lightText.tealAccent, darkTeal: lightText.darkTeal, textSecondary: lightText.textBody, teal50: lightText.teal50, teal100: lightText.teal100 };
  return (
    <div style={{ background: theme.headerBg, borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Zap size={18} color={lightText.tealAccent} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: lightText.tealAccent }}>{block.title}</span>
        {block.importance === "critical" && <span style={{ fontSize: 11, background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>CRÍTICO</span>}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: lightText.textBody }}>{renderTextWithKeywords(block.content, keywords, innerTheme)}</div>
    </div>
  );
}

function StagesBlock({ block, keywords, T: theme }) {
  return (
    <div>
      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.darkTeal, marginBottom: 16, marginTop: 0 }}>{block.title}</h3>
      <div style={{ position: "relative", paddingLeft: 36 }}>
        <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom, ${theme.tealAccent}, ${SEVERITY.critical})` }} />
        {block.items.map((item, i) => {
          const sevColor = item.severity ? SEVERITY[item.severity] : theme.tealAccent;
          return (
            <div key={i} style={{ position: "relative", marginBottom: i < block.items.length - 1 ? 20 : 0 }}>
              <div style={{ position: "absolute", left: -30, top: 2, width: 20, height: 20, borderRadius: "50%", background: sevColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{item.stage}</div>
              <div style={{ background: theme.cardBg, borderRadius: 10, padding: "12px 16px", border: `1px solid ${theme.border}`, borderLeft: `3px solid ${sevColor}` }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: theme.darkTeal, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.6 }}>{renderTextWithKeywords(item.content, keywords, theme)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonBlock({ block, T: theme }) {
  return (
    <div>
      {block.title && <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.darkTeal, marginBottom: 12, marginTop: 0 }}>{block.title}</h3>}
      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${theme.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{block.headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", background: theme.headerBg, color: i === block.highlight_column ? "#3cc9a8" : "#d1d5db", fontWeight: 700, textAlign: "left", borderBottom: `2px solid ${theme.border}`, fontSize: 12 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>{block.rows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => (
              <td key={ci} style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.border}`, color: ci === block.highlight_column ? theme.tealAccent : theme.textSecondary, fontWeight: ci === block.highlight_column ? 600 : 400, background: ci === block.highlight_column ? theme.teal50 + "60" : "transparent" }}>{cell}</td>
            ))}</tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function ListDetailBlock({ block, keywords, T: theme }) {
  return (
    <div>
      {block.title && <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.darkTeal, marginBottom: 8, marginTop: 0 }}>{block.title}</h3>}
      {block.intro && <p style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 12, lineHeight: 1.6 }}>{block.intro}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block.items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", background: theme.cardBg, borderRadius: 10, border: `1px solid ${theme.border}`, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.teal50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconByName name={item.icon} size={16} color={theme.tealAccent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{renderTextWithKeywords(item.detail, keywords, theme)}</div>
            </div>
            {item.severity && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: item.severity === "high" ? "#fef2f2" : item.severity === "medium" ? "#fffbeb" : "#f0fdf4", color: item.severity === "high" ? "#dc2626" : item.severity === "medium" ? "#d97706" : "#059669" }}>
                {item.severity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GridBlock({ block, T: theme }) {
  return (
    <div>
      {block.title && <h3 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.darkTeal, marginBottom: 12, marginTop: 0 }}>{block.title}</h3>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${block.columns || 3}, 1fr)`, gap: 10 }}>
        {block.items.map((item, i) => (
          <div key={i} style={{ background: theme.cardBg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <IconByName name={item.icon} size={20} color={theme.tealAccent} />
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginTop: 6 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoColumnBlock({ block, keywords, T: theme }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {block.columns.map((col, ci) => (
        <div key={ci}>
          <h4 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: theme.darkTeal, marginBottom: 10, marginTop: 0 }}>{col.title}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {col.items.map((item, i) => (
              <div key={i} style={{ padding: "8px 12px", background: theme.cardBg, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{item.label}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalloutBlock({ block, T: theme, dark }) {
  const source = dark ? CALLOUT_DARK : CALLOUT;
  const variant = source[block.variant] || source.tip;
  const Icon = variant.icon;
  return (
    <div style={{ borderRadius: 12, padding: "16px 20px", background: variant.bg, borderLeft: `4px solid ${variant.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={16} color={variant.accent || variant.border} />
        <span style={{ fontSize: 12, fontWeight: 700, color: variant.accent || variant.border, textTransform: "uppercase", letterSpacing: "0.05em" }}>{variant.label}</span>
      </div>
      {block.title && <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>{block.title}</div>}
      <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.6, whiteSpace: "pre-line" }}>{block.content}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE REFERENCE BLOCK — full editor: upload, size, position, caption
   ═══════════════════════════════════════════════════════════════ */
function ImageReferenceBlock({ block, T: theme, isEditing, onUpdateBlock }) {
  const fileRef = useRef(null);
  const imgPos = block.imagePos || "center";
  const imgW = block.imageWidthPx || 220; // pixel width — draggable
  const hasImage = !!block.imageData;

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdateBlock?.(block.id, { imageData: ev.target.result, imageWidthPx: 220, imagePos: "center" });
    reader.readAsDataURL(file);
  };
  const set = (key, val) => onUpdateBlock?.(block.id, { [key]: val });

  // ── Position controls (shared) ──
  const PosControls = () => isEditing ? (
    <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6, justifyContent: "center", flexWrap: "wrap" }}>
      {[{ k: "left", icon: AlignLeft, l: "Izq" }, { k: "center", icon: Maximize2, l: "Centro" }, { k: "right", icon: AlignRight, l: "Der" }].map(p => (
        <button key={p.k} onClick={() => set("imagePos", p.k)}
          style={{ padding: "3px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
            border: imgPos === p.k ? `1.5px solid ${theme.tealAccent}` : `1px solid ${theme.border}`,
            background: imgPos === p.k ? theme.teal50 : "transparent",
            color: imgPos === p.k ? theme.tealAccent : theme.textTertiary, fontSize: 10, fontWeight: 600 }}>
          <p.icon size={11} /> {p.l}
        </button>
      ))}
      <div style={{ width: 1, height: 14, background: theme.border }} />
      <button onClick={() => fileRef.current?.click()} title="Reemplazar"
        style={{ padding: 3, borderRadius: 5, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textTertiary, cursor: "pointer", display: "flex" }}>
        <RotateCw size={10} />
      </button>
      <button onClick={() => set("imageData", null)} title="Eliminar"
        style={{ padding: 3, borderRadius: 5, border: `1px solid ${theme.border}`, background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex" }}>
        <Trash2 size={10} />
      </button>
      <span style={{ fontSize: 10, color: theme.textTertiary, fontFamily: "monospace", marginLeft: 4 }}>{imgW}px</span>
    </div>
  ) : null;

  // ── Caption ──
  const Caption = () => isEditing ? (
    <input value={block.caption || ""} onChange={e => set("caption", e.target.value)} placeholder="Caption..."
      style={{ width: "100%", fontSize: 11, fontStyle: "italic", color: theme.textTertiary, background: "transparent", border: "none", borderBottom: `1px dashed ${theme.border}`, padding: "4px 0", marginTop: 4, outline: "none", textAlign: "center" }} />
  ) : block.caption ? (
    <div style={{ fontSize: 11, fontStyle: "italic", color: theme.textTertiary, marginTop: 4, textAlign: "center" }}>{block.caption}</div>
  ) : null;

  // ── FLOAT MODE: image left/right with text alongside ──
  if (hasImage && imgPos !== "center") {
    const floatSide = imgPos === "left"
      ? { float: "left", marginRight: 16, marginBottom: 10 }
      : { float: "right", marginLeft: 16, marginBottom: 10 };

    return (
      <div style={{ overflow: "hidden" }}>
        <PosControls />
        <div style={{ ...floatSide }}>
          <ResizableImage src={block.imageData} alt={block.description || ""} width={imgW} minWidth={100} maxWidth={500}
            onWidthChange={w => set("imageWidthPx", w)} isEditing={isEditing} border={`1px solid ${theme.border}`} />
          <Caption />
        </div>
        <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.7 }}>
          {isEditing ? (
            <textarea value={block.description || ""} onChange={e => set("description", e.target.value)}
              placeholder="Escribe texto que acompañe la imagen..."
              style={{ width: "100%", minHeight: 80, fontSize: 14, color: theme.textSecondary, lineHeight: 1.7, background: "transparent", border: `1px dashed ${theme.border}`, borderRadius: 8, padding: 8, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          ) : (block.description || "")}
        </div>
        <div style={{ clear: "both" }} />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
      </div>
    );
  }

  // ── CENTER MODE or no image ──
  return (
    <div style={{ textAlign: "center" }}>
      {hasImage ? (
        <>
          <PosControls />
          <div style={{ display: "inline-block" }}>
            <ResizableImage src={block.imageData} alt={block.description || ""} width={imgW} minWidth={100} maxWidth={700}
              onWidthChange={w => set("imageWidthPx", w)} isEditing={isEditing} border={`1px solid ${theme.border}`} borderRadius={10} />
            <Caption />
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        </>
      ) : (
        <div style={{ borderRadius: 12, border: `2px dashed ${theme.border}`, padding: 28, cursor: isEditing ? "pointer" : "default", background: theme.pageBg, transition: "border-color 0.2s" }}
          onClick={() => isEditing && fileRef.current?.click()}
          onMouseEnter={e => isEditing && (e.currentTarget.style.borderColor = theme.tealAccent)}
          onMouseLeave={e => isEditing && (e.currentTarget.style.borderColor = theme.border)}>
          <Image size={36} color={theme.textTertiary} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary }}>{block.description || "Imagen por agregar"}</div>
          {isEditing && (
            <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, border: `1px solid ${theme.tealAccent}`, background: "transparent", color: theme.tealAccent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              + Subir Imagen
            </button>
          )}
          {!isEditing && block.caption && <div style={{ fontSize: 12, color: theme.textTertiary, fontStyle: "italic", marginTop: 6 }}>{block.caption}</div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESIZABLE IMAGE — drag corners/edges to resize, shows width indicator
   ═══════════════════════════════════════════════════════════════ */
function ResizableImage({ src, alt, width, minWidth = 80, maxWidth = 700, onWidthChange, isEditing, border, borderRadius = 8 }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const side = useRef("right"); // which handle is being dragged
  const cleanupRef = useRef(null); // cleanup for window listeners

  // Cleanup window listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  const onPointerDown = (e, handleSide) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startX.current = e.clientX;
    startW.current = width;
    side.current = handleSide;

    const onMove = (ev) => {
      const dx = ev.clientX - startX.current;
      // If dragging left handle, invert direction
      const delta = handleSide === "left" ? -dx : dx;
      const newW = Math.round(Math.max(minWidth, Math.min(maxWidth, startW.current + delta)));
      onWidthChange(newW);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      cleanupRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    cleanupRef.current = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  };

  const showHandles = isEditing && (hovered || dragging);

  return (
    <div ref={containerRef} style={{ position: "relative", width, display: "inline-block", userSelect: dragging ? "none" : "auto" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* The image */}
      <img src={src} alt={alt || ""} draggable={false}
        style={{ width: "100%", display: "block", borderRadius, border: showHandles ? "2px solid #2a8c7a" : (border || "1px solid #E5E7EB"), transition: dragging ? "none" : "border 0.15s" }} />

      {/* Width indicator while dragging */}
      {dragging && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(27,59,54,0.9)", color: "#3cc9a8", padding: "4px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", pointerEvents: "none",
          backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          {width}px
        </div>
      )}

      {/* Left handle */}
      {showHandles && (
        <div onPointerDown={e => onPointerDown(e, "left")}
          style={{
            position: "absolute", top: "50%", left: -4, transform: "translateY(-50%)",
            width: 8, height: 48, borderRadius: 4, cursor: "ew-resize",
            background: dragging && side.current === "left" ? "#2a8c7a" : "rgba(42,140,122,0.7)",
            border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            transition: "background 0.1s"
          }} />
      )}

      {/* Right handle */}
      {showHandles && (
        <div onPointerDown={e => onPointerDown(e, "right")}
          style={{
            position: "absolute", top: "50%", right: -4, transform: "translateY(-50%)",
            width: 8, height: 48, borderRadius: 4, cursor: "ew-resize",
            background: dragging && side.current === "right" ? "#2a8c7a" : "rgba(42,140,122,0.7)",
            border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            transition: "background 0.1s"
          }} />
      )}

      {/* Bottom-right corner handle */}
      {showHandles && (
        <div onPointerDown={e => onPointerDown(e, "right")}
          style={{
            position: "absolute", bottom: -4, right: -4,
            width: 14, height: 14, borderRadius: "0 0 6px 0", cursor: "nwse-resize",
            background: "rgba(42,140,122,0.85)", border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
          }} />
      )}
    </div>
  );
}

function SectionDividerBlock({ block, T: theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0" }}>
      <div style={{ flex: 1, height: 1, background: theme.border }} />
      {block.label && <span style={{ fontSize: 12, fontWeight: 600, color: theme.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{block.label}</span>}
      <div style={{ flex: 1, height: 1, background: theme.border }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BLOCK WRAPPER — mastery border, editor toolbar, drag handle
   ═══════════════════════════════════════════════════════════════ */
function BlockWrapper({ block, index, total, isEditing, masteryLevel, showMastery, onDelete, onDuplicate, onMoveUp, onMoveDown, onGenerateQuiz, onUpdateBlock, children, T: theme, dark, dragHandleProps, isDragging }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const attachImgRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleAttachImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateBlock) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdateBlock(block.id, { imageData: ev.target.result, imageSize: "md", imagePos: "right" });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const mastery = showMastery ? getMasteryStyle(masteryLevel, dark) : null;
  const isSelfStyled = ["key_point", "callout", "comparison", "image_reference", "section_divider"].includes(block.type);
  const hasAttachedImg = block.imageData && block.type !== "image_reference";
  const imgPos = block.imagePos || "right";

  return (
    <div id={`block-${block.id}`} style={{ display: "flex", gap: isEditing ? 8 : 0, alignItems: "flex-start", marginBottom: isEditing ? 8 : 16, opacity: isDragging ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* Drag handle (editor only) */}
      {isEditing && (
        <div {...(dragHandleProps || {})} style={{ paddingTop: 18, cursor: "grab", color: theme.textTertiary, flexShrink: 0, userSelect: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = theme.tealAccent}
          onMouseLeave={e => e.currentTarget.style.color = theme.textTertiary}>
          <GripVertical size={18} />
        </div>
      )}
      {/* Block content */}
      <div style={{
        flex: 1, position: "relative", transition: "background 0.3s, border-color 0.3s", overflow: "hidden",
        ...(isEditing ? {
          background: mastery ? mastery.bg : theme.cardBg, borderRadius: 16, padding: "20px 24px",
          border: `1px solid ${mastery ? mastery.border + "40" : theme.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        } : {
          background: mastery && !isSelfStyled ? mastery.bg + "60" : "transparent",
          padding: isSelfStyled ? "0" : "2px 0", border: "none", boxShadow: "none",
          borderLeft: mastery && !isSelfStyled ? `3px solid ${mastery.border}50` : "none",
          paddingLeft: mastery && !isSelfStyled ? 16 : 0,
        }),
      }}>
        {/* Editor toolbar row — type label + actions */}
        {isEditing && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: theme.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {block.type.replace("_", " ")}
            </div>
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {/* ★ PROMINENT image attach button — always visible for non-image blocks */}
              {block.type !== "image_reference" && !block.imageData && (
                <button onClick={() => attachImgRef.current?.click()} title="Agregar imagen al lado del texto"
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: `1px dashed ${theme.border}`, background: "transparent", cursor: "pointer", color: theme.textTertiary, fontSize: 10, fontWeight: 600, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.tealAccent; e.currentTarget.style.color = theme.tealAccent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textTertiary; }}>
                  <Image size={12} /> + Imagen
                </button>
              )}
              <button onClick={() => onGenerateQuiz(block.id)} title="Generar Quiz"
                style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 6, color: theme.textTertiary, display: "flex" }}>
                <HelpCircle size={16} />
              </button>
              <button title="IA Transform" style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 6, color: theme.textTertiary, display: "flex" }}>
                <Sparkles size={16} />
              </button>
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(!menuOpen)} title="Opciones" aria-expanded={menuOpen} aria-haspopup="menu"
                  style={{ background: menuOpen ? theme.pageBg : "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 6, color: theme.textTertiary, display: "flex" }}>
                  <ChevronDown size={16} />
                </button>
                {menuOpen && (
                  <div role="menu" style={{ position: "absolute", top: "100%", right: 0, background: theme.cardBg, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", padding: 4, zIndex: 50, minWidth: 160, border: `1px solid ${theme.border}` }}>
                    {[
                      { icon: Copy, label: "Duplicar", action: () => { onDuplicate(block.id); setMenuOpen(false); } },
                      index > 0 && { icon: ChevronDown, label: "Mover arriba", action: () => { onMoveUp(index); setMenuOpen(false); }, rotate: true },
                      index < total - 1 && { icon: ChevronDown, label: "Mover abajo", action: () => { onMoveDown(index); setMenuOpen(false); } },
                      block.type !== "image_reference" && block.imageData && { icon: Trash2, label: "Quitar imagen adjunta", action: () => { onUpdateBlock?.(block.id, { imageData: null }); setMenuOpen(false); } },
                      { icon: RotateCcw, label: "Regenerar con IA", action: () => setMenuOpen(false) },
                      { icon: Trash2, label: "Eliminar", action: () => { onDelete(block.id); setMenuOpen(false); }, danger: true },
                    ].filter(Boolean).map((item, i) => (
                      <button key={i} role="menuitem" onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", borderRadius: 6, fontSize: 13, color: item.danger ? "#ef4444" : theme.textPrimary, textAlign: "left" }}>
                        <item.icon size={14} style={item.rotate ? { transform: "rotate(180deg)" } : {}} /> {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Attached image with float + drag-to-resize ═══ */}
        {hasAttachedImg && (
          <>
            {/* Position controls — always visible in editor */}
            {isEditing && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}>
                {[{ k: "left", icon: AlignLeft, l: "Izq" }, { k: "right", icon: AlignRight, l: "Der" }].map(p => (
                  <button key={p.k} onClick={() => onUpdateBlock?.(block.id, { imagePos: p.k })}
                    style={{ padding: "3px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                      border: imgPos === p.k ? `1.5px solid ${theme.tealAccent}` : `1px solid ${theme.border}`,
                      background: imgPos === p.k ? theme.teal50 : "transparent",
                      color: imgPos === p.k ? theme.tealAccent : theme.textTertiary, fontSize: 10, fontWeight: 600 }}>
                    <p.icon size={11} /> {p.l}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: theme.textTertiary, fontFamily: "monospace" }}>{block.imageWidthPx || 220}px</span>
                <button onClick={() => onUpdateBlock?.(block.id, { imageData: null })} title="Quitar imagen"
                  style={{ padding: 3, borderRadius: 5, border: `1px solid ${theme.border}`, background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex" }}>
                  <Trash2 size={10} />
                </button>
              </div>
            )}
            <div style={{
              ...(imgPos === "left" ? { float: "left", marginRight: 16, marginBottom: 10 } : { float: "right", marginLeft: 16, marginBottom: 10 }),
            }}>
              <ResizableImage src={block.imageData} alt={block.imageCaption || ""} width={block.imageWidthPx || 220}
                minWidth={80} maxWidth={400} isEditing={isEditing} border={`1px solid ${theme.border}`}
                onWidthChange={w => onUpdateBlock?.(block.id, { imageWidthPx: w })} />
              {block.imageCaption && <div style={{ fontSize: 10, fontStyle: "italic", color: theme.textTertiary, marginTop: 3, textAlign: "center" }}>{block.imageCaption}</div>}
            </div>
          </>
        )}

        {children}
        {hasAttachedImg && <div style={{ clear: "both" }} />}

        {/* Hidden file input for image attach */}
        <input ref={attachImgRef} type="file" accept="image/*" onChange={handleAttachImage} style={{ display: "none" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INSERT BLOCK BUTTON
   ═══════════════════════════════════════════════════════════════ */
function InsertBlockButton({ onInsert, T: theme }) {
  const [open, setOpen] = useState(false);
  const types = [
    { type: "prose", icon: FileText, label: "Texto / Prosa" },
    { type: "key_point", icon: Zap, label: "Concepto Clave" },
    { type: "stages", icon: ArrowRight, label: "Etapas / Proceso" },
    { type: "comparison", icon: Table, label: "Tabla Comparativa" },
    { type: "list_detail", icon: List, label: "Lista Detallada" },
    { type: "grid", icon: LayoutGrid, label: "Grid" },
    { type: "two_column", icon: Columns2, label: "Dos Columnas" },
    { type: "callout", icon: AlertTriangle, label: "Callout / Nota" },
    { type: "image_reference", icon: Image, label: "Imagen" },
    { type: "section_divider", icon: Minus, label: "Separador" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4px 0", position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ width: 28, height: 28, borderRadius: "50%", border: `2px dashed ${open ? theme.tealAccent : theme.border}`, background: open ? theme.teal50 : "transparent", color: open ? theme.tealAccent : theme.textTertiary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        <Plus size={14} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", background: theme.cardBg, borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", padding: 8, zIndex: 50, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, minWidth: 280, border: `1px solid ${theme.border}` }}>
          {types.map(t => (
            <button key={t.type} onClick={() => { onInsert(t.type); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "none", background: "none", cursor: "pointer", borderRadius: 8, fontSize: 12, color: theme.textPrimary, textAlign: "left", whiteSpace: "nowrap" }}>
              <t.icon size={14} color={theme.tealAccent} /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUIZ MODAL
   ═══════════════════════════════════════════════════════════════ */
function QuizModal({ block, onClose, onAnswer, T: theme }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const correct = 2;
  const question = {
    text: `Sobre "${block.title || block.type}": ¿Cuál es la principal característica de la aterosclerosis?`,
    options: ["Es una enfermedad exclusivamente genética", "Es un depósito pasivo de grasa en las arterias", "Es un proceso inflamatorio crónico de las arterias", "Afecta solo a las venas de gran calibre"],
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 16, padding: 28, maxWidth: 520, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={20} color={theme.tealAccent} />
            <span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: theme.darkTeal }}>Quiz del Bloque</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 15, color: theme.textPrimary, lineHeight: 1.6, marginBottom: 16 }}>{question.text}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {question.options.map((opt, i) => {
            let bg = theme.cardBg, bc = theme.border, tc = theme.textPrimary;
            if (answered) {
              if (i === correct) { bg = "#f0fdf4"; bc = "#10b981"; tc = "#059669"; }
              else if (i === selected) { bg = "#fef2f2"; bc = "#ef4444"; tc = "#dc2626"; }
            } else if (i === selected) { bg = theme.teal50; bc = theme.tealAccent; }
            return (
              <button key={i} onClick={() => !answered && setSelected(i)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", border: `2px solid ${bc}`, borderRadius: 10, background: bg, cursor: answered ? "default" : "pointer", textAlign: "left", fontSize: 14, color: tc }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${bc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: answered && i === correct ? "#10b981" : answered && i === selected ? "#ef4444" : "transparent", color: answered && (i === correct || i === selected) ? "#fff" : tc }}>
                  {answered ? (i === correct ? <Check size={14} /> : i === selected ? <X size={14} /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        {!answered && selected !== null && (
          <button onClick={() => { setAnswered(true); onAnswer(selected === correct); }}
            style={{ marginTop: 16, width: "100%", padding: 12, background: theme.tealAccent, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Confirmar Respuesta
          </button>
        )}
        {answered && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: selected === correct ? "#f0fdf4" : "#fef2f2", border: `1px solid ${selected === correct ? "#10b981" : "#ef4444"}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: selected === correct ? "#059669" : "#dc2626", marginBottom: 4 }}>{selected === correct ? "¡Correcto!" : "Incorrecto"}</div>
            <div style={{ fontSize: 13, color: theme.textSecondary }}>La aterosclerosis es un proceso inflamatorio crónico activo, no un simple depósito de grasa.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR OUTLINE — scroll spy + click to scroll
   ═══════════════════════════════════════════════════════════════ */
function SidebarOutline({ blocks, activeBlockId, onBlockClick, isEditing, T: theme, collapsed, onToggleCollapse }) {
  const typeIcons = { prose: FileText, key_point: Zap, stages: ArrowRight, comparison: Table, list_detail: List, grid: LayoutGrid, two_column: Columns2, callout: AlertTriangle, image_reference: Image, section_divider: Minus };
  return (
    <div style={{
      width: collapsed ? 44 : 220, position: "sticky", top: 72, maxHeight: "calc(100vh - 88px)",
      overflowY: collapsed ? "hidden" : "auto", overflowX: "hidden", padding: "12px 0",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0
    }}>
      {/* Header con toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px", cursor: "pointer" }}
        onClick={onToggleCollapse}>
        {!collapsed && (
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: 4, whiteSpace: "nowrap" }}>Estructura</span>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "rgba(42,140,122,0.08)", flexShrink: 0 }}>
          {collapsed ? <ChevronRight size={14} color={theme.tealAccent} /> : <ChevronLeft size={14} color={theme.tealAccent} />}
        </div>
      </div>

      {/* Block list */}
      {blocks.map((block, i) => {
        const Icon = typeIcons[block.type] || FileText;
        const isActive = block.id === activeBlockId;
        return (
          <button key={block.id} onClick={() => onBlockClick(block.id)} title={collapsed ? (block.title || block.label || block.type.replace("_", " ")) : undefined}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: collapsed ? "6px 0" : "6px 12px", justifyContent: collapsed ? "center" : "flex-start", border: "none", background: isActive ? theme.teal50 : "transparent", cursor: "pointer", borderRadius: 8, fontSize: 12, color: isActive ? theme.tealAccent : theme.textSecondary, textAlign: "left", borderLeft: isActive ? `3px solid ${theme.tealAccent}` : "3px solid transparent", transition: "all 0.15s" }}>
            <Icon size={collapsed ? 16 : 12} color={isActive ? theme.tealAccent : theme.textTertiary} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isActive ? 600 : 400 }}>
                {block.title || block.label || block.type.replace("_", " ")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HIGHLIGHT TOOLBAR — floating tooltip on text selection
   ═══════════════════════════════════════════════════════════════ */
const HIGHLIGHT_COLORS = [
  { name: "Amarillo", color: "#fef08a", dark: "#854d0e20" },
  { name: "Verde", color: "#bbf7d0", dark: "#16653420" },
  { name: "Azul", color: "#bfdbfe", dark: "#1e40af20" },
  { name: "Rosa", color: "#fecdd3", dark: "#9f122520" },
  { name: "Naranja", color: "#fed7aa", dark: "#9a341220" },
];

function HighlightToolbar({ position, onHighlight, onAnnotate, onClose, T: theme }) {
  if (!position) return null;
  return (
    <div style={{
      position: "fixed", top: position.y - 48, left: position.x, transform: "translateX(-50%)",
      background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "6px 8px",
      display: "flex", alignItems: "center", gap: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 500
    }}>
      {HIGHLIGHT_COLORS.map(c => (
        <button key={c.name} title={c.name} onClick={() => onHighlight(c)}
          style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid transparent", background: c.color, cursor: "pointer", transition: "transform 0.1s" }}
          onMouseEnter={e => e.target.style.transform = "scale(1.2)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"} />
      ))}
      <div style={{ width: 1, height: 18, background: theme.border, margin: "0 4px" }} />
      <button onClick={onAnnotate} title="Agregar nota"
        style={{ background: "none", border: "none", cursor: "pointer", color: theme.tealAccent, display: "flex", padding: 4, borderRadius: 6 }}>
        <StickyNote size={16} />
      </button>
      <button onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex", padding: 4, borderRadius: 6 }}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANNOTATIONS PANEL — student notes anchored to blocks
   ═══════════════════════════════════════════════════════════════ */
function AnnotationsPanel({ annotations, blockId, onAdd, onDelete, T: theme }) {
  const [draft, setDraft] = useState("");
  const blockAnnotations = annotations.filter(a => a.blockId === blockId);
  if (blockAnnotations.length === 0 && !blockId) return null;

  return (
    <div style={{ marginTop: 8, padding: "10px 14px", background: theme.pageBg, borderRadius: 8, border: `1px dashed ${theme.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <StickyNote size={13} color={theme.tealAccent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Mis notas ({blockAnnotations.length})
        </span>
      </div>
      {blockAnnotations.map(note => (
        <div key={note.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${theme.border}`, alignItems: "flex-start" }}>
          <div style={{ flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{note.text}</div>
          <button onClick={() => onDelete(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, padding: 2, flexShrink: 0, opacity: 0.5 }}
            onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.5}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Agregar una nota..."
          onKeyDown={e => { if (e.key === "Enter" && draft.trim()) { onAdd(blockId, draft.trim()); setDraft(""); } }}
          style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: "none" }} />
        <button onClick={() => { if (draft.trim()) { onAdd(blockId, draft.trim()); setDraft(""); } }}
          style={{ background: theme.tealAccent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH BAR — Ctrl+F filter blocks by text
   ═══════════════════════════════════════════════════════════════ */
function SearchBar({ query, onQueryChange, resultCount, onClose, T: theme }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
      <Search size={16} color={theme.textTertiary} />
      <input ref={inputRef} value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Buscar en el resumen..."
        style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: theme.textPrimary }} />
      {query && <span style={{ fontSize: 12, color: theme.textTertiary }}>{resultCount} resultado{resultCount !== 1 ? "s" : ""}</span>}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex" }}><X size={16} /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DRAWING CANVAS — student scribble/sketch overlay per block
   ═══════════════════════════════════════════════════════════════ */
function DrawingCanvas({ blockId, onClose, T: theme }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(2);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const lastPoint = useRef(null);

  // Responsive canvas sizing
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        canvasRef.current.width = w;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    lastPoint.current = getPos(e);
  };
  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,0)" : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPoint.current = pos;
  };
  const endDraw = () => { setDrawing(false); lastPoint.current = null; };
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", theme.textPrimary];

  return (
    <div ref={containerRef} style={{ position: "relative", marginTop: 8, borderRadius: 10, border: `2px dashed ${theme.tealAccent}`, overflow: "hidden" }}
      role="img" aria-label="Área de dibujo libre del estudiante">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: theme.pageBg, borderBottom: `1px solid ${theme.border}`, flexWrap: "wrap" }}
        role="toolbar" aria-label="Herramientas de dibujo">
        <button onClick={() => setTool("pen")} title="Lápiz" aria-pressed={tool === "pen"}
          style={{ background: tool === "pen" ? theme.teal50 : "none", border: `1px solid ${tool === "pen" ? theme.tealAccent : "transparent"}`, borderRadius: 6, padding: 4, cursor: "pointer", display: "flex", color: theme.textSecondary }}>
          <Pencil size={14} />
        </button>
        <button onClick={() => setTool("eraser")} title="Borrador" aria-pressed={tool === "eraser"}
          style={{ background: tool === "eraser" ? theme.teal50 : "none", border: `1px solid ${tool === "eraser" ? theme.tealAccent : "transparent"}`, borderRadius: 6, padding: 4, cursor: "pointer", display: "flex", color: theme.textSecondary }}>
          <Eraser size={14} />
        </button>
        <div style={{ width: 1, height: 16, background: theme.border }} />
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool("pen"); }} title={c} aria-label={`Color ${c}`}
            style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: color === c && tool === "pen" ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", outline: color === c ? `2px solid ${theme.tealAccent}` : "none" }} />
        ))}
        <div style={{ width: 1, height: 16, background: theme.border }} />
        <label style={{ fontSize: 10, color: theme.textTertiary, display: "flex", alignItems: "center", gap: 4 }}>
          Grosor
          <input type="range" min="1" max="8" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
            style={{ width: 50, accentColor: theme.tealAccent }} aria-label="Grosor del trazo" />
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={clearCanvas} title="Limpiar" style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex", padding: 4 }}>
          <RotateCw size={13} /> <span style={{ fontSize: 10, marginLeft: 2 }}>Limpiar</span>
        </button>
        <button onClick={onClose} title="Cerrar dibujo" style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex", padding: 4 }}>
          <X size={14} />
        </button>
      </div>
      <canvas ref={canvasRef} width={720} height={200}
        style={{ width: "100%", height: 200, cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none", background: "transparent" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        aria-label="Canvas de dibujo — usa el ratón o dedo para dibujar" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKMARKS — save/unsave blocks
   ═══════════════════════════════════════════════════════════════ */
function BookmarkButton({ isBookmarked, onToggle, T: theme }) {
  return (
    <button onClick={onToggle} title={isBookmarked ? "Quitar marcador" : "Guardar bloque"}
      aria-label={isBookmarked ? "Quitar marcador de este bloque" : "Guardar este bloque como marcador"}
      aria-pressed={isBookmarked}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: isBookmarked ? "#f59e0b" : theme.textTertiary, transition: "color 0.15s, transform 0.15s", transform: isBookmarked ? "scale(1.15)" : "scale(1)" }}>
      {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEXT-TO-SPEECH — read block content aloud
   ═══════════════════════════════════════════════════════════════ */
function TTSButton({ text, T: theme }) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return (
    <button onClick={toggle} title={speaking ? "Detener lectura" : "Leer en voz alta"}
      aria-label={speaking ? "Detener lectura en voz alta" : "Leer este bloque en voz alta"}
      style={{ background: speaking ? "rgba(42,140,122,0.12)" : "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: speaking ? theme.tealAccent : theme.textTertiary, borderRadius: 6, transition: "all 0.15s" }}>
      {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   READING SETTINGS PANEL — font size, line spacing, focus mode
   ═══════════════════════════════════════════════════════════════ */
function ReadingSettingsPanel({ settings, onChange, onClose, T: theme }) {
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, marginTop: 6, width: 260, background: theme.cardBg,
      border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 200
    }} role="dialog" aria-label="Configuración de lectura">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>Configuración de lectura</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex" }} aria-label="Cerrar configuración">
          <X size={14} />
        </button>
      </div>

      {/* Font size */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 6, fontWeight: 600 }}>Tamaño de fuente</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: theme.textSecondary }}>A</span>
          <input type="range" min="13" max="22" value={settings.fontSize} onChange={e => onChange({ ...settings, fontSize: +e.target.value })}
            style={{ flex: 1, accentColor: theme.tealAccent }} aria-label={`Tamaño de fuente: ${settings.fontSize}px`} />
          <span style={{ fontSize: 18, color: theme.textSecondary, fontWeight: 600 }}>A</span>
          <span style={{ fontSize: 11, color: theme.textTertiary, minWidth: 30, textAlign: "right" }}>{settings.fontSize}px</span>
        </div>
      </div>

      {/* Line spacing */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 6, fontWeight: 600 }}>Interlineado</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1.4, 1.6, 1.8, 2.0].map(v => (
            <button key={v} onClick={() => onChange({ ...settings, lineHeight: v })}
              aria-pressed={settings.lineHeight === v}
              style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: `1px solid ${settings.lineHeight === v ? theme.tealAccent : theme.border}`, background: settings.lineHeight === v ? theme.teal50 : "transparent", color: settings.lineHeight === v ? theme.tealAccent : theme.textSecondary, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {v}x
            </button>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 6, fontWeight: 600 }}>Tipografía</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ k: "sans", l: "Sans", f: "Inter, sans-serif" }, { k: "serif", l: "Serif", f: "Georgia, serif" }, { k: "mono", l: "Mono", f: "JetBrains Mono, monospace" }].map(opt => (
            <button key={opt.k} onClick={() => onChange({ ...settings, fontFamily: opt.f })}
              aria-pressed={settings.fontFamily === opt.f}
              style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${settings.fontFamily === opt.f ? theme.tealAccent : theme.border}`, background: settings.fontFamily === opt.f ? theme.teal50 : "transparent", color: settings.fontFamily === opt.f ? theme.tealAccent : theme.textSecondary, fontSize: 11, fontFamily: opt.f, cursor: "pointer" }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Focus mode toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: theme.textPrimary, fontWeight: 600 }}>Modo enfoque</div>
          <div style={{ fontSize: 10, color: theme.textTertiary }}>Oscurece todo excepto el bloque activo</div>
        </div>
        <button onClick={() => onChange({ ...settings, focusMode: !settings.focusMode })}
          role="switch" aria-checked={settings.focusMode} aria-label="Activar modo enfoque"
          style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: settings.focusMode ? theme.tealAccent : theme.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: settings.focusMode ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STUDY TIMER — Pomodoro-style countdown
   ═══════════════════════════════════════════════════════════════ */
function StudyTimer({ T: theme, onClose }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("study"); // study | break
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false);
            // Switch mode
            if (mode === "study") { setMode("break"); return 5 * 60; }
            else { setMode("study"); return 25 * 60; }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const pct = mode === "study" ? ((25 * 60 - seconds) / (25 * 60)) * 100 : ((5 * 60 - seconds) / (5 * 60)) * 100;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, background: theme.cardBg, border: `1px solid ${theme.border}`,
      borderRadius: 16, padding: "12px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 400,
      minWidth: 180, textAlign: "center"
    }} role="timer" aria-label={`Temporizador de estudio: ${mm}:${ss}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span aria-live="assertive" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: mode === "study" ? theme.tealAccent : "#f59e0b" }}>
          {mode === "study" ? "Estudio" : "Descanso"}
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex" }} aria-label="Cerrar temporizador">
          <X size={12} />
        </button>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: theme.textPrimary, marginBottom: 8 }}>
        {mm}:{ss}
      </div>
      {/* Progress ring */}
      <div style={{ width: "100%", height: 4, background: theme.pageBg, borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: mode === "study" ? theme.tealAccent : "#f59e0b", borderRadius: 2, transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 14px", borderRadius: 8, border: "none", background: theme.tealAccent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          {running ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> {seconds === (mode === "study" ? 25 * 60 : 5 * 60) ? "Iniciar" : "Reanudar"}</>}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(mode === "study" ? 25 * 60 : 5 * 60); }}
          style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <RotateCw size={11} /> Reset
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKMARKS PANEL — list all saved blocks
   ═══════════════════════════════════════════════════════════════ */
function BookmarksPanel({ bookmarks, blocks, onScrollTo, onRemove, onClose, T: theme }) {
  const bookmarkedBlocks = blocks.filter(b => bookmarks.includes(b.id));
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, marginTop: 6, width: 280, background: theme.cardBg,
      border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 200,
      maxHeight: 350, overflowY: "auto"
    }} role="dialog" aria-label="Bloques guardados">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary }}>Marcadores ({bookmarkedBlocks.length})</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex" }} aria-label="Cerrar marcadores"><X size={14} /></button>
      </div>
      {bookmarkedBlocks.length === 0 ? (
        <div style={{ fontSize: 12, color: theme.textTertiary, textAlign: "center", padding: "16px 0" }}>
          No tienes bloques guardados todavía. Usa el icono <Bookmark size={12} style={{ verticalAlign: "middle" }} /> en cada bloque.
        </div>
      ) : bookmarkedBlocks.map(b => (
        <button key={b.id} onClick={() => { onScrollTo(b.id); onClose(); }}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, textAlign: "left", transition: "background 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.background = theme.teal50}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <BookmarkCheck size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {b.title || b.label || b.type}
            </div>
            <div style={{ fontSize: 10, color: theme.textTertiary }}>{b.type.replace("_", " ")}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(b.id); }} title="Quitar"
            style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary, display: "flex", padding: 2 }}>
            <X size={12} />
          </button>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   READING PROGRESS BAR
   ═══════════════════════════════════════════════════════════════ */
function ReadingProgress({ T: theme }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const winH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(winH > 0 ? (window.scrollY / winH) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${progress}%`, background: theme.tealAccent, zIndex: 150, transition: "width 0.1s" }} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de lectura" />;
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION — lightweight feedback system
   ═══════════════════════════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = "info", duration = 2500) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts, T: theme }) {
  if (toasts.length === 0) return null;
  const colors = { info: theme.tealAccent, success: "#10b981", warning: "#f59e0b", error: "#ef4444" };
  return (
    <div style={{ position: "fixed", top: 60, right: 20, zIndex: 600, display: "flex", flexDirection: "column", gap: 8 }} aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} style={{
          background: theme.cardBg, border: `1px solid ${colors[t.type] || theme.border}`, borderLeft: `4px solid ${colors[t.type]}`,
          borderRadius: 10, padding: "10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 13, color: theme.textPrimary,
          maxWidth: 300, animation: "fadeInRight 0.25s ease-out"
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: Extract readable text from any block type for TTS
   ═══════════════════════════════════════════════════════════════ */
function extractBlockText(block) {
  const strip = (s) => (s || "").replace(/\{\{([^}]+)\}\}/g, "$1");
  const parts = [];
  if (block.title) parts.push(strip(block.title));
  if (block.content) parts.push(strip(block.content));
  if (block.intro) parts.push(strip(block.intro));
  if (block.items) {
    block.items.forEach(item => {
      if (item.title) parts.push(strip(item.title));
      if (item.content) parts.push(strip(item.content));
      if (item.label) parts.push(strip(item.label));
      if (item.detail) parts.push(strip(item.detail));
    });
  }
  if (block.headers) parts.push(block.headers.join(", "));
  if (block.rows) block.rows.forEach(row => parts.push(row.join(", ")));
  if (block.columns && Array.isArray(block.columns)) {
    block.columns.forEach(col => {
      if (col.title) parts.push(col.title);
      if (col.items) col.items.forEach(item => { if (item.label) parts.push(item.label); if (item.detail) parts.push(item.detail); });
    });
  }
  if (block.description) parts.push(strip(block.description));
  return parts.join(". ").replace(/\.\./g, ".") || "Sin contenido";
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP — Orchestrator with all features
   ═══════════════════════════════════════════════════════════════ */
export default function AxonSummaryPrototype() {
  // Theme
  const [dark, setDark] = useState(false);
  const T = dark ? DARK : LIGHT;

  // Toast notifications
  const { toasts, show: showToast } = useToast();

  // Blocks with undo/redo
  const { state: blocks, setState: setBlocks, undo, redo, canUndo, canRedo } = useUndoRedo(INITIAL_BLOCKS);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [showMastery, setShowMastery] = useState(true);
  const [quizBlock, setQuizBlock] = useState(null);
  const [blockMastery, setBlockMastery] = useState(BLOCK_MASTERY);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Student tools: highlights & annotations
  const [highlights, setHighlights] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [highlightToolbar, setHighlightToolbar] = useState(null);
  const [annotatingBlockId, setAnnotatingBlockId] = useState(null);
  const [highlightMode, setHighlightMode] = useState(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const toggleBookmark = useCallback((id) => {
    setBookmarks(p => {
      const removing = p.includes(id);
      showToast(removing ? "Marcador eliminado" : "Bloque guardado", removing ? "info" : "success");
      return removing ? p.filter(b => b !== id) : [...p, id];
    });
  }, [showToast]);

  // Drawing canvas per block
  const [drawingBlockId, setDrawingBlockId] = useState(null);

  // Reading settings
  const [readingSettings, setReadingSettings] = useState({ fontSize: 15, lineHeight: 1.6, fontFamily: "Inter, sans-serif", focusMode: false });
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Study timer
  const [timerOpen, setTimerOpen] = useState(false);

  const addAnnotation = useCallback((blockId, text) => {
    setAnnotations(prev => [...prev, { id: `note-${Date.now()}`, blockId, text, createdAt: new Date().toISOString() }]);
  }, []);
  const deleteAnnotation = useCallback((noteId) => {
    setAnnotations(prev => prev.filter(n => n.id !== noteId));
  }, []);
  const addHighlight = useCallback((blockId, text, color) => {
    setHighlights(prev => [...prev, { id: `hl-${Date.now()}`, blockId, text, color: color.color, darkColor: color.dark, createdAt: new Date().toISOString() }]);
    setHighlightToolbar(null);
  }, []);

  // Handle text selection for highlight toolbar
  const handleTextSelect = useCallback((blockId) => {
    if (isEditing) return; // Only in student mode
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setHighlightToolbar(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setHighlightToolbar({ x: rect.left + rect.width / 2, y: rect.top, text: sel.toString().trim(), blockId });
  }, [isEditing]);

  // Drag state (pointer-based, no library)
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // --- Block operations ---
  const updateBlockProps = useCallback((id, props) => {
    setBlocks(b => b.map(block => block.id === id ? { ...block, ...props } : block));
  }, [setBlocks]);
  const deleteBlock = (id) => setBlocks(b => b.filter(x => x.id !== id));
  const duplicateBlock = (id) => {
    setBlocks(b => {
      const idx = b.findIndex(x => x.id === id);
      const dup = { ...b[idx], id: `dup_${Date.now()}` };
      const nb = [...b]; nb.splice(idx + 1, 0, dup); return nb;
    });
  };
  const moveUp = (i) => { if (i === 0) return; setBlocks(b => { const nb = [...b]; [nb[i - 1], nb[i]] = [nb[i], nb[i - 1]]; return nb; }); };
  const moveDown = (i) => { setBlocks(b => { if (i >= b.length - 1) return b; const nb = [...b]; [nb[i], nb[i + 1]] = [nb[i + 1], nb[i]]; return nb; }); };
  const insertBlock = (afterIndex, type) => {
    const newBlock = { id: `new_${Date.now()}`, type, title: `Nuevo bloque ${type}`, content: type === "prose" ? "Escribe aquí..." : "" };
    if (type === "stages") newBlock.items = [{ stage: 1, title: "Paso 1", content: "Descripción...", severity: null }];
    if (type === "comparison") { newBlock.headers = ["Col 1", "Col 2"]; newBlock.rows = [["—", "—"]]; newBlock.highlight_column = null; }
    if (type === "list_detail") { newBlock.items = [{ label: "Item", detail: "Detalle...", icon: "CircleDot" }]; }
    if (type === "grid") { newBlock.columns = 2; newBlock.items = [{ label: "Item", detail: "Detalle", icon: "CircleDot" }]; }
    if (type === "two_column") { newBlock.columns = [{ title: "Col A", content_type: "list_detail", items: [{ label: "Item", detail: "..." }] }, { title: "Col B", content_type: "list_detail", items: [{ label: "Item", detail: "..." }] }]; }
    if (type === "callout") newBlock.variant = "tip";
    if (type === "key_point") newBlock.importance = "high";
    if (type === "image_reference") { newBlock.description = "Describe la imagen"; newBlock.caption = ""; }
    if (type === "section_divider") newBlock.label = "Nueva Sección";
    setBlocks(b => { const nb = [...b]; nb.splice(afterIndex + 1, 0, newBlock); return nb; });
  };
  const handleQuizAnswer = (blockId, correct) => {
    setBlockMastery(prev => ({ ...prev, [blockId]: correct ? Math.min((prev[blockId] || 0.5) + 0.15, 1.3) : Math.max((prev[blockId] || 0.5) - 0.1, 0.2) }));
  };

  // --- Drag & drop (HTML5) ---
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    setBlocks(b => {
      const nb = [...b];
      const [moved] = nb.splice(dragIdx, 1);
      nb.splice(i, 0, moved);
      return nb;
    });
    setDragIdx(null); setDragOverIdx(null);
  };

  // --- Search ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return blocks;
    const q = searchQuery.toLowerCase();
    return blocks.filter(b => {
      // Exclude imageData from search to avoid serializing large base64 strings
      const { imageData, ...searchable } = b;
      const text = JSON.stringify(searchable).toLowerCase();
      return text.includes(q);
    });
  }, [blocks, searchQuery]);

  const visibleBlocks = searchQuery ? searchResults : blocks;

  // --- Scroll spy ---
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveBlockId(entry.target.id.replace("block-", ""));
        }
      }
    }, { threshold: 0.3, rootMargin: "-60px 0px -50% 0px" });
    blocks.forEach(b => {
      const el = document.getElementById(`block-${b.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [blocks]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === "e") { e.preventDefault(); setIsEditing(p => !p); }
      if (e.ctrlKey && e.key === "f") { e.preventDefault(); setSearchOpen(p => !p); }
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setHighlightMode(false); setHighlightToolbar(null); setDrawingBlockId(null); setSettingsPanelOpen(false); setBookmarksPanelOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const scrollToBlock = (id) => {
    document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderBlock = (block) => {
    const props = { block, keywords: SAMPLE_KEYWORDS, T };
    switch (block.type) {
      case "prose": return <ProseBlock {...props} />;
      case "key_point": return <KeyPointBlock {...props} dark={dark} />;
      case "stages": return <StagesBlock {...props} />;
      case "comparison": return <ComparisonBlock block={block} T={T} />;
      case "list_detail": return <ListDetailBlock {...props} />;
      case "grid": return <GridBlock block={block} T={T} />;
      case "two_column": return <TwoColumnBlock {...props} />;
      case "callout": return <CalloutBlock block={block} T={T} dark={dark} />;
      case "image_reference": return <ImageReferenceBlock block={block} T={T} isEditing={isEditing} onUpdateBlock={updateBlockProps} />;
      case "section_divider": return <SectionDividerBlock block={block} T={T} />;
      default: return <div>Tipo desconocido: {block.type}</div>;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: "'Inter', -apple-system, sans-serif", transition: "background 0.3s" }}
      role="main" aria-label="Resumen de estudio — Aterosclerosis">
      <ReadingProgress T={T} />
      <ToastContainer toasts={toasts} T={T} />
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
        {isEditing ? "Modo editor activado" : "Modo alumno activado"}
      </div>

      {/* Skip to content link for screen readers */}
      <a href="#summary-content" style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden", zIndex: 999 }}
        onFocus={e => { e.target.style.left = "10px"; e.target.style.top = "10px"; e.target.style.width = "auto"; e.target.style.height = "auto"; e.target.style.padding = "8px 16px"; e.target.style.background = T.tealAccent; e.target.style.color = "#fff"; e.target.style.borderRadius = "8px"; }}
        onBlur={e => { e.target.style.left = "-9999px"; }}>
        Saltar al contenido
      </a>

      {/* ── Header ── */}
      <header style={{ background: T.headerBg, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${dark ? "#2d2e34" : "transparent"}` }}
        role="banner" aria-label="Barra de herramientas del resumen">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.tealAccent, fontFamily: "Space Grotesk, sans-serif" }}>AXON</span>
          <span style={{ color: "#b4d9d1", fontSize: 13 }}>Resúmenes</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Undo/Redo */}
          <button onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" aria-keyshortcuts="Control+Z" aria-label="Deshacer"
            style={{ background: "none", border: "none", padding: 6, cursor: canUndo ? "pointer" : "default", color: canUndo ? "#b4d9d1" : "#6b9e95", display: "flex", borderRadius: 6, opacity: canUndo ? 1 : 0.4 }}>
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)" aria-keyshortcuts="Control+Y" aria-label="Rehacer"
            style={{ background: "none", border: "none", padding: 6, cursor: canRedo ? "pointer" : "default", color: canRedo ? "#b4d9d1" : "#6b9e95", display: "flex", borderRadius: 6, opacity: canRedo ? 1 : 0.4 }}>
            <Redo2 size={16} />
          </button>

          <div style={{ width: 1, height: 20, background: "#6b9e95", margin: "0 4px" }} />

          {/* Search */}
          <button onClick={() => { setSearchOpen(p => !p); if (searchOpen) setSearchQuery(""); }} title="Buscar (Ctrl+F)"
            style={{ background: searchOpen ? "rgba(42,140,122,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: searchOpen ? T.tealAccent : "#b4d9d1", display: "flex", borderRadius: 6 }}>
            <Search size={16} />
          </button>

          {/* Highlight mode toggle — student only */}
          {!isEditing && (
            <button onClick={() => setHighlightMode(p => !p)} title="Marca texto"
              style={{ background: highlightMode ? "rgba(254,240,138,0.25)" : "none", border: "none", padding: 6, cursor: "pointer", color: highlightMode ? "#eab308" : "#b4d9d1", display: "flex", borderRadius: 6 }}>
              <Highlighter size={16} />
            </button>
          )}

          {/* Annotations toggle — student only */}
          {!isEditing && (
            <button onClick={() => setAnnotatingBlockId(p => p ? null : "__all__")} title="Mis notas"
              style={{ background: annotatingBlockId ? "rgba(42,140,122,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: annotatingBlockId ? T.tealAccent : "#b4d9d1", display: "flex", borderRadius: 6, position: "relative" }}>
              <MessageSquare size={16} />
              {annotations.length > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: T.tealAccent, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {annotations.length}
                </span>
              )}
            </button>
          )}

          {/* Bookmarks — student only */}
          {!isEditing && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setBookmarksPanelOpen(p => !p)} title="Marcadores"
                aria-label={`Marcadores (${bookmarks.length} guardados)`}
                style={{ background: bookmarksPanelOpen ? "rgba(245,158,11,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: bookmarksPanelOpen ? "#f59e0b" : "#b4d9d1", display: "flex", borderRadius: 6, position: "relative" }}>
                <Bookmark size={16} />
                {bookmarks.length > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: "#f59e0b", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{bookmarks.length}</span>}
              </button>
              {bookmarksPanelOpen && <BookmarksPanel bookmarks={bookmarks} blocks={blocks} onScrollTo={scrollToBlock} onRemove={(id) => toggleBookmark(id)} onClose={() => setBookmarksPanelOpen(false)} T={T} />}
            </div>
          )}

          {/* Drawing toggle — student only */}
          {!isEditing && (
            <button onClick={() => setDrawingBlockId(p => p ? null : "__prompt__")} title="Dibujar / Rayar"
              aria-label="Activar modo dibujo en bloques"
              style={{ background: drawingBlockId ? "rgba(239,68,68,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: drawingBlockId ? "#ef4444" : "#b4d9d1", display: "flex", borderRadius: 6 }}>
              <Pencil size={16} />
            </button>
          )}

          {/* Study timer */}
          <button onClick={() => setTimerOpen(p => !p)} title="Temporizador de estudio"
            aria-label="Abrir temporizador Pomodoro"
            style={{ background: timerOpen ? "rgba(42,140,122,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: timerOpen ? T.tealAccent : "#b4d9d1", display: "flex", borderRadius: 6 }}>
            <Timer size={16} />
          </button>

          {/* Reading settings — student only */}
          {!isEditing && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setSettingsPanelOpen(p => !p)} title="Configuración de lectura"
                aria-label="Abrir configuración de lectura: tamaño, fuente, enfoque"
                style={{ background: settingsPanelOpen ? "rgba(42,140,122,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: settingsPanelOpen ? T.tealAccent : "#b4d9d1", display: "flex", borderRadius: 6 }}>
                <Settings2 size={16} />
              </button>
              {settingsPanelOpen && <ReadingSettingsPanel settings={readingSettings} onChange={setReadingSettings} onClose={() => setSettingsPanelOpen(false)} T={T} />}
            </div>
          )}

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(p => !p)} title="Outline"
            aria-label={sidebarOpen ? "Ocultar panel de estructura" : "Mostrar panel de estructura"}
            style={{ background: sidebarOpen ? "rgba(42,140,122,0.15)" : "none", border: "none", padding: 6, cursor: "pointer", color: sidebarOpen ? T.tealAccent : "#b4d9d1", display: "flex", borderRadius: 6 }}>
            <PanelLeftOpen size={16} />
          </button>

          {/* Dark mode */}
          <button onClick={() => setDark(d => !d)} title="Tema" aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            style={{ background: "none", border: "none", padding: 6, cursor: "pointer", color: "#b4d9d1", display: "flex", borderRadius: 6 }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div style={{ width: 1, height: 20, background: "#6b9e95", margin: "0 4px" }} />

          {/* Mastery toggle */}
          <button onClick={() => setShowMastery(p => !p)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, border: `1px solid ${showMastery ? T.tealAccent : "#6b9e95"}`, background: showMastery ? "rgba(42,140,122,0.15)" : "transparent", color: showMastery ? T.tealAccent : "#b4d9d1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            <Activity size={13} /> Mastery
          </button>

          {/* Mode toggle */}
          <button onClick={() => setIsEditing(p => !p)}
            aria-label={isEditing ? "Cambiar a modo alumno" : "Cambiar a modo editor"}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, border: "none", background: isEditing ? T.tealAccent : "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {isEditing ? <><Eye size={13} /> Alumno</> : <><Edit3 size={13} /> Editor</>}
          </button>
        </div>
      </header>

      {/* ── Search bar ── */}
      {searchOpen && <SearchBar query={searchQuery} onQueryChange={setSearchQuery} resultCount={searchResults.length} onClose={() => { setSearchOpen(false); setSearchQuery(""); }} T={T} />}

      {/* ── Main layout with sidebar ── */}
      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <SidebarOutline blocks={blocks} activeBlockId={activeBlockId} onBlockClick={scrollToBlock} isEditing={isEditing} T={T}
            collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
        )}

        {/* Content */}
        <div id="summary-content" style={{ flex: 1, minWidth: 0 }} tabIndex={-1}>
          {/* Summary header */}
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 20px 0" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: T.teal50, color: T.tealAccent, padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>Cardiología</span>
              <span style={{ fontSize: 11, background: "#fef2f2", color: "#ef4444", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>Alta relevancia</span>
              <span style={{ fontSize: 11, background: T.pageBg, color: T.textTertiary, padding: "3px 10px", borderRadius: 10, border: `1px solid ${T.border}` }}>~15 min lectura</span>
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, color: T.darkTeal, margin: "0 0 6px", lineHeight: 1.2 }}>Aterosclerosis</h1>
            <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 6px" }}>Enfermedad inflamatoria crónica — fisiopatología, diagnóstico diferencial y manejo terapéutico</p>
            <div style={{ fontSize: 12, color: T.textTertiary, marginBottom: 8 }}>{blocks.length} bloques · {Object.keys(SAMPLE_KEYWORDS).length} keywords</div>

            {showMastery && (
              <div style={{ display: "flex", gap: 10, padding: "8px 14px", background: T.cardBg, borderRadius: 10, border: `1px solid ${T.border}`, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: T.textTertiary, fontWeight: 600, marginRight: 4 }}>Tu dominio:</span>
                {Object.values(dark ? MASTERY_DARK : MASTERY).map((m, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.border }} />
                    <span style={{ color: m.text, fontWeight: 600 }}>{m.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Blocks */}
          <div style={{
            maxWidth: 800, margin: "0 auto", padding: isEditing ? "16px 20px 60px" : "0 20px 60px",
            fontSize: isEditing ? undefined : readingSettings.fontSize,
            lineHeight: isEditing ? undefined : readingSettings.lineHeight,
            fontFamily: isEditing ? undefined : readingSettings.fontFamily,
            ...(isEditing ? {} : {
              background: T.cardBg, borderRadius: 20, padding: "28px 32px 48px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 12,
              border: `1px solid ${T.border}`,
            }),
          }}>
            {isEditing && <InsertBlockButton onInsert={(type) => insertBlock(-1, type)} T={T} />}

            {/* Empty state when search has no results */}
            {searchQuery && visibleBlocks.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <Search size={36} color={T.textTertiary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>Sin resultados</div>
                <div style={{ fontSize: 13, color: T.textTertiary }}>No se encontraron bloques con &ldquo;{searchQuery}&rdquo;</div>
              </div>
            )}

            {visibleBlocks.map((block, i) => {
              const realIdx = blocks.findIndex(b => b.id === block.id);
              return (
                <div key={block.id}
                  draggable={isEditing}
                  onDragStart={() => handleDragStart(realIdx)}
                  onDragOver={(e) => handleDragOver(e, realIdx)}
                  onDrop={() => handleDrop(realIdx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  style={{ borderTop: dragOverIdx === realIdx && dragIdx !== realIdx ? `2px solid ${T.tealAccent}` : "2px solid transparent" }}
                >
                  <div onMouseUp={() => highlightMode && handleTextSelect(block.id)}
                    style={!isEditing && readingSettings.focusMode && activeBlockId !== block.id ? { opacity: 0.2, filter: "blur(1px)", transition: "opacity 0.5s ease, filter 0.5s ease" } : { opacity: 1, filter: "none", transition: "opacity 0.5s ease, filter 0.5s ease" }}
                    role="article" aria-label={`Bloque ${realIdx + 1}: ${block.title || block.type}`}>
                    <BlockWrapper
                      block={block} index={realIdx} total={blocks.length}
                      isEditing={isEditing}
                      masteryLevel={blockMastery[block.id] || 0.5}
                      showMastery={showMastery}
                      onDelete={deleteBlock} onDuplicate={duplicateBlock}
                      onMoveUp={moveUp} onMoveDown={moveDown}
                      onGenerateQuiz={(id) => setQuizBlock(blocks.find(b => b.id === id))}
                      onUpdateBlock={updateBlockProps}
                      T={T} dark={dark}
                      isDragging={dragIdx === realIdx}
                      dragHandleProps={{ draggable: true, role: "button", tabIndex: 0, "aria-roledescription": "sortable", "aria-label": `Arrastrar bloque ${realIdx + 1}`, onKeyDown: (e) => { if (e.key === "ArrowUp") { e.preventDefault(); moveUp(realIdx); } else if (e.key === "ArrowDown") { e.preventDefault(); moveDown(realIdx); } } }}
                    >
                      {renderBlock(block)}

                      {/* Student toolbar: bookmark + TTS + draw */}
                      {!isEditing && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}` }}
                          role="toolbar" aria-label="Herramientas del bloque">
                          <BookmarkButton isBookmarked={bookmarks.includes(block.id)} onToggle={() => toggleBookmark(block.id)} T={T} />
                          <TTSButton text={extractBlockText(block)} T={T} />
                          <button onClick={() => setDrawingBlockId(drawingBlockId === block.id ? null : block.id)}
                            title="Dibujar sobre este bloque" aria-label="Abrir canvas de dibujo"
                            style={{ background: drawingBlockId === block.id ? "rgba(239,68,68,0.1)" : "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: drawingBlockId === block.id ? "#ef4444" : T.textTertiary, borderRadius: 6 }}>
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setAnnotatingBlockId(annotatingBlockId === block.id ? null : block.id)}
                            title="Anotar este bloque" aria-label="Agregar nota a este bloque"
                            style={{ background: annotatingBlockId === block.id ? "rgba(42,140,122,0.1)" : "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: annotatingBlockId === block.id ? T.tealAccent : T.textTertiary, borderRadius: 6, position: "relative" }}>
                            <MessageSquare size={15} />
                            {(() => { const count = annotations.filter(a => a.blockId === block.id).length; return count > 0 ? (
                              <span style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: T.tealAccent, color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {count}
                              </span>) : null; })()}
                          </button>
                        </div>
                      )}

                      {/* Drawing canvas for this block */}
                      {!isEditing && drawingBlockId === block.id && (
                        <DrawingCanvas blockId={block.id} onClose={() => setDrawingBlockId(null)} T={T} />
                      )}

                      {/* Student highlights for this block */}
                      {!isEditing && highlights.filter(h => h.blockId === block.id).length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {highlights.filter(h => h.blockId === block.id).map(hl => (
                            <span key={hl.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: dark ? hl.darkColor : hl.color, fontSize: 11, color: T.textSecondary, cursor: "default" }}>
                              <Highlighter size={10} />
                              {hl.text.length > 40 ? hl.text.slice(0, 40) + "…" : hl.text}
                              <button onClick={() => setHighlights(p => p.filter(h => h.id !== hl.id))}
                                aria-label="Eliminar highlight"
                                style={{ background: "none", border: "none", cursor: "pointer", color: T.textTertiary, padding: 0, display: "flex", marginLeft: 2 }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Annotations panel for this block */}
                      {!isEditing && annotatingBlockId && (annotatingBlockId === "__all__" || annotatingBlockId === block.id) && (
                        <AnnotationsPanel annotations={annotations} blockId={block.id} onAdd={addAnnotation} onDelete={deleteAnnotation} T={T} />
                      )}
                    </BlockWrapper>
                  </div>
                  {isEditing && <InsertBlockButton onInsert={(type) => insertBlock(realIdx, type)} T={T} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Highlight floating toolbar */}
      <HighlightToolbar position={highlightToolbar} T={T}
        onHighlight={(color) => addHighlight(highlightToolbar.blockId, highlightToolbar.text, color)}
        onAnnotate={() => { setAnnotatingBlockId(highlightToolbar.blockId); setHighlightToolbar(null); }}
        onClose={() => setHighlightToolbar(null)} />

      {/* Highlight mode indicator */}
      {highlightMode && !isEditing && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "#eab308", color: "#422006", padding: "8px 20px", borderRadius: 20,
          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(234,179,8,0.3)", zIndex: 400
        }}>
          <Highlighter size={14} /> Modo marca texto — seleccioná texto para resaltar
          <button onClick={() => setHighlightMode(false)}
            style={{ background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 10, padding: "2px 8px", cursor: "pointer", color: "#422006", fontSize: 11, fontWeight: 600 }}>
            ESC
          </button>
        </div>
      )}

      {/* Study Timer */}
      {timerOpen && <StudyTimer T={T} onClose={() => setTimerOpen(false)} />}

      {/* Drawing mode indicator */}
      {drawingBlockId === "__prompt__" && !isEditing && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "#ef4444", color: "#fff", padding: "8px 20px", borderRadius: 20,
          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(239,68,68,0.3)", zIndex: 400
        }} role="status">
          <Pencil size={14} /> Hacé click en el icono <Pencil size={12} /> de cualquier bloque para abrir el canvas
          <button onClick={() => setDrawingBlockId(null)}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10, padding: "2px 8px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600 }}>
            ESC
          </button>
        </div>
      )}

      {/* Focus mode indicator */}
      {readingSettings.focusMode && !isEditing && (
        <div style={{
          position: "fixed", bottom: 20, left: 20, background: T.tealAccent, color: "#fff",
          padding: "6px 14px", borderRadius: 16, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 12px rgba(42,140,122,0.3)", zIndex: 400
        }} role="status">
          <Eye size={12} /> Modo enfoque activo
        </div>
      )}

      {/* Quiz Modal */}
      {quizBlock && <QuizModal block={quizBlock} onClose={() => setQuizBlock(null)} onAnswer={(correct) => handleQuizAnswer(quizBlock.id, correct)} T={T} />}
    </div>
  );
}
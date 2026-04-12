'use client';
import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, Play, Sparkles, Plus, User, Eye, EyeOff,
  Layers, X, Loader2, Check, CheckCircle, Brain, MoreVertical, Flag,
  PenLine, Trophy, Pencil,
} from 'lucide-react';

type Screen = 'deck' | 'create-manual' | 'create-ai' | 'ai-preview' | 'session' | 'summary';
type CardSource = 'official' | 'personal';

interface Card {
  id: string;
  question: string;
  answer: string;
  mastery: number;
  source: CardSource;
}

interface AICard {
  question: string;
  answer: string;
}

const KEYWORDS = ['Anatomía cardíaca', 'Fisiología cardiovascular', 'Hemodinámica', 'Sistema vascular', 'General'];

const MASTERY = [
  { hex: '#94a3b8', bg: 'bg-slate-400', bgLight: 'bg-slate-50', text: 'text-slate-500', label: 'Nueva' },
  { hex: '#f43f5e', bg: 'bg-rose-500', bgLight: 'bg-rose-50', text: 'text-rose-600', label: 'No sabe' },
  { hex: '#f97316', bg: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-600', label: 'Difícil' },
  { hex: '#f59e0b', bg: 'bg-amber-500', bgLight: 'bg-amber-50', text: 'text-amber-600', label: 'En progreso' },
  { hex: '#14b8a6', bg: 'bg-teal-500', bgLight: 'bg-teal-50', text: 'text-teal-600', label: 'Bien' },
  { hex: '#10b981', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', text: 'text-emerald-600', label: 'Dominada' },
];

const OFFICIAL_CARDS: Card[] = [
  { id: 'off-1', question: '¿Cuáles son las 4 cavidades del corazón?', answer: 'Aurícula derecha, aurícula izquierda, ventrículo derecho y ventrículo izquierdo', mastery: 5, source: 'official' as const },
  { id: 'off-2', question: '¿Qué es la sístole?', answer: 'Fase de contracción del ciclo cardíaco donde el corazón bombea sangre', mastery: 4, source: 'official' as const },
  { id: 'off-3', question: '¿Cuál es la función del nodo sinoauricular?', answer: 'Marcapasos natural del corazón, genera impulsos eléctricos que inician la contracción', mastery: 4, source: 'official' as const },
  { id: 'off-4', question: '¿Qué arteria irriga el miocardio?', answer: 'Las arterias coronarias (izquierda y derecha)', mastery: 3, source: 'official' as const },
  { id: 'off-5', question: '¿Cuáles son las capas del corazón?', answer: 'Endocardio (interna), miocardio (muscular media) y epicardio (externa)', mastery: 3, source: 'official' as const },
  { id: 'off-6', question: '¿Qué es la diástole?', answer: 'Fase de relajación del ciclo cardíaco donde las cavidades se llenan de sangre', mastery: 3, source: 'official' as const },
  { id: 'off-7', question: '¿Qué válvula separa la aurícula izquierda del ventrículo izquierdo?', answer: 'Válvula mitral (bicúspide)', mastery: 2, source: 'official' as const },
  { id: 'off-8', question: '¿Cuál es el gasto cardíaco normal en reposo?', answer: 'Aproximadamente 5 litros por minuto (FC × Vol. sistólico)', mastery: 2, source: 'official' as const },
  { id: 'off-9', question: '¿Qué es la precarga?', answer: 'Volumen de sangre que llena el ventrículo al final de la diástole (volumen telediastólico)', mastery: 1, source: 'official' as const },
  { id: 'off-10', question: '¿Qué ley describe la relación entre precarga y fuerza de contracción?', answer: 'Ley de Frank-Starling: a mayor estiramiento de las fibras, mayor fuerza de contracción', mastery: 0, source: 'official' as const },
  { id: 'off-11', question: '¿Qué es la postcarga?', answer: 'Resistencia que debe vencer el ventrículo para eyectar la sangre (presión aórtica)', mastery: 0, source: 'official' as const },
  { id: 'off-12', question: '¿Cuáles son los ruidos cardíacos normales?', answer: 'S1 (cierre de válvulas AV) y S2 (cierre de válvulas semilunares)', mastery: 0, source: 'official' as const },
];

const INITIAL_MY_CARDS: Card[] = [
  { id: 'my-1', question: '¿Cuál es la diferencia entre arterias elásticas y musculares?', answer: 'Las elásticas (aorta) tienen más elastina para absorber presión; las musculares tienen más músculo liso para regular flujo', mastery: 2, source: 'personal' as const },
  { id: 'my-2', question: 'Mnemotecnia: capas del corazón', answer: 'END-MIO-EPI: de adentro hacia afuera (ENDo, MIOcardio, EPIcardio)', mastery: 4, source: 'personal' as const },
];

const AI_GENERATED_CARDS: AICard[] = [
  { question: '¿Cuáles son las 3 capas de una arteria?', answer: 'Túnica íntima (endotelio), túnica media (músculo liso) y túnica adventicia (tejido conectivo)' },
  { question: '¿Por qué las venas tienen válvulas y las arterias no?', answer: 'Las venas trabajan contra la gravedad con baja presión. Las válvulas previenen el reflujo. Las arterias no las necesitan por la alta presión del bombeo cardíaco.' },
  { question: '¿Qué es la vasoconstricción?', answer: 'Contracción del músculo liso de la pared vascular que reduce el diámetro del vaso y aumenta la resistencia al flujo sanguíneo' },
  { question: '¿Cuál es la diferencia principal entre circulación mayor y menor?', answer: 'Mayor (sistémica): VI → aorta → tejidos → venas cavas → AD. Menor (pulmonar): VD → arteria pulmonar → pulmones → venas pulmonares → AI' },
  { question: '¿Qué factores regulan la presión arterial?', answer: 'Gasto cardíaco × resistencia vascular periférica. Regulado por: barorreceptores, SRAA, sistema nervioso simpático, y factores locales' },
];

const RATINGS = [
  { value: 1, label: 'No sé', color: 'bg-rose-500', hover: 'hover:bg-rose-600', desc: 'Repetir pronto' },
  { value: 2, label: 'Difícil', color: 'bg-orange-500', hover: 'hover:bg-orange-600', desc: 'Necesito repasar' },
  { value: 3, label: 'Regular', color: 'bg-yellow-400', hover: 'hover:bg-yellow-500', desc: 'Algo de duda' },
  { value: 4, label: 'Fácil', color: 'bg-lime-500', hover: 'hover:bg-lime-600', desc: 'Lo entendí bien' },
  { value: 5, label: 'Perfecto', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', desc: 'Memorizado' },
];

export default function FlashcardCreationPrototype() {
  const [screen, setScreen] = useState<Screen>('deck');
  const [myCards, setMyCards] = useState<Card[]>(INITIAL_MY_CARDS);
  const [toast, setToast] = useState<string | null>(null);

  // Create manual state
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualKeyword, setManualKeyword] = useState(KEYWORDS[0]);
  const [showPreview, setShowPreview] = useState(false);

  // Create AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);

  // AI preview state
  const [aiSelected, setAiSelected] = useState<boolean[]>(AI_GENERATED_CARDS.map(() => true));

  // Session state
  const [sessionIndex, setSessionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<number[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Deck filter
  const [activeFilter, setActiveFilter] = useState('all');

  const allCards = [...myCards, ...OFFICIAL_CARDS];
  const sessionCards = allCards.slice(0, 6);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const resetManual = () => { setManualFront(''); setManualBack(''); setManualKeyword(KEYWORDS[0]); setShowPreview(false); };
  const resetAi = () => { setAiPrompt(''); setAiCount(5); setAiLoading(false); };
  const resetSession = () => { setSessionIndex(0); setRevealed(false); setSessionRatings([]); setShowMenu(false); setShowNote(false); setNoteText(''); };

  const goTo = (s: Screen) => {
    if (s === 'create-manual') resetManual();
    if (s === 'create-ai') resetAi();
    if (s === 'ai-preview') setAiSelected(AI_GENERATED_CARDS.map(() => true));
    if (s === 'session') resetSession();
    setScreen(s);
  };

  // Mastery stats
  const masteredCount = allCards.filter(c => c.mastery >= 4).length;
  const learningCount = allCards.filter(c => c.mastery >= 2 && c.mastery <= 3).length;
  const reviewCount = allCards.filter(c => c.mastery <= 1).length;
  const totalCount = allCards.length;

  const filteredOfficial = OFFICIAL_CARDS.filter(c => {
    if (activeFilter === 'review') return c.mastery <= 1;
    if (activeFilter === 'learning') return c.mastery >= 2 && c.mastery <= 3;
    if (activeFilter === 'mastered') return c.mastery >= 4;
    return true;
  });
  const filteredPersonal = myCards.filter(c => {
    if (activeFilter === 'review') return c.mastery <= 1;
    if (activeFilter === 'learning') return c.mastery >= 2 && c.mastery <= 3;
    if (activeFilter === 'mastered') return c.mastery >= 4;
    return true;
  });

  // --- MINI CARD ---
  function MiniCard({ card, isPersonal }: { card: Card; isPersonal?: boolean }) {
    const m = MASTERY[card.mastery];
    const barColor = isPersonal ? '#14b8a6' : m.hex;
    const idx = allCards.findIndex(c => c.id === card.id) + 1;
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: barColor }} />
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: barColor }}>{idx}</span>
            <div className="flex gap-0.5">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`w-1 h-2.5 rounded-full ${i < card.mastery ? '' : 'bg-gray-200'}`} style={i < card.mastery ? { backgroundColor: m.hex } : {}} />
              ))}
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-800 line-clamp-3 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{card.question}</p>
          <p className="text-[11px] text-gray-400 line-clamp-2">{card.answer}</p>
          <div className="mt-2">
            {isPersonal ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 font-medium">Personal</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">Oficial ✓</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- TOAST ---
  const ToastEl = toast ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-lg animate-pulse">
      {toast}
    </div>
  ) : null;

  // ==================== SCREEN 1: DECK ====================
  if (screen === 'deck') {
    const filters = [
      { key: 'all', label: `Todos (${totalCount})` },
      { key: 'review', label: `A revisar (${reviewCount})` },
      { key: 'learning', label: `Aprendiendo (${learningCount})` },
      { key: 'mastered', label: `Dominados (${masteredCount})` },
    ];
    const emeraldPct = (masteredCount / totalCount) * 100;
    const amberPct = (learningCount / totalCount) * 100;
    const rosePct = (reviewCount / totalCount) * 100;

    return (
      <div className="min-h-screen bg-zinc-50">
        {ToastEl}
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 pb-3 pt-3">
          <div className="text-xs text-gray-400 flex items-center gap-1 mb-1">
            Flashcards <ChevronRight size={12} /> Anatomía <ChevronRight size={12} /> Sistema Cardiovascular
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button className="p-1 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} className="text-gray-500" /></button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Sistema Cardiovascular</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => goTo('session')} className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium" style={{ backgroundColor: '#14b8a6' }}>
                <Play size={14} /> Estudiar
              </button>
              <button onClick={() => goTo('create-ai')} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white text-sm font-medium bg-[#2a8c7a] hover:bg-[#244e47]">
                <Sparkles size={14} /> Con IA
              </button>
              <button onClick={() => goTo('create-manual')} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50">
                <Plus size={14} /> Crear
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 mb-3">
            <div className="bg-emerald-500 transition-all" style={{ width: `${emeraldPct}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${amberPct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${rosePct}%` }} />
          </div>
          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className={`text-[11px] whitespace-nowrap px-3 py-1 rounded-full font-medium transition-colors ${activeFilter === f.key ? 'bg-[#1B3B36] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 py-4 pb-24 sm:pb-4">
          {/* MY FLASHCARDS */}
          <div className="bg-white border-2 border-dashed border-teal-300/60 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-teal-600" />
                <span className="text-sm font-semibold text-gray-800">Mis Flashcards</span>
                <span className="text-xs text-gray-400">({filteredPersonal.length})</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => goTo('create-manual')} className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">Crear</button>
                <button onClick={() => goTo('create-ai')} className="text-[11px] px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium">Generar ✨</button>
              </div>
            </div>
            {filteredPersonal.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredPersonal.map(c => <MiniCard key={c.id} card={c} isPersonal />)}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No hay flashcards personales en este filtro</p>
            )}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Cards Oficiales</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Official cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredOfficial.map(c => <MiniCard key={c.id} card={c} />)}
          </div>
        </div>

        {/* MOBILE CTA */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
          <button onClick={() => goTo('session')} className="w-full py-3 rounded-full text-white font-semibold text-sm" style={{ backgroundColor: '#14b8a6' }}>
            ▶ Estudiar
          </button>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: CREATE MANUAL ====================
  if (screen === 'create-manual') {
    const canCreate = manualFront.trim() && manualBack.trim();
    const handleCreate = () => {
      if (!canCreate) return;
      const newCard: Card = {
        id: `my-${Date.now()}`,
        question: manualFront.trim(),
        answer: manualBack.trim(),
        mastery: 0,
        source: 'personal',
      };
      setMyCards(prev => [newCard, ...prev]);
      showToast('✓ Flashcard creada');
      goTo('deck');
    };

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) goTo('deck'); }}>
        {ToastEl}
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Layers size={18} className="text-[#2a8c7a]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Nueva Flashcard</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Frente (pregunta)</label>
              <textarea value={manualFront} onChange={e => setManualFront(e.target.value)} rows={3}
                className="w-full bg-[#F0F2F5] rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]"
                placeholder="Escribí la pregunta..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Dorso (respuesta)</label>
              <textarea value={manualBack} onChange={e => setManualBack(e.target.value)} rows={3}
                className="w-full bg-[#F0F2F5] rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]"
                placeholder="Escribí la respuesta..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Palabra clave</label>
              <select value={manualKeyword} onChange={e => setManualKeyword(e.target.value)}
                className="w-full bg-[#F0F2F5] rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]">
                {KEYWORDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Preview toggle */}
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-xs text-[#2a8c7a] font-medium">
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
            </button>
            {showPreview && manualFront && (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden max-w-[180px]">
                <div className="h-1 w-full bg-teal-400" />
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-3 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{manualFront}</p>
                  <p className="text-[11px] text-gray-400 line-clamp-2">{manualBack || '...'}</p>
                  <span className="mt-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 font-medium">Personal</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => goTo('deck')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
            <button onClick={handleCreate} disabled={!canCreate}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ backgroundColor: '#1B3B36' }}>
              Crear Flashcard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 3: CREATE AI ====================
  if (screen === 'create-ai') {
    const handleGenerate = () => {
      setAiLoading(true);
      setTimeout(() => {
        setAiLoading(false);
        goTo('ai-preview');
      }, 2000);
    };

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) goTo('deck'); }}>
        {ToastEl}
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Sparkles size={18} className="text-[#2a8c7a]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Generar Flashcards con IA</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">¿Sobre qué querés practicar?</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
                className="w-full bg-[#F0F2F5] rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]"
                placeholder="Ej: Sistema vascular periférico, diferencias entre arterias y venas..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Cantidad de flashcards</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map(n => (
                  <button key={n} onClick={() => setAiCount(n)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${aiCount === n ? 'bg-[#2a8c7a] text-white' : 'bg-[#F0F2F5] text-gray-600 hover:bg-gray-200'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => goTo('deck')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
            <button onClick={handleGenerate} disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold bg-[#2a8c7a] hover:bg-[#244e47] disabled:opacity-60 transition-colors">
              {aiLoading ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Sparkles size={14} /> Generar</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 4: AI PREVIEW ====================
  if (screen === 'ai-preview') {
    const selectedCount = aiSelected.filter(Boolean).length;
    const handleSave = () => {
      const newCards: Card[] = AI_GENERATED_CARDS
        .filter((_, i) => aiSelected[i])
        .map((c, i) => ({
          id: `ai-${Date.now()}-${i}`,
          question: c.question,
          answer: c.answer,
          mastery: 0,
          source: 'personal' as const,
        }));
      setMyCards(prev => [...newCards, ...prev]);
      showToast(`✓ ${newCards.length} flashcards guardadas`);
      goTo('deck');
    };

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) goTo('deck'); }}>
        {ToastEl}
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>5 Flashcards Generadas</h2>
            <p className="text-sm text-gray-500 mt-1">Revisá y seleccioná las que querés guardar</p>
          </div>

          <div className="space-y-3">
            {AI_GENERATED_CARDS.map((card, i) => (
              <div key={i} onClick={() => { const next = [...aiSelected]; next[i] = !next[i]; setAiSelected(next); }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${aiSelected[i] ? 'border-[#2a8c7a] bg-teal-50/30' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${aiSelected[i] ? 'bg-[#2a8c7a] text-white' : 'border-2 border-gray-300'}`}>
                      {aiSelected[i] && <Check size={12} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 mb-1"><span className="text-[10px] text-gray-400 font-bold mr-1.5">F:</span>{card.question}</p>
                      <p className="text-sm text-gray-500"><span className="text-[10px] text-gray-400 font-bold mr-1.5">R:</span>{card.answer}</p>
                    </div>
                  </div>
                  <Pencil size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-gray-500">{selectedCount} de 5 seleccionadas</span>
            <div className="flex gap-3">
              <button onClick={() => goTo('deck')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
              <button onClick={handleSave} disabled={selectedCount === 0}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors"
                style={{ backgroundColor: '#1B3B36' }}>
                Guardar {selectedCount} cards
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 5: SESSION ====================
  if (screen === 'session') {
    const current = sessionCards[sessionIndex];
    const progress = ((sessionIndex + (revealed ? 1 : 0)) / sessionCards.length) * 100;

    const handleRate = (value: number) => {
      const newRatings = [...sessionRatings, value];
      setSessionRatings(newRatings);
      setRevealed(false);
      setShowNote(false);
      setNoteText('');
      if (sessionIndex + 1 >= sessionCards.length) {
        setSessionRatings(newRatings);
        setScreen('summary');
      } else {
        setSessionIndex(sessionIndex + 1);
      }
    };

    return (
      <div className="h-screen flex flex-col bg-white relative">
        {ToastEl}
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <div className="h-full bg-[#2a8c7a] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={() => goTo('deck')} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
          <span className="px-3 py-1 rounded-full bg-[#F0F2F5] text-sm text-gray-600 font-medium">
            {sessionIndex + 1} / {sessionCards.length}
          </span>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-lg hover:bg-gray-100">
              <MoreVertical size={20} className="text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48 z-20">
                <button onClick={() => setShowMenu(false)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  <Flag size={14} /> Reportar error
                </button>
                <button onClick={() => { setShowMenu(false); setShowNote(!showNote); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  <PenLine size={14} /> Agregar nota
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
          {!revealed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                <Brain size={24} className="text-[#2a8c7a]" />
              </div>
              <span className="text-xs font-medium text-[#2a8c7a] mb-4">Pregunta</span>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
                {current.question}
              </p>
              <button onClick={() => setRevealed(true)}
                className="px-8 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                style={{ backgroundColor: '#1B3B36' }}>
                Mostrar Respuesta
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
              <div className="rounded-xl bg-[#F0F2F5]/80 p-4 mb-4">
                <span className="text-xs font-medium text-gray-400 mb-1 block">Pregunta</span>
                <p className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>{current.question}</p>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Respuesta</span>
                </div>
                <p className="text-base text-gray-800 leading-relaxed">{current.answer}</p>
              </div>

              {/* Note input */}
              {!showNote ? (
                <button onClick={() => setShowNote(true)} className="flex items-center gap-2 text-xs text-amber-600 font-medium mb-4">
                  <PenLine size={14} /> Agregar nota
                </button>
              ) : (
                <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
                  <label className="text-xs font-medium text-amber-700 mb-1.5 block">Tu nota</label>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
                    className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 border border-amber-200"
                    placeholder="Anotá algo para recordar..." />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rating footer */}
        {revealed && (
          <div className="bg-[#F0F2F5] px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center mb-2">¿Qué tan bien la sabías?</p>
            <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
              {RATINGS.map(r => (
                <button key={r.value} onClick={() => handleRate(r.value)}
                  className={`${r.color} ${r.hover} text-white rounded-xl py-2.5 text-center transition-colors`}>
                  <span className="text-xs font-bold block">{r.label}</span>
                  <span className="text-[9px] opacity-80 block">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== SCREEN 6: SUMMARY ====================
  if (screen === 'summary') {
    const avg = sessionRatings.length > 0 ? sessionRatings.reduce((a, b) => a + b, 0) / sessionRatings.length : 0;
    const pct = Math.round((avg / 5) * 100);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (pct / 100) * circumference;

    return (
      <div className="h-screen bg-zinc-50 flex items-center justify-center p-4">
        {ToastEl}
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-[#2a8c7a]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Sesión Completada!</h1>
          <p className="text-sm text-gray-500 mb-6">{sessionCards.length} flashcards estudiadas</p>

          {/* Donut chart */}
          <div className="relative w-36 h-36 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="#2a8c7a" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{pct}%</span>
              <span className="text-[10px] text-gray-400">dominio</span>
            </div>
          </div>

          {/* Rating breakdown */}
          <div className="flex justify-center gap-3 mb-6">
            {RATINGS.map(r => {
              const count = sessionRatings.filter(v => v === r.value).length;
              return (
                <div key={r.value} className="text-center">
                  <div className={`w-8 h-8 rounded-lg ${r.color} text-white text-sm font-bold flex items-center justify-center mx-auto mb-1`}>{count}</div>
                  <span className="text-[10px] text-gray-400">{r.label}</span>
                </div>
              );
            })}
          </div>

          {/* Low mastery banner */}
          {avg < 3.5 && (
            <button onClick={() => goTo('create-ai')}
              className="w-full mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-left flex items-center gap-3 hover:bg-amber-100 transition-colors">
              <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Crear cards de refuerzo</p>
                <p className="text-xs text-amber-600">Generá flashcards sobre lo que más te costó</p>
              </div>
            </button>
          )}

          <div className="flex gap-3">
            <button onClick={() => goTo('deck')}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Volver al Deck
            </button>
            <button onClick={() => goTo('session')}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#2a8c7a' }}>
              Practicar de Nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

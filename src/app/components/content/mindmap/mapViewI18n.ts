// ============================================================
// Axon — KnowledgeMapView I18N strings
//
// Extracted from KnowledgeMapView.tsx, useMapToolState.ts,
// and useMapStickyNotes.ts to centralise all translated strings.
// ============================================================

import type { GraphLocale } from './graphI18n';

export interface MapViewI18nStrings {
  // ── Toast messages ───────────────────────────────────────
  connectionCancelled: string;
  deleteOnlyUserCreated: string;
  connectSourceSelected: (label: string) => string;
  deleteNodeError: string;
  selfLoopError: string;
  duplicateEdgeError: string;
  edgeReconnected: (src: string, tgt: string) => string;
  reconnectEdgeError: string;
  maxStickyNotes: string;

  // ── Empty / error states ─────────────────────────────────
  untitled: string;
  pageTitle: string;
  selectTopicPrompt: string;
  selectTopicPlaceholder: string;
  noTopicsAvailable: string;
  allTopics: string;
  mapFallbackLabel: string;
  noCourseConceptsTitle: string;
  noCourseConceptsNoTopics: string;
  noCourseConceptsEmpty: string;
  pageSubtitle: string;
  noConceptsTitle: string;
  noConceptsDescription: string;

  // ── Search ───────────────────────────────────────────────
  srNoResults: string;
  srResultsFound: (count: number, query: string) => string;
  searchNoResults: string;
  searchTryAnother: string;

  // ── Graph error boundary ─────────────────────────────────
  graphRenderError: string;
  retry: string;

  // ── Collapsed hint ───────────────────────────────────────
  allCollapsed: string;
  expandAll: string;

  // ── Sticky notes error ───────────────────────────────────
  stickyNotesError: string;

  // ── Connect indicator ────────────────────────────────────
  selectTarget: string;
  cancelConnection: string;

  // ── Panel errors ─────────────────────────────────────────
  aiPanelError: string;
  historyPanelError: string;
  comparisonPanelError: string;
  annotationError: string;
  contextMenuError: string;
  formError: string;
  shareError: string;
  confirmDialogError: string;
  presentationError: string;

  // ── Onboarding ───────────────────────────────────────────
  onboardingAriaLabel: string;
  onboardingTitle: string;
  onboardingTip1: string;
  onboardingTip2: string;
  onboardingTip3: string;
  onboardingDismiss: string;

  // ── Confirm delete dialog ────────────────────────────────
  deleteDialogTitle: string;
  deleteDialogDescription: (label: string) => string;
  cancel: string;
  deleteLabel: string;

  // ── Misc ─────────────────────────────────────────────────
  close: string;
  exit: string;
}

export const I18N_MAP_VIEW: Record<GraphLocale, MapViewI18nStrings> = {
  pt: {
    // Toasts
    connectionCancelled: 'Conexão cancelada',
    deleteOnlyUserCreated: 'Você só pode excluir conceitos criados por você',
    connectSourceSelected: (label) => `Origem: "${label}" — Agora selecione o destino`,
    deleteNodeError: 'Erro ao excluir conceito',
    selfLoopError: 'Você não pode conectar um nó a ele mesmo',
    duplicateEdgeError: 'Já existe uma conexão entre esses nós',
    edgeReconnected: (src, tgt) => `Conexão reconectada: ${src} → ${tgt}`,
    reconnectEdgeError: 'Erro ao reconectar aresta',
    maxStickyNotes: 'Máximo 10 notas por tema',

    // Empty / error states
    untitled: 'Sem título',
    pageTitle: 'Mapa de Conhecimento',
    selectTopicPrompt: 'Selecione um tema para ver seu mapa de conhecimento.',
    selectTopicPlaceholder: 'Selecionar tema...',
    noTopicsAvailable: 'Nenhum tema disponível. Acesse um curso primeiro.',
    allTopics: 'Todos os temas',
    mapFallbackLabel: 'Mapa',
    noCourseConceptsTitle: 'Nenhum conceito no curso',
    noCourseConceptsNoTopics: 'Este curso não tem temas. Acesse um curso com conteúdo primeiro.',
    noCourseConceptsEmpty: 'Os temas deste curso ainda não têm conceitos mapeados. Estude mais para construir seu mapa!',
    pageSubtitle: 'Visualize seu domínio de cada conceito',
    noConceptsTitle: 'Nenhum conceito encontrado',
    noConceptsDescription: 'Este tema ainda não tem palavras-chave com conexões. Estude mais para construir seu mapa!',

    // Search
    srNoResults: 'Nenhum conceito encontrado',
    srResultsFound: (count, query) => `${count} conceitos encontrados para "${query}"`,
    searchNoResults: 'Nenhum conceito encontrado',
    searchTryAnother: 'Tente buscar outro termo',

    // Graph error
    graphRenderError: 'Erro ao renderizar o grafo.',
    retry: 'Tentar novamente',

    // Collapsed
    allCollapsed: 'Todos os ramos estão recolhidos',
    expandAll: 'Expandir tudo',

    // Sticky notes
    stickyNotesError: 'Erro nas notas',

    // Connect indicator
    selectTarget: ' → Selecione o destino',
    cancelConnection: 'Cancelar conexão',

    // Panel errors
    aiPanelError: 'Erro ao carregar o painel de IA.',
    historyPanelError: 'Erro ao carregar o histórico.',
    comparisonPanelError: 'Erro ao carregar a comparação.',
    annotationError: 'Erro ao carregar a anotação.',
    contextMenuError: 'Erro no menu contextual',
    formError: 'Erro ao carregar o formulário.',
    shareError: 'Erro ao carregar compartilhamento',
    confirmDialogError: 'Erro ao mostrar o diálogo de confirmação.',
    presentationError: 'Erro no modo apresentação.',

    // Onboarding
    onboardingAriaLabel: 'Boas-vindas ao mapa de conhecimento',
    onboardingTitle: 'Bem-vindo ao Mapa de Conhecimento!',
    onboardingTip1: 'Toque em um conceito para ver flashcards, quiz e resumo.',
    onboardingTip2: 'As cores indicam seu domínio: verde = dominado, amarelo = aprendendo, vermelho = fraco.',
    onboardingTip3: 'Pinça para zoom, arraste para mover. Use a barra de busca para encontrar conceitos.',
    onboardingDismiss: 'Entendi!',

    // Confirm delete
    deleteDialogTitle: 'Excluir conceito?',
    deleteDialogDescription: (label) => `\u201c${label}\u201d será excluído do seu mapa. Você pode desfazer com Ctrl+Z.`,
    cancel: 'Cancelar',
    deleteLabel: 'Excluir',

    // Misc
    close: 'Fechar',
    exit: 'Sair',
  },

  es: {
    // Toasts
    connectionCancelled: 'Conexión cancelada',
    deleteOnlyUserCreated: 'Solo puedes eliminar conceptos creados por ti',
    connectSourceSelected: (label) => `Origen: "${label}" — Ahora selecciona el destino`,
    deleteNodeError: 'Error al eliminar concepto',
    selfLoopError: 'No puedes conectar un nodo a sí mismo',
    duplicateEdgeError: 'Ya existe una conexión entre esos nodos',
    edgeReconnected: (src, tgt) => `Conexión reconectada: ${src} → ${tgt}`,
    reconnectEdgeError: 'Error al reconectar arista',
    maxStickyNotes: 'Máximo 10 notas por tema',

    // Empty / error states
    untitled: 'Sin título',
    pageTitle: 'Mapa de Conocimiento',
    selectTopicPrompt: 'Selecciona un tema para ver tu mapa de conocimiento.',
    selectTopicPlaceholder: 'Seleccionar tema...',
    noTopicsAvailable: 'Ningún tema disponible. Accede a un curso primero.',
    allTopics: 'Todos los temas',
    mapFallbackLabel: 'Mapa',
    noCourseConceptsTitle: 'Ningún concepto en el curso',
    noCourseConceptsNoTopics: 'Este curso no tiene temas. Accede a un curso con contenido primero.',
    noCourseConceptsEmpty: 'Los temas de este curso aún no tienen conceptos mapeados. ¡Estudia más para construir tu mapa!',
    pageSubtitle: 'Visualiza tu dominio de cada concepto',
    noConceptsTitle: 'Ningún concepto encontrado',
    noConceptsDescription: 'Este tema aún no tiene palabras clave con conexiones. ¡Estudia más para construir tu mapa!',

    // Search
    srNoResults: 'Ningún concepto encontrado',
    srResultsFound: (count, query) => `${count} conceptos encontrados para "${query}"`,
    searchNoResults: 'Ningún concepto encontrado',
    searchTryAnother: 'Intenta buscar otro término',

    // Graph error
    graphRenderError: 'Error al renderizar el grafo.',
    retry: 'Intentar de nuevo',

    // Collapsed
    allCollapsed: 'Todas las ramas están colapsadas',
    expandAll: 'Expandir todo',

    // Sticky notes
    stickyNotesError: 'Error en las notas',

    // Connect indicator
    selectTarget: ' → Selecciona el destino',
    cancelConnection: 'Cancelar conexión',

    // Panel errors
    aiPanelError: 'Error al cargar el panel de IA.',
    historyPanelError: 'Error al cargar el historial.',
    comparisonPanelError: 'Error al cargar la comparación.',
    annotationError: 'Error al cargar la anotación.',
    contextMenuError: 'Error en el menú contextual',
    formError: 'Error al cargar el formulario.',
    shareError: 'Error al cargar compartir',
    confirmDialogError: 'Error al mostrar el diálogo de confirmación.',
    presentationError: 'Error en el modo presentación.',

    // Onboarding
    onboardingAriaLabel: 'Bienvenida al mapa de conocimiento',
    onboardingTitle: '¡Bienvenido al Mapa de Conocimiento!',
    onboardingTip1: 'Toca un concepto para ver flashcards, quiz y resumen.',
    onboardingTip2: 'Los colores indican tu dominio: verde = dominado, amarillo = aprendiendo, rojo = débil.',
    onboardingTip3: 'Pellizca para zoom, arrastra para mover. Usa la barra de búsqueda para encontrar conceptos.',
    onboardingDismiss: '¡Entendido!',

    // Confirm delete
    deleteDialogTitle: '¿Eliminar concepto?',
    deleteDialogDescription: (label) => `\u201c${label}\u201d será eliminado de tu mapa. Puedes deshacer con Ctrl+Z.`,
    cancel: 'Cancelar',
    deleteLabel: 'Eliminar',

    // Misc
    close: 'Cerrar',
    exit: 'Salir',
  },
};

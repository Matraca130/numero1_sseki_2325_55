// ============================================================
// Axon — Knowledge Graph I18N strings
//
// Extracted from KnowledgeGraph.tsx to reduce file size.
// Contains all translated strings used by the graph canvas.
// ============================================================

export type GraphLocale = 'pt' | 'es';

export interface GraphI18nStrings {
  noData: string; mastery: string; ariaLabel: string; ariaRoleDesc: string;
  srDesc: string; nCollapsed: (n: number) => string; allExpanded: string;
  mobileHint: string; fitView: string; shortcuts: string; search: string;
  closeShortcuts: string; shortcutDialog: string;
  nSelected: (n: number) => string; deleteSelection: string; connect: string;
  deselect: string; shiftClickHint: string;
  masteryLow: string; masteryMid: string; masteryHigh: string; masteryNone: string;
  masteryLegend: string;
  quickAdd: string; focusedNode: (label: string) => string;
  groupSelection: string; focusSelection: string;
  groupLabel: (n: number) => string;
  breadcrumbRoot: string; breadcrumbNav: string;
  reviewAlert: string;
  srNodeListLabel: string;
  srNodeItem: (name: string, mastery: number, connections: number) => string;
  keys: [string, string][];
  /** Mobile gesture guide */
  gestureGuideTitle: string;
  gestures: [string, string][];
  /** Drag-connect strings (from useDragConnect) */
  dragConnectTo: string;
  dragSameNode: string;
  dragAlreadyConnected: string;
  dragQuickConnectTitle: string;
  /** Export error strings (from useGraphControls) */
  exportPngError: string;
  exportJpegError: string;
}

export const I18N_GRAPH: Record<GraphLocale, GraphI18nStrings> = {
  pt: {
    noData: 'Sem dados', mastery: 'Dominio',
    ariaLabel: 'Mapa de conhecimento interativo', ariaRoleDesc: 'grafo de conhecimento',
    srDesc: 'Use Tab para navegar entre nodos, setas para mover entre vizinhos, Enter para menu de contexto, + para adicionar nodo conectado. Esc para desmarcar. ? para atalhos.',
    nCollapsed: (n) => `${n} nodos recolhidos`, allExpanded: 'Todos os nodos expandidos',
    mobileHint: 'Arraste para mover · Pinça para zoom · Mantenha para menu',
    reviewAlert: 'IA recomenda revisar',
    srNodeListLabel: 'Lista de conceitos do mapa',
    srNodeItem: (name, mastery, connections) => `${name}, dominio ${Math.round(mastery * 100)}%, ${connections} conexões`,
    fitView: 'Ajustar a vista', shortcuts: 'Atalhos', search: 'buscar',
    closeShortcuts: 'Fechar atalhos', shortcutDialog: 'Atalhos de teclado',
    nSelected: (n) => `${n} nodos selecionados`,
    deleteSelection: 'Eliminar', connect: 'Conectar', deselect: 'Deselecionar',
    shiftClickHint: 'Shift+clique para selecionar varios',
    masteryLow: 'Fraco (<50%)', masteryMid: 'Aprendendo (50-80%)',
    masteryHigh: 'Dominado (>80%)', masteryNone: 'Sem dados',
    masteryLegend: 'Dominio',
    quickAdd: 'Adicionar conceito conectado',
    focusedNode: (label) => `Nodo focado: ${label}`,
    groupSelection: 'Agrupar', focusSelection: 'Enfocar',
    groupLabel: (n) => `Grupo ${n}`,
    breadcrumbRoot: 'Mapa completo', breadcrumbNav: 'Navegação do grafo',
    keys: [['+/-', 'Zoom'], ['0 ou F', 'Ajustar vista'], ['/ ou Ctrl+F', 'Buscar conceito'],
      ['Tab', 'Navegar entre nodos'], ['Setas', 'Mover entre vizinhos'],
      ['Enter', 'Menu de contexto'], ['+', 'Adicionar nodo conectado'],
      ['Duplo-clique', 'Recolher/expandir'], ['Ctrl+[', 'Recolher todos'],
      ['Ctrl+]', 'Expandir todos'], ['Shift+clique', 'Selecionar varios'],
      ['Espaco+arrastar', 'Mover mapa'],
      ['Esc', 'Desmarcar'], ['?', 'Esta ajuda']],
    gestureGuideTitle: 'Gestos',
    gestures: [
      ['👆 Arraste', 'Mover nodos'],
      ['🤏 Pinça', 'Zoom'],
      ['👆 Mantenha', 'Menu de contexto'],
      ['👆👆 Toque duplo', 'Recolher/expandir'],
    ],
    dragConnectTo: 'Conectar a...',
    dragSameNode: 'Mesmo nó',
    dragAlreadyConnected: 'Já conectados',
    dragQuickConnectTitle: 'Conectar a partir deste nó',
    exportPngError: 'Não foi possível exportar como PNG',
    exportJpegError: 'Não foi possível exportar como JPEG',
  },
  es: {
    noData: 'Sin datos', mastery: 'Dominio',
    ariaLabel: 'Mapa de conocimiento interactivo', ariaRoleDesc: 'grafo de conocimiento',
    srDesc: 'Use Tab para navegar entre nodos, flechas para mover entre vecinos, Enter para menú contextual, + para agregar nodo conectado. Esc para deseleccionar. ? para atajos.',
    nCollapsed: (n) => `${n} nodos colapsados`, allExpanded: 'Todos los nodos expandidos',
    mobileHint: 'Arrastre para mover · Pellizque para zoom · Mantenga para menú',
    reviewAlert: 'IA recomienda revisar',
    srNodeListLabel: 'Lista de conceptos del mapa',
    srNodeItem: (name, mastery, connections) => `${name}, dominio ${Math.round(mastery * 100)}%, ${connections} conexiones`,
    fitView: 'Ajustar a la vista', shortcuts: 'Atajos', search: 'buscar',
    closeShortcuts: 'Cerrar atajos', shortcutDialog: 'Atajos de teclado',
    nSelected: (n) => `${n} nodos seleccionados`,
    deleteSelection: 'Eliminar', connect: 'Conectar', deselect: 'Deseleccionar',
    shiftClickHint: 'Shift+clic para seleccionar varios',
    masteryLow: 'Débil (<50%)', masteryMid: 'Aprendiendo (50-80%)',
    masteryHigh: 'Dominado (>80%)', masteryNone: 'Sin datos',
    masteryLegend: 'Dominio',
    quickAdd: 'Agregar concepto conectado',
    focusedNode: (label) => `Nodo enfocado: ${label}`,
    groupSelection: 'Agrupar', focusSelection: 'Enfocar',
    groupLabel: (n) => `Grupo ${n}`,
    breadcrumbRoot: 'Mapa completo', breadcrumbNav: 'Navegación del grafo',
    keys: [['+/-', 'Zoom'], ['0 o F', 'Ajustar vista'], ['/ o Ctrl+F', 'Buscar concepto'],
      ['Tab', 'Navegar entre nodos'], ['Flechas', 'Mover entre vecinos'],
      ['Enter', 'Menú contextual'], ['+', 'Agregar nodo conectado'],
      ['Doble clic', 'Colapsar/expandir'], ['Ctrl+[', 'Colapsar todos'],
      ['Ctrl+]', 'Expandir todos'], ['Shift+clic', 'Seleccionar varios'],
      ['Espacio+arrastrar', 'Mover mapa'],
      ['Esc', 'Deseleccionar'], ['?', 'Esta ayuda']],
    gestureGuideTitle: 'Gestos',
    gestures: [
      ['👆 Arrastre', 'Mover nodos'],
      ['🤏 Pellizque', 'Zoom'],
      ['👆 Mantenga', 'Menú de contexto'],
      ['👆👆 Doble toque', 'Colapsar/expandir'],
    ],
    dragConnectTo: 'Conectar a...',
    dragSameNode: 'Mismo nodo',
    dragAlreadyConnected: 'Ya conectados',
    dragQuickConnectTitle: 'Conectar desde este nodo',
    exportPngError: 'No se pudo exportar como PNG',
    exportJpegError: 'No se pudo exportar como JPEG',
  },
};

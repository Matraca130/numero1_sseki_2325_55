// ============================================================
// AXON v4.4 — AUDITORIA COMPLETA DE PERFORMANCE
// Fecha: 2026-03-06
// Scope: Frontend React (contexts, hooks, services, layouts)
//
// SEVERIDAD:
//   CRITICO  — Causa re-renders masivos o waterfalls de red medibles
//   ALTO     — Degrada UX notablemente bajo carga real
//   MEDIO    — Ineficiencia que escala con el uso
//   BAJO     — Best-practice, no urgente
//
// STATUS: Diagnostico — ninguna correccion aplicada aun
// ============================================================

// ┌─────────────────────────────────────────────────────────────┐
// │                 RESUMEN EJECUTIVO                           │
// │                                                             │
// │  19 hallazgos | 4 CRITICOS | 5 ALTOS | 6 MEDIOS | 4 BAJOS │
// │                                                             │
// │  Problema #1: Cascada de re-renders por Context sin memo    │
// │  Problema #2: Waterfall de ~12 requests secuenciales        │
// │  Problema #3: N+1 API pattern en study plans y tasks        │
// │  Problema #4: Datos duplicados entre contextos y hooks      │
// └─────────────────────────────────────────────────────────────┘

export const PERFORMANCE_FINDINGS = {

  // ================================================================
  //  CRITICO — Re-render cascades por Context values sin memoizar
  // ================================================================

  'PERF-01': {
    severity: 'CRITICO',
    title: 'AuthContext.value se recrea en CADA render — fuerza re-render de TODO el arbol',
    file: 'src/app/contexts/AuthContext.tsx',
    lines: '412-433',
    description: `
      El objeto \`value\` se construye inline dentro del render body del AuthProvider
      sin useMemo. Cada setState (loading, user, institutions, selectedInstitution)
      crea un nuevo objeto de referencia, forzando re-render de TODOS los consumidores.

      Agravante: \`memberships\` (linea 404) se recalcula con .map() en cada render,
      creando un array nuevo cada vez. \`activeMembership\` (linea 407) tambien crea
      un Membership nuevo via toMembership() en cada render.

      Impacto: AuthProvider envuelve TODO el arbol de rutas (via AuthLayout).
      Cualquier cambio en AuthProvider cascadea a toda la app.
    `,
    fix: `
      Envolver \`value\` en useMemo con deps explícitas:
        const memberships = useMemo(
          () => user ? institutions.map(i => toMembership(i, user.id)) : [],
          [user, institutions]
        );
        const activeMembership = useMemo(
          () => (user && selectedInstitution) ? toMembership(selectedInstitution, user.id) : null,
          [user, selectedInstitution]
        );
        const value = useMemo(() => ({
          user, accessToken, institutions, selectedInstitution, role, loading,
          login, signup, logout, selectInstitution,
          status, memberships, activeMembership, setActiveMembership,
          signIn: login, signUp: ..., signOut: logout,
        }), [user, accessToken, institutions, selectedInstitution, role, loading,
             login, signup, logout, selectInstitution, memberships, activeMembership,
             setActiveMembership]);
    `,
  },

  'PERF-02': {
    severity: 'CRITICO',
    title: 'PlatformDataContext.value sin useMemo — re-render en cada setState interno',
    file: 'src/app/context/PlatformDataContext.tsx',
    lines: '268-286',
    description: `
      El value del Provider se construye inline con spread + funciones.
      Cada vez que \`data\`, \`loading\`, o \`error\` cambian, se crea un objeto nuevo.
      Todos los consumers (paginas owner/admin/professor) re-renderizan.

      Ademas, la prop \`refresh\` (linea 275) es una arrow function inline
      que crea una nueva referencia en cada render, rompiendo comparaciones.
    `,
    fix: `
      1. Wrap value en useMemo
      2. La arrow function de refresh debe ser useCallback o referencia estable
    `,
  },

  'PERF-03': {
    severity: 'CRITICO',
    title: 'StudentDataContext: adaptaciones y calculo semanal corren en CADA render',
    file: 'src/app/context/StudentDataContext.tsx',
    lines: '218-238, 244-266',
    description: `
      Tres problemas:

      A) \`adaptStats(rawStats)\` y \`adaptDailyActivities(rawDaily)\` se ejecutan
         en CADA render del Provider, no solo cuando rawStats/rawDaily cambian.
         Deberian estar en useMemo.

      B) El calculo de weeklyActivity (lineas 223-238) MUTA el objeto \`stats\`
         directamente: \`stats.weeklyActivity = weekActivity\`. Esto muta el valor
         retornado por adaptStats(), creando side effects impredecibles.
         DEBE ser inmutable: crear un nuevo objeto con spread.

      C) El value del Provider (lineas 244-266) no tiene useMemo. Cada render
         del provider cascadea a StudentShell -> Dashboard -> todos los hooks
         de student.

      Impacto: StudentDataProvider envuelve todas las vistas de estudiante.
      Cada tick del timer (useSummaryTimer) o cada interaccion dispara
      re-renders de TODA la rama student.
    `,
    fix: `
      const stats = useMemo(() => adaptStats(rawStats), [rawStats]);
      const dailyActivity = useMemo(() => adaptDailyActivities(rawDaily), [rawDaily]);

      // Weekly activity como parte del useMemo, sin mutacion:
      const enrichedStats = useMemo(() => {
        if (!stats || rawDaily.length === 0) return stats;
        const weekActivity = [...]; // calculo
        return { ...stats, weeklyActivity: weekActivity };
      }, [stats, rawDaily]);

      const value = useMemo(() => ({ ... }), [enrichedStats, dailyActivity, ...]);
    `,
  },

  'PERF-04': {
    severity: 'CRITICO',
    title: 'ContentTreeContext.value sin useMemo — re-render en cada operacion CRUD',
    file: 'src/app/context/ContentTreeContext.tsx',
    lines: '203-217',
    description: `
      Cada CRUD del arbol (addCourse, addSemester, etc.) llama refresh(),
      que hace fetchTree(), que dispara setState(tree), que recrea el value
      sin useMemo, forzando re-render de todos los consumers incluyendo:
      - useTreeCourses (recalcula courses)
      - buildTopicMap en useStudyPlans (recalcula Map)
      - mapping effect en useStudyPlans (remapea TODOS los planes)

      Cadena completa: 1 CRUD -> 1 refresh -> 1 re-render ContentTree ->
      1 re-render useTreeCourses -> 1 recalculo topicMap ->
      1 re-render useStudyPlans mapping effect -> 1 re-render ScheduleView
    `,
    fix: 'Wrap value en useMemo con deps [tree, loading, error, canEdit, selectedTopicId, ...]',
  },

  // ================================================================
  //  ALTO — Network waterfalls y N+1 patterns
  // ================================================================

  'PERF-05': {
    severity: 'ALTO',
    title: 'Waterfall de ~12+ requests secuenciales en mount de StudentLayout',
    file: 'Multiples (AuthContext, StudentDataContext, ContentTreeContext, useStudyPlans, useTopicMastery, useStudyTimeEstimates)',
    lines: 'N/A',
    description: `
      Al montar StudentLayout, se disparan en secuencia (no paralelo):

      Fase 1 (AuthContext — bloqueante):
        1. supabase.auth.getSession()
        2. GET /me
        3. GET /institutions

      Fase 2 (tras auth resolve — disparo independiente pero no coordinado):
        4. GET /student-stats          (StudentDataContext)
        5. GET /daily-activities       (StudentDataContext)
        6. GET /bkt-states             (StudentDataContext)
        7. GET /content-tree           (ContentTreeContext)
        8. GET /study-plans            (useStudyPlans)
        9. N x GET /study-plan-tasks   (useStudyPlans — ver PERF-06)
        10. GET /fsrs-states           (useTopicMastery)
        11. GET /flashcards            (useTopicMastery)
        12. GET /study-sessions        (useStudyTimeEstimates)

      Las fases 4-12 se disparan en paralelo (bien), pero varias son
      duplicadas o podrian consolidarse. Ademas, 8-9 son seriales (plan primero,
      luego N tasks).

      Latencia total: ~Fase1_latency + max(Fase2_latencias) + N_tasks_serial
    `,
    fix: `
      A) Crear un endpoint batch: GET /student-dashboard-data que retorne
         stats + daily + bkt en una sola llamada.
      B) Hacer que GET /study-plans?include_tasks=true retorne planes
         CON sus tasks embebidos (elimina N+1).
      C) Considerar react-query o SWR para cache + dedup.
    `,
  },

  'PERF-06': {
    severity: 'ALTO',
    title: 'N+1 API en useStudyPlans: 1 GET plans + N GET tasks',
    file: 'src/app/hooks/useStudyPlans.ts',
    lines: '129-160',
    description: `
      fetchAll() primero llama getStudyPlans() (1 request), luego para CADA
      plan llama getStudyPlanTasks(planId) en paralelo (N requests).

      Con 5 planes activos = 6 requests. Con 10 = 11 requests.
      Cada request tiene overhead de JWT validation + cold start (edge function).

      El Promise.allSettled paralelo ayuda, pero sigue siendo N connections
      concurrentes que saturan el limite del browser (6 por dominio).
    `,
    fix: `
      Opcion A: Backend endpoint GET /study-plans?include_tasks=true
      Opcion B: Backend endpoint GET /study-plan-tasks?student_id=me (todas las tasks del user)
      Opcion C: Batch endpoint POST /study-plan-tasks/batch-read { plan_ids: [...] }
    `,
  },

  'PERF-07': {
    severity: 'ALTO',
    title: 'createPlanFromWizard dispara N requests paralelas para crear tasks',
    file: 'src/app/hooks/useStudyPlans.ts',
    lines: '294-312',
    description: `
      Al crear un plan con 30 tasks, se disparan 30 POST /study-plan-tasks
      en paralelo. Esto satura connections, puede causar rate limiting,
      y cada request tiene overhead de auth + DB write.

      Ademas, Promise.allSettled (linea 312) no reporta fallos parciales
      al usuario — si 5 de 30 tasks fallan, el plan queda incompleto silently.
    `,
    fix: `
      Backend endpoint POST /study-plan-tasks/batch-create que acepte
      un array de tasks y las cree en una sola transaccion SQL.
    `,
  },

  'PERF-08': {
    severity: 'ALTO',
    title: 'Datos duplicados: bktStates viven en StudentDataContext Y useTopicMastery los consume',
    file: 'src/app/context/StudentDataContext.tsx + src/app/hooks/useTopicMastery.ts',
    lines: 'StudentDataContext:160-163, useTopicMastery:184',
    description: `
      StudentDataContext fetcha bktStates y los guarda en state.
      useTopicMastery los consume via useStudentDataContext().bktStates.

      Pero useTopicMastery TAMBIEN fetcha por separado:
      - GET /fsrs-states (500 items)
      - GET /flashcards?status=published (500 items)

      Estos dos fetches no estan coordinados con StudentDataContext.
      Si StudentDataContext ya provee bktStates, podria tambien proveer
      fsrsStates y flashcards, evitando hooks independientes.

      Ademas, el limit de 500 items en fsrs y flashcards es arbitrario.
      Si un estudiante tiene 501 flashcards, pierde datos silently.
    `,
    fix: `
      A) Mover fsrs + flashcards fetch a StudentDataContext (o crear
         un StudentMasteryContext que los agrupe).
      B) Implementar paginacion real con cursor en los endpoints.
      C) O bien, usar un endpoint backend que compute mastery server-side.
    `,
  },

  'PERF-09': {
    severity: 'ALTO',
    title: 'AppContext.studyPlans es duplicacion de useStudyPlans — causa sincronizacion forzada',
    file: 'src/app/context/AppContext.tsx + src/app/hooks/useStudyPlans.ts',
    lines: 'AppContext:49-51, useStudyPlans:108,257-260',
    description: `
      AppContext mantiene su propia copia de studyPlans (useState en linea 101).
      useStudyPlans TAMBIEN mantiene su propia copia (useState en linea 111).

      La sincronizacion es unidireccional: useStudyPlans -> AppContext via
      syncToAppContext (linea 259). Esto significa:

      1. Dos copias de la misma data en memoria
      2. La copia de AppContext puede estar desfasada
      3. ScheduleView (que lee de AppContext) puede mostrar datos stale
      4. toggleTaskComplete en AppContext (linea 119) es el toggle LOCAL
         que no llama al backend — pero useStudyPlans tiene su propio toggle
         que SI llama al backend. Consumidores podrian usar el equivocado.

      Es una fuente de bugs sutil y de re-renders innecesarios.
    `,
    fix: `
      Eliminar studyPlans/addStudyPlan/toggleTaskComplete de AppContext.
      Que ScheduleView y DashboardView consuman useStudyPlans directamente.
      O elevar useStudyPlans a un StudyPlansContext propio.
    `,
  },

  // ================================================================
  //  MEDIO — Ineficiencias que escalan
  // ================================================================

  'PERF-10': {
    severity: 'MEDIO',
    title: 'runReschedule duplica la logica de mapping backend->frontend',
    file: 'src/app/hooks/useStudyPlans.ts',
    lines: '342-496 vs 164-261',
    description: `
      runReschedule() (lineas 371-417) re-implementa la misma logica de
      mapeo que el useEffect de lineas 172-216: iterar tasks, buscar en
      topicMap, calcular displayMethod, estMinutes, taskDate.

      Esto es intencional (evita race condition con state asincrono),
      pero son ~50 lineas duplicadas. Si la logica de mapeo cambia,
      hay que actualizar DOS lugares.
    `,
    fix: `
      Extraer una funcion pura \`mapBackendTaskToFrontend(bt, idx, bp, topicMap)\`
      y reutilizarla en ambos lugares.
    `,
  },

  'PERF-11': {
    severity: 'MEDIO',
    title: 'buildTopicMap se recalcula en cada cambio del ContentTree',
    file: 'src/app/hooks/useStudyPlans.ts',
    lines: '63-90, 122-125',
    description: `
      buildTopicMap itera todo el arbol de contenido (courses -> semesters ->
      sections -> topics) para crear un Map. Esto se ejecuta cada vez que
      \`tree\` cambia en ContentTreeContext.

      Cada operacion CRUD del arbol (agregar un topic, renombrar un semester)
      causa: fetchTree -> nuevo tree object -> nuevo topicMap -> re-run del
      mapping useEffect -> re-render de planes.

      Con 10 cursos x 5 semesters x 5 sections x 10 topics = 2,500 iteraciones.
    `,
    fix: `
      A) Mover buildTopicMap al ContentTreeContext como derivacion memoizada
      B) Usar un hashmap incremental que solo actualice los nodos cambiados
      C) O simplemente aceptar la O(n) si n < 5000 (es rapido, el problema
         es el cascading re-render, no el compute)
    `,
  },

  'PERF-12': {
    severity: 'MEDIO',
    title: 'useSummaryPersistence: save en unmount con closure stale',
    file: 'src/app/hooks/useSummaryPersistence.ts',
    lines: '158-185',
    description: `
      El useEffect de cleanup (linea 158) tiene \`[]\` como deps,
      asi que captura los valores INICIALES de textAnnotations,
      keywordMastery, personalNotes, sessionElapsed.

      El comentario en linea 160 reconoce el problema. El auto-save
      debounced (linea 131) normalmente cubre este caso, pero si el
      usuario hace un cambio y navega en <2 segundos (debounce window),
      los datos se pierden.

      Ademas, el save en unmount es fire-and-forget con .catch(() => {}),
      asi que si falla, el usuario no se entera.
    `,
    fix: `
      Opcion A: Usar useRef para almacenar los valores actuales y leerlos
      en cleanup:
        const latestRef = useRef({ textAnnotations, keywordMastery, ... });
        useEffect(() => { latestRef.current = { ... }; });
        useEffect(() => () => save(latestRef.current), []);

      Opcion B: Flush el debounce en beforeunload
    `,
  },

  'PERF-13': {
    severity: 'MEDIO',
    title: 'getInstitutionDashboardStats computa stats client-side con 2 requests',
    file: 'src/app/services/platformApi.ts',
    lines: '59-104',
    description: `
      Esta funcion simula un endpoint que no existe en el backend.
      Fetcha memberships + institution en paralelo, luego itera todos
      los members para contar roles, activos, etc.

      Con 500 miembros en una institucion, se descargan 500 objetos JSON
      para computar 5 numeros. Deberia ser un endpoint backend con COUNT()
      en SQL.
    `,
    fix: 'Crear endpoint GET /institutions/:id/stats en el backend',
  },

  'PERF-14': {
    severity: 'MEDIO',
    title: 'PlatformDataContext fetchAll trae 6 slices aunque la pagina solo necesite 1',
    file: 'src/app/context/PlatformDataContext.tsx',
    lines: '118-146',
    description: `
      fetchAll() siempre descarga institution + stats + members + plans +
      subscription + courses, aunque la pagina actual solo necesite members
      (e.g., MembersPage).

      Las funciones individuales (refreshMembers, etc.) existen pero solo
      se usan post-mutacion, no en initial load.
    `,
    fix: `
      Lazy loading: que cada pagina declare que slices necesita:
        const { members, refreshMembers } = usePlatformData(['members']);
      O simplemente aceptar el over-fetch (6 paralelos es aceptable si
      los endpoints son rapidos).
    `,
  },

  'PERF-15': {
    severity: 'MEDIO',
    title: 'Motion page transitions crean overhead en navegacion rapida',
    file: 'src/app/components/roles/StudentLayout.tsx',
    lines: '105-113',
    description: `
      Cada cambio de ruta monta un nuevo motion.div con animacion.
      Con navegacion rapida (clicks multiples en sidebar), se acumulan
      animaciones exit + enter que causan jank visual.

      El key={routeKey} es el pathname completo, lo cual es correcto
      para transiciones, pero no hay throttle ni cancelacion.
    `,
    fix: `
      A) Agregar \`mode="wait"\` con AnimatePresence para cancelar
         animaciones en progreso
      B) O simplemente remover la animacion si no es critica para UX
      C) Usar will-change: transform en el contenedor
    `,
  },

  // ================================================================
  //  BAJO — Best practices, no urgentes
  // ================================================================

  'PERF-16': {
    severity: 'BAJO',
    title: 'console.log en CADA request API — ruido en produccion',
    file: 'src/app/lib/api.ts, src/app/services/apiConfig.ts',
    lines: 'api.ts:52, apiConfig.ts:68,113',
    description: `
      Cada apiCall logea "[API] GET /path". Cada realRequest logea igual.
      En una sesion tipica con 12+ requests iniciales + interacciones,
      la consola se llena de ruido. En produccion afecta minimamente
      el rendimiento pero dificulta el debugging.
    `,
    fix: `
      Condicionar a import.meta.env.DEV:
        if (import.meta.env.DEV) console.log(\`[API] ...\`);
      O usar un logger con niveles.
    `,
  },

  'PERF-17': {
    severity: 'BAJO',
    title: 'useFlashcardEngine fire-and-forget async en useCallback',
    file: 'src/app/hooks/useFlashcardEngine.ts',
    lines: '70-80, 207-213',
    description: `
      startSession y restartSession crean async IIFEs dentro de useCallback
      para POST /study-sessions. Si el componente se desmonta antes de que
      la Promise resuelva, el setState (backendSessionId.current = session.id)
      opera sobre un ref de un componente desmontado.

      En React 18 esto no causa errores, pero el valor se pierde silently
      y las reviews subsiguientes no se asocian a ninguna session.
    `,
    fix: `
      Usar AbortController o un isMounted ref:
        const mounted = useRef(true);
        useEffect(() => () => { mounted.current = false; }, []);
        // En el async: if (mounted.current) backendSessionId.current = ...
    `,
  },

  'PERF-18': {
    severity: 'BAJO',
    title: 'Sin cache/SWR — cada navegacion refetcha todo',
    file: 'Global',
    lines: 'N/A',
    description: `
      No hay capa de cache entre los hooks y la red. Si un estudiante
      navega Dashboard -> Schedule -> Dashboard, el Dashboard re-fetcha
      student-stats, daily-activities, etc. desde cero.

      Los Contexts (StudentDataContext, ContentTreeContext) persisten
      mientras el layout este montado, pero si el usuario sale y re-entra
      a /student/*, todo se descarga de nuevo.
    `,
    fix: `
      Considerar @tanstack/react-query con staleTime: 5*60*1000 para
      datos que no cambian frecuentemente (content-tree, flashcards).
      O implementar un cache manual con TTL en los contexts.
    `,
  },

  'PERF-19': {
    severity: 'BAJO',
    title: 'AXON_TODAY hardcoded impide testing dinamico',
    file: 'src/app/utils/constants.ts',
    lines: '13',
    description: `
      AXON_TODAY = new Date(2026, 1, 7) es un valor fijo. Esto es
      correcto para el demo environment, pero:
      1. No permite testing con diferentes fechas sin editar el archivo
      2. El comentario dice "replace with new Date() for production"
         pero no hay mecanismo para hacerlo (no lee env var)
    `,
    fix: `
      export function getAxonToday(): Date {
        if (import.meta.env.VITE_AXON_TODAY) {
          return new Date(import.meta.env.VITE_AXON_TODAY);
        }
        return import.meta.env.PROD ? new Date() : new Date(2026, 1, 7);
      }
    `,
  },
};

// ================================================================
//  PLAN DE ACCION RECOMENDADO (por impacto/esfuerzo)
// ================================================================

export const ACTION_PLAN = {
  // ── Sprint 1: Quick wins (1-2 horas) ───────────────────────
  sprint1_quick_wins: {
    effort: '1-2 horas',
    impact: 'Elimina re-renders masivos',
    tasks: [
      'PERF-01: useMemo en AuthContext.value + memberships derivados',
      'PERF-02: useMemo en PlatformDataContext.value',
      'PERF-03: useMemo en StudentDataContext (adaptStats + value) + fix mutacion',
      'PERF-04: useMemo en ContentTreeContext.value',
    ],
  },

  // ── Sprint 2: Eliminar duplicacion (2-3 horas) ─────────────
  sprint2_dedup: {
    effort: '2-3 horas',
    impact: 'Simplifica data flow, reduce bugs de sync',
    tasks: [
      'PERF-09: Eliminar studyPlans de AppContext, crear StudyPlansContext o usar hook directo',
      'PERF-10: Extraer mapBackendTaskToFrontend() como funcion pura reutilizable',
    ],
  },

  // ── Sprint 3: Backend optimizations (requiere deploy) ──────
  sprint3_backend: {
    effort: '4-6 horas (backend + frontend)',
    impact: 'Reduce requests 12+ -> 5-6, elimina N+1',
    tasks: [
      'PERF-06: Endpoint GET /study-plans?include_tasks=true',
      'PERF-07: Endpoint POST /study-plan-tasks/batch-create',
      'PERF-05: Consolidar initial data fetch en menos requests',
      'PERF-13: Endpoint GET /institutions/:id/stats',
    ],
  },

  // ── Sprint 4: Polish (cuando haya tiempo) ──────────────────
  sprint4_polish: {
    effort: 'Variable',
    impact: 'Mejora incremental',
    tasks: [
      'PERF-12: Fix stale closure en useSummaryPersistence',
      'PERF-16: Condicionar console.logs a DEV',
      'PERF-18: Considerar @tanstack/react-query',
      'PERF-15: AnimatePresence mode="wait"',
    ],
  },
};

// ================================================================
//  METRICAS ESTIMADAS (antes/despues de Sprint 1)
// ================================================================

export const ESTIMATED_METRICS = {
  before: {
    re_renders_on_auth_change: '~50-80 components (todo el arbol)',
    re_renders_on_student_data_change: '~20-30 components (rama student)',
    initial_api_requests: '12+ (con N+1)',
    time_to_interactive: '~3-5s (depende de latencia edge function)',
  },
  after_sprint1: {
    re_renders_on_auth_change: '~5-10 components (solo consumers directos)',
    re_renders_on_student_data_change: '~5-8 components',
    initial_api_requests: '12+ (sin cambio — requiere Sprint 3)',
    time_to_interactive: '~2-3s (menos trabajo de re-render)',
  },
  after_sprint3: {
    initial_api_requests: '5-6 (consolidados + no N+1)',
    time_to_interactive: '~1.5-2.5s',
  },
};

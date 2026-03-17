#!/bin/bash
# Ralph Loop — Mindmap Knowledge Graph
# NO tiene limite de tiempo.
# SOLO para cuando 3 agentes QA (reviewer, designer, tester) aprueban
# con MAXIMA CALIDAD y todo funciona end-to-end.
# Para detener manualmente: Ctrl+C

START_TIME=$(date +%s)

echo "=== Ralph Loop — Mindmap Knowledge Graph ==="
echo "Rama: feature/mindmap-knowledge-graph"
echo "Inicio: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Criterio de parada: 3 QA aprueban MAXIMA CALIDAD + todo funciona E2E"
echo "Para detener manualmente: Ctrl+C"
echo ""

ROUND=1
while true; do
  # Verificar si QA ya aprobó en ronda anterior
  if [ -f ".ralph/QA_APPROVED" ]; then
    echo ""
    echo ">>> .ralph/QA_APPROVED detectado!"
    echo ">>> Los 3 agentes QA aprobaron con maxima calidad."
    echo ">>> Todo funciona end-to-end."
    break
  fi

  echo ""
  echo "========================================================"
  echo "  RONDA $ROUND — $(date '+%Y-%m-%d %H:%M:%S')"
  ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
  echo "  Tiempo transcurrido: ${ELAPSED} minutos"
  echo "========================================================"
  echo ""

  claude -p "Lee .ralph/PROMPT.md y .ralph/fix_plan.md. Eres ralph-lead, el tech leader. Ejecuta el Ralph Loop:

1. Toma las primeras 1-2 tareas pendientes [ ] del fix_plan.md
2. Implementa con MAXIMA calidad usando tus agentes (ralph-coder, ralph-feature, ralph-reviewer, ralph-tester, ralph-designer, ralph-polish)
3. Consulta C:/Users/petri/axon-backend y C:/Users/petri/axon-docs como fuente de verdad
4. Cada tarea DEBE tener tests e2e

CRITERIO DE PARADA (CRITICO):
Cuando consideres que TODAS las tareas estan completas, lanza los 3 agentes QA INDEPENDIENTES:
- ralph-reviewer: audita codigo, bugs, seguridad, tipos, performance
- ralph-designer: audita visual, premium feel, paleta, responsive
- ralph-tester: verifica que TODOS los tests pasan, cobertura e2e completa

Los 3 DEBEN reportar: MAXIMA CALIDAD, CERO issues, TODO funciona end-to-end.
Si CUALQUIERA reporta un issue, arreglalo y vuelve a pasar los 3 QA.
SOLO cuando los 3 digan que ESTA PERFECTO, crea el archivo .ralph/QA_APPROVED con:
- Todo lo implementado
- Reporte de cada QA con su aprobacion explicita
- Confirmacion de que todo funciona end-to-end
- Fecha

Si aun quedan tareas pendientes, NO crees QA_APPROVED — sigue implementando.
Al terminar la iteracion di ITERATION_DONE." \
    --dangerously-skip-permissions \
    --max-turns 120

  EXIT_CODE=$?
  ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
  echo ""
  echo ">>> Ronda $ROUND terminada (exit: $EXIT_CODE) — ${ELAPSED} min transcurridos"

  ROUND=$((ROUND + 1))
  echo ">>> Reiniciando en 10 segundos... (Ctrl+C para cancelar)"
  sleep 10
done

TOTAL_HOURS=$(echo "scale=1; ($(date +%s) - $START_TIME) / 3600" | bc 2>/dev/null || echo "?")
echo ""
echo "========================================================"
echo "  RALPH LOOP FINALIZADO"
echo "  Rondas completadas: $((ROUND - 1))"
echo "  Duracion total: ${TOTAL_HOURS} horas"
echo "  Estado: QA APROBADO — MAXIMA CALIDAD — E2E OK"
echo "========================================================"

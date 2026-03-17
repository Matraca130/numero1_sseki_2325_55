# Ralph Loop — Mindmap Knowledge Graph
# Corre INDEFINIDAMENTE hasta que 3 QA aprueben al 100%.
# Para detener manualmente: Ctrl+C

$StartTime = Get-Date

Write-Host "=== Ralph Loop — Mindmap Knowledge Graph ===" -ForegroundColor Cyan
Write-Host "Rama: feature/mindmap-knowledge-graph"
Write-Host "Inicio: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "Criterio de parada: 3 QA aprueban 100% (ralph-reviewer, ralph-designer, ralph-tester)"
Write-Host "Para detener manualmente: Ctrl+C"
Write-Host ""

$Round = 1
while ($true) {
    # Verificar si QA aprobó
    if (Test-Path ".ralph/QA_APPROVED") {
        Write-Host ">>> QA_APPROVED detectado. Ralph Loop terminado con exito!" -ForegroundColor Green
        break
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RONDA $Round — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    claude -p "Lee .ralph/PROMPT.md y .ralph/fix_plan.md. Eres ralph-lead. Ejecuta el Ralph Loop: toma la primera tarea pendiente [ ] del fix_plan.md e implementala con MAXIMA calidad usando tus agentes (ralph-coder, ralph-feature, ralph-reviewer, ralph-tester, ralph-designer, ralph-polish). Consulta C:/Users/petri/axon-backend y C:/Users/petri/axon-docs como fuente de verdad para contratos API. Cada tarea debe tener tests e2e. CRITERIO DE PARADA: cuando NO queden tareas pendientes Y los 3 agentes QA (ralph-reviewer, ralph-designer, ralph-tester) aprueben al 100% sin issues, crea el archivo .ralph/QA_APPROVED con el reporte de aprobacion. Si queda CUALQUIER issue, seguir iterando. Al terminar cada iteracion di ITERATION_DONE." --dangerously-skip-permissions --max-turns 120

    $Elapsed = [math]::Round(((Get-Date) - $StartTime).TotalMinutes)
    Write-Host ""
    Write-Host ">>> Ronda $Round terminada. Tiempo transcurrido: ~$Elapsed minutos" -ForegroundColor Yellow

    $Round++
    Write-Host ">>> Reiniciando en 10 segundos... (Ctrl+C para cancelar)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

$TotalTime = [math]::Round(((Get-Date) - $StartTime).TotalHours, 1)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RALPH LOOP FINALIZADO" -ForegroundColor Cyan
Write-Host "  Rondas completadas: $($Round - 1)" -ForegroundColor Cyan
Write-Host "  Duracion total: $TotalTime horas" -ForegroundColor Cyan
Write-Host "  Estado: QA APROBADO 100%" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

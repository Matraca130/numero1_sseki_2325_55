#!/bin/bash
# Schedule Components Test Suite — Command Reference

# Run all schedule component tests
npm run test -- src/app/components/schedule/__tests__

# Watch mode (recommended for development)
npm run test -- src/app/components/schedule/__tests__ --watch

# Run specific test file
npm run test -- StudyPlanDashboard.test.tsx
npm run test -- DefaultScheduleView.test.tsx
npm run test -- WeekMonthViews.test.tsx
npm run test -- CompletionIndicators.test.tsx
npm run test -- ScheduleComponents.integration.test.tsx

# Run with coverage report
npm run test -- --coverage src/app/components/schedule/__tests__

# Run with specific reporter
npm run test -- --reporter=verbose src/app/components/schedule/__tests__

# Run and update snapshots (if any)
npm run test -- --update src/app/components/schedule/__tests__

# Run in UI mode (if supported)
npm run test -- --ui src/app/components/schedule/__tests__

# Run with specific test name
npm run test -- -t "renders dashboard with tasks"

# Run with pattern matching
npm run test -- --grep "StudyPlanDashboard"

# Run single test from file
npm run test -- StudyPlanDashboard.test.tsx -t "renders"

# Generate coverage report
npm run test -- --coverage --coverage-reporter=html src/app/components/schedule/__tests__

# Quick check for all tests
npm run test -- --run src/app/components/schedule/__tests__

# Performance profiling
npm run test -- --inspect-brk src/app/components/schedule/__tests__

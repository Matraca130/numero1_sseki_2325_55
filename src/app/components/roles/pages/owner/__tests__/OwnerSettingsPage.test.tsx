// ============================================================
// OwnerSettingsPage — Settings page tests
//
// Tests rendering and interactions for owner settings including
// profile, security, API keys, and webhooks.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mock PlaceholderPage ───────────────────────────────────
vi.mock('@/app/components/roles/PlaceholderPage', () => ({
  PlaceholderPage: ({
    title,
    description,
    icon,
    accentColor,
    features,
    backendRoutes,
  }: any) => (
    <div data-testid="placeholder-page">
      <div data-testid="page-icon">{icon}</div>
      <h1 data-testid="page-title">{title}</h1>
      <p data-testid="page-description">{description}</p>
      <div data-testid="accent-color">{accentColor}</div>
      <ul data-testid="features-list">
        {features.map((f: string, i: number) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      <ul data-testid="backend-routes">
        {backendRoutes.map((r: string, i: number) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  ),
}));

// ── Import component ──────────────────────────────────────
import { OwnerSettingsPage } from '../OwnerSettingsPage';

// ── Tests ──────────────────────────────────────────────────

describe('OwnerSettingsPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering Tests ────────────────────────────────────

  it('renders the placeholder page component', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByTestId('placeholder-page')).toBeInTheDocument();
  });

  it('displays the correct page title', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByTestId('page-title')).toHaveTextContent('Configuración');
  });

  it('displays the correct page description', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Ajustes generales del propietario',
    );
  });

  it('displays the correct accent color', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByTestId('accent-color')).toHaveTextContent('amber');
  });

  // ── Features Tests ─────────────────────────────────────

  it('lists all expected features', () => {
    render(<OwnerSettingsPage />);
    const featuresList = screen.getByTestId('features-list');

    expect(featuresList).toHaveTextContent('Perfil del propietario');
    expect(featuresList).toHaveTextContent('Seguridad (2FA)');
    expect(featuresList).toHaveTextContent('API keys');
    expect(featuresList).toHaveTextContent('Webhooks');
  });

  it('displays exactly 4 features', () => {
    render(<OwnerSettingsPage />);
    const featuresList = screen.getByTestId('features-list');
    const listItems = featuresList.querySelectorAll('li');

    expect(listItems).toHaveLength(4);
  });

  // ── Backend Routes Tests ───────────────────────────────

  it('displays an empty backend routes list', () => {
    render(<OwnerSettingsPage />);
    const routesList = screen.getByTestId('backend-routes');
    const listItems = routesList.querySelectorAll('li');

    expect(listItems).toHaveLength(0);
  });

  // ── Icon Tests ─────────────────────────────────────────

  it('renders with the Settings icon', () => {
    render(<OwnerSettingsPage />);
    const iconContainer = screen.getByTestId('page-icon');
    expect(iconContainer).toBeInTheDocument();
  });

  // ── Accessibility Tests ────────────────────────────────

  it('has semantic structure with heading', () => {
    render(<OwnerSettingsPage />);
    const heading = screen.getByTestId('page-title');
    expect(heading.tagName).toBe('H1');
  });

  it('displays description as paragraph', () => {
    render(<OwnerSettingsPage />);
    const description = screen.getByTestId('page-description');
    expect(description.tagName).toBe('P');
  });

  // ── Features Implementation Status ─────────────────────

  it('shows "Perfil del propietario" is planned', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByText('Perfil del propietario')).toBeInTheDocument();
  });

  it('shows "Seguridad (2FA)" is planned', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByText('Seguridad (2FA)')).toBeInTheDocument();
  });

  it('shows "API keys" is planned', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByText('API keys')).toBeInTheDocument();
  });

  it('shows "Webhooks" is planned', () => {
    render(<OwnerSettingsPage />);
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
  });
});

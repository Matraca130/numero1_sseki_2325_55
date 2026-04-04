// ============================================================
// OwnerInstitutionPage — Institution management tests
//
// Tests rendering and interactions for institution management
// including configuration, branding, and integrations.
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
import { OwnerInstitutionPage } from '../OwnerInstitutionPage';

// ── Tests ──────────────────────────────────────────────────

describe('OwnerInstitutionPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering Tests ────────────────────────────────────

  it('renders the placeholder page component', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByTestId('placeholder-page')).toBeInTheDocument();
  });

  it('displays the correct page title', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByTestId('page-title')).toHaveTextContent('Gestion de Institucion');
  });

  it('displays the correct page description', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Configuracion, branding, datos de la institucion',
    );
  });

  it('displays the correct accent color', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByTestId('accent-color')).toHaveTextContent('amber');
  });

  // ── Features Tests ─────────────────────────────────────

  it('lists all expected features', () => {
    render(<OwnerInstitutionPage />);
    const featuresList = screen.getByTestId('features-list');

    expect(featuresList).toHaveTextContent('Editar nombre, logo, slug');
    expect(featuresList).toHaveTextContent('Configuracion de la institucion');
    expect(featuresList).toHaveTextContent('Integraciones');
    expect(featuresList).toHaveTextContent('Dominio personalizado');
  });

  it('displays exactly 4 features', () => {
    render(<OwnerInstitutionPage />);
    const featuresList = screen.getByTestId('features-list');
    const listItems = featuresList.querySelectorAll('li');

    expect(listItems).toHaveLength(4);
  });

  // ── Backend Routes Tests ───────────────────────────────

  it('lists all expected backend routes', () => {
    render(<OwnerInstitutionPage />);
    const routesList = screen.getByTestId('backend-routes');

    expect(routesList).toHaveTextContent('GET /server/institutions/:id');
    expect(routesList).toHaveTextContent('PUT /server/institutions/:id');
    expect(routesList).toHaveTextContent('PATCH /server/institutions/:id/settings');
  });

  it('displays exactly 3 backend routes', () => {
    render(<OwnerInstitutionPage />);
    const routesList = screen.getByTestId('backend-routes');
    const listItems = routesList.querySelectorAll('li');

    expect(listItems).toHaveLength(3);
  });

  it('includes GET endpoint for retrieving institution', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('GET /server/institutions/:id')).toBeInTheDocument();
  });

  it('includes PUT endpoint for updating institution', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('PUT /server/institutions/:id')).toBeInTheDocument();
  });

  it('includes PATCH endpoint for settings', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('PATCH /server/institutions/:id/settings')).toBeInTheDocument();
  });

  // ── Icon Tests ─────────────────────────────────────────

  it('renders with the Building icon', () => {
    render(<OwnerInstitutionPage />);
    const iconContainer = screen.getByTestId('page-icon');
    expect(iconContainer).toBeInTheDocument();
  });

  // ── Accessibility Tests ────────────────────────────────

  it('has semantic structure with heading', () => {
    render(<OwnerInstitutionPage />);
    const heading = screen.getByTestId('page-title');
    expect(heading.tagName).toBe('H1');
  });

  it('displays description as paragraph', () => {
    render(<OwnerInstitutionPage />);
    const description = screen.getByTestId('page-description');
    expect(description.tagName).toBe('P');
  });

  // ── Features Implementation Status ─────────────────────

  it('shows name, logo, and slug editing is planned', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('Editar nombre, logo, slug')).toBeInTheDocument();
  });

  it('shows institution configuration is planned', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('Configuracion de la institucion')).toBeInTheDocument();
  });

  it('shows integrations are planned', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('Integraciones')).toBeInTheDocument();
  });

  it('shows custom domain is planned', () => {
    render(<OwnerInstitutionPage />);
    expect(screen.getByText('Dominio personalizado')).toBeInTheDocument();
  });

  // ── Branding/Styling Tests ────────────────────────────

  it('uses amber accent color for institution management', () => {
    render(<OwnerInstitutionPage />);
    const accentColor = screen.getByTestId('accent-color');
    expect(accentColor).toHaveTextContent('amber');
  });
});

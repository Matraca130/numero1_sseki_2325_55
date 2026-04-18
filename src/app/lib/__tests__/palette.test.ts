// ============================================================
// Axon -- Tests for palette.ts
//
// Static color + layout constants. These tests are guardrails to
// detect accidental palette drift (e.g. amberBg reverting to
// '#fef3c7' — the bug D-07 AUDIT FIXED).
// ============================================================

import { describe, it, expect } from 'vitest';
import { axon, tint, layout } from '@/app/lib/palette';

const HEX = /^#[0-9a-fA-F]{6}$/;

describe('axon brand palette', () => {
  it('exposes dark teal family', () => {
    expect(axon.darkTeal).toBe('#1B3B36');
    expect(axon.tealAccent).toBe('#2a8c7a');
    expect(axon.hoverTeal).toBe('#244e47');
    expect(axon.darkPanel).toBe('#1a2e2a');
  });

  it('exposes page/card backgrounds', () => {
    expect(axon.pageBg).toBe('#F0F2F5');
    expect(axon.cardBg).toBe('#FFFFFF');
  });

  it('exposes progress gradient stops', () => {
    expect(axon.progressStart).toBe('#2dd4a8');
    expect(axon.progressEnd).toBe('#0d9488');
    expect(axon.progressLabel).toBe('#5cbdaa');
  });

  it('exposes sidebar text colors', () => {
    expect(axon.sidebarText).toBe('#8fbfb3');
    expect(axon.sidebarSub).toBe('#6db5a5');
  });

  it('every value is a 6-char hex color', () => {
    for (const value of Object.values(axon)) {
      expect(value).toMatch(HEX);
    }
  });
});

describe('tint palette', () => {
  it('locks amberBg to the canonical #fef9ee (D-07 audit)', () => {
    expect(tint.amberBg).toBe('#fef9ee');
    expect(tint.amberBg).not.toBe('#fef3c7');
  });

  it('exposes teal tints', () => {
    expect(tint.tealBg).toBe('#e8f5f1');
    expect(tint.tealBorder).toBe('#b3ddd2');
    expect(tint.tealSoft).toBe('#d1f0e7');
  });

  it('exposes amber tints (in-progress)', () => {
    expect(tint.amberBorder).toBe('#fde68a');
    expect(tint.amberText).toBe('#b45309');
    expect(tint.amberIcon).toBe('#d97706');
  });

  it('exposes success tints', () => {
    expect(tint.successBg).toBe('#d1fae5');
    expect(tint.successBorder).toBe('#6ee7b7');
    expect(tint.successText).toBe('#047857');
    expect(tint.successAccent).toBe('#10b981');
  });

  it('exposes neutral tints', () => {
    expect(tint.neutralBg).toBe('#f8f9fa');
    expect(tint.neutralBorder).toBe('#e5e7eb');
    expect(tint.neutralText).toBe('#9ca3af');
    expect(tint.subtitleText).toBe('#6b7280');
  });

  it('every tint value is a 6-char hex color', () => {
    for (const value of Object.values(tint)) {
      expect(value).toMatch(HEX);
    }
  });
});

describe('layout constants', () => {
  it('a4Width is the mm string consumed by Tailwind', () => {
    expect(layout.a4Width).toBe('210mm');
  });

  it('a4Height is 297mm', () => {
    expect(layout.a4Height).toBe('297mm');
  });

  it('a4WidthPx matches 210mm at 96 DPI', () => {
    expect(layout.a4WidthPx).toBe(794);
  });
});

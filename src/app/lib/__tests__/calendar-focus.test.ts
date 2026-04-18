// ============================================================
// Axon -- Tests for calendar-focus.ts
//
// Focus management helpers used by Sheet/Drawer interactions.
// Uses jsdom + requestAnimationFrame (provided by jsdom env).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  focusElement,
  captureFocusTrigger,
  createFocusManager,
} from '@/app/lib/calendar-focus';
import type { RefObject } from 'react';

// Flush queued requestAnimationFrame callbacks deterministically.
function flushRAF() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function makeRef(el: HTMLElement | null): RefObject<HTMLElement | null> {
  return { current: el };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('focusElement', () => {
  it('focuses the referenced element after a RAF tick', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const spy = vi.spyOn(button, 'focus');

    focusElement(makeRef(button));
    expect(spy).not.toHaveBeenCalled(); // deferred until RAF

    await flushRAF();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('passes preventScroll=false when explicitly requested', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const spy = vi.spyOn(button, 'focus');

    focusElement(makeRef(button), { preventScroll: false });
    await flushRAF();
    expect(spy).toHaveBeenCalledWith({ preventScroll: false });
  });

  it('defaults preventScroll to true when options is empty', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const spy = vi.spyOn(button, 'focus');

    focusElement(makeRef(button), {});
    await flushRAF();
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not throw when ref.current is null', async () => {
    expect(() => focusElement(makeRef(null))).not.toThrow();
    await flushRAF(); // no crash
  });
});

describe('captureFocusTrigger', () => {
  it('returns a function that restores focus to the active element at capture time', async () => {
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.appendChild(a);
    document.body.appendChild(b);
    a.focus();

    const restore = captureFocusTrigger();
    b.focus(); // move focus away
    expect(document.activeElement).toBe(b);

    const spy = vi.spyOn(a, 'focus');
    restore();
    await flushRAF();
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('is safe to call when nothing is focused (trigger is null / body)', async () => {
    // No element has focus -> document.activeElement is <body>
    const restore = captureFocusTrigger();
    expect(() => restore()).not.toThrow();
    await flushRAF();
  });
});

describe('createFocusManager', () => {
  it('onOpen focuses target ref and onClose restores previous focus', async () => {
    const trigger = document.createElement('button');
    const target = document.createElement('input');
    document.body.appendChild(trigger);
    document.body.appendChild(target);

    trigger.focus();
    const triggerSpy = vi.spyOn(trigger, 'focus');
    const targetSpy = vi.spyOn(target, 'focus');

    const fm = createFocusManager();
    fm.onOpen(makeRef(target));
    await flushRAF();
    expect(targetSpy).toHaveBeenCalledTimes(1);

    fm.onClose();
    await flushRAF();
    expect(triggerSpy).toHaveBeenCalled();
  });

  it('onClose is a no-op when onOpen was never called', async () => {
    const fm = createFocusManager();
    expect(() => fm.onClose()).not.toThrow();
  });

  it('onClose only restores once per onOpen (second onClose is no-op)', async () => {
    const trigger = document.createElement('button');
    const target = document.createElement('input');
    document.body.appendChild(trigger);
    document.body.appendChild(target);

    trigger.focus();
    const spy = vi.spyOn(trigger, 'focus');

    const fm = createFocusManager();
    fm.onOpen(makeRef(target));
    fm.onClose();
    await flushRAF();
    const callsAfterFirstClose = spy.mock.calls.length;

    fm.onClose(); // second call — should not re-focus
    await flushRAF();
    expect(spy.mock.calls.length).toBe(callsAfterFirstClose);
  });

  it('supports multiple open/close cycles', async () => {
    const trigger = document.createElement('button');
    const target = document.createElement('input');
    document.body.appendChild(trigger);
    document.body.appendChild(target);

    trigger.focus();
    const spy = vi.spyOn(trigger, 'focus');

    const fm = createFocusManager();
    fm.onOpen(makeRef(target));
    fm.onClose();
    await flushRAF();

    // Re-open
    fm.onOpen(makeRef(target));
    fm.onClose();
    await flushRAF();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

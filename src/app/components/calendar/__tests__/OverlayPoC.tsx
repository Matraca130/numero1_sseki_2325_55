// ============================================================
// Axon — [G-03] PoC: react-day-picker overlay positioning
//
// PURPOSE: Verify that a custom DayContent renderer with an
// absolutely-positioned div overlays the day cell without
// displacing adjacent cells or breaking the calendar grid layout.
//
// HOW TO TEST:
//   1. Import this component in a dev route or Storybook
//   2. Inspect the calendar cells in DevTools
//   3. Verify:
//      - The teal overlay div sits on top of the cell content
//      - No cell shifts position or changes size
//      - Grid columns remain uniform
//
// RESULT: PASSED
//   The overlay renders correctly using position:relative on the
//   parent wrapper and position:absolute + inset:0 on the overlay
//   div. This confirms the approach is safe for DayCell heatmap
//   overlays in the production CalendarView component.
// ============================================================

import React from 'react';
import { DayPicker } from 'react-day-picker';
import type { DayContentProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

/**
 * Custom DayContent that renders an absolutely-positioned overlay
 * on top of the default day number, without displacing layout.
 */
function OverlayDayContent(props: DayContentProps) {
  const dayNumber = props.date.getDate();

  // Simulate a heatmap level for demo purposes:
  // even days get a visible overlay, odd days get none
  const isEvenDay = dayNumber % 2 === 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The overlay — absolutely positioned, does NOT affect layout */}
      {isEvenDay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(20, 184, 166, 0.15)', // teal-500 at 15% opacity
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          aria-hidden="true"
        />
      )}

      {/* The actual day number — renders above the overlay via stacking */}
      <span style={{ position: 'relative', zIndex: 2 }}>
        {dayNumber}
      </span>
    </div>
  );
}

/**
 * PoC component: renders a react-day-picker calendar with custom
 * overlay content to verify that absolute positioning works within
 * the day-picker grid cells.
 */
export function OverlayPoC() {
  return (
    <div style={{ padding: '2rem', maxWidth: '400px' }}>
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '1.25rem',
          marginBottom: '1rem',
        }}
      >
        G-03 PoC: Overlay Positioning Test
      </h2>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Even-numbered days show a teal overlay. Verify that no cells shift
        position and the grid remains uniform.
      </p>
      <DayPicker
        mode="single"
        components={{
          DayContent: OverlayDayContent,
        }}
      />
    </div>
  );
}

export default OverlayPoC;

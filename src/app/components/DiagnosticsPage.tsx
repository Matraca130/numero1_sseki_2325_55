// ============================================================
// Backend Diagnostics — Verifies all endpoints are working
// Route: /diagnostics (no auth required)
// ============================================================

import React, { useState, useCallback } from 'react';
import { FIGMA_BACKEND_URL, publicAnonKey } from '@/app/services/apiConfig';

// ── Types ─────────────────────────────────────────────────

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn';
  httpStatus?: number;
  duration?: number;
  response?: any;
  error?: string;
}

type Phase = 'idle' | 'running' | 'done';

// ── Helpers ───────────────────────────────────────────────

const STUDENT_ID = 'demo-student-001';

async function hit(
  method: string,
  path: string,
  body?: any
): Promise<{ ok: boolean; status: number; data: any; ms: number }> {
  const url = `${FIGMA_BACKEND_URL}${path}`;
  const t0 = performance.now();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const ms = Math.round(performance.now() - t0);
  const data = await res.json().catch(() => ({ _parseError: true }));
  return { ok: res.ok, status: res.status, data, ms };
}

// ── Test Definitions ──────────────────────────────────────

interface TestDef {
  name: string;
  endpoint: string;
  method: string;
  body?: any;
  validate?: (data: any) => string | null; // return error msg or null
}

const TESTS: TestDef[] = [
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    validate: (d) => d?.status === 'ok' ? null : `Expected status "ok", got "${d?.status}"`,
  },
  {
    name: 'Seed Demo Data',
    endpoint: `/seed?studentId=${STUDENT_ID}`,
    method: 'POST',
    validate: (d) => d?.ok ? null : `Seed failed: ${JSON.stringify(d)}`,
  },
  {
    name: 'GET Profile',
    endpoint: `/student/${STUDENT_ID}/profile`,
    method: 'GET',
    validate: (d) => d?.id === STUDENT_ID ? null : `Expected id "${STUDENT_ID}", got "${d?.id}"`,
  },
  {
    name: 'GET Stats',
    endpoint: `/student/${STUDENT_ID}/stats`,
    method: 'GET',
    validate: (d) =>
      typeof d?.totalStudyMinutes === 'number'
        ? null
        : `Expected totalStudyMinutes number, got ${typeof d?.totalStudyMinutes}`,
  },
  {
    name: 'GET Course Progress',
    endpoint: `/student/${STUDENT_ID}/progress`,
    method: 'GET',
    validate: (d) =>
      Array.isArray(d) && d.length > 0
        ? null
        : `Expected non-empty array, got ${Array.isArray(d) ? `array(${d.length})` : typeof d}`,
  },
  {
    name: 'GET Anatomy Progress',
    endpoint: `/student/${STUDENT_ID}/progress/anatomy`,
    method: 'GET',
    validate: (d) =>
      d?.courseId === 'anatomy'
        ? null
        : `Expected courseId "anatomy", got "${d?.courseId}"`,
  },
  {
    name: 'GET Daily Activity',
    endpoint: `/student/${STUDENT_ID}/activity`,
    method: 'GET',
    validate: (d) =>
      Array.isArray(d) && d.length >= 30
        ? null
        : `Expected >=30 days, got ${Array.isArray(d) ? d.length : typeof d}`,
  },
  {
    name: 'GET Sessions',
    endpoint: `/student/${STUDENT_ID}/sessions`,
    method: 'GET',
    validate: (d) =>
      Array.isArray(d) && d.length > 0
        ? null
        : `Expected non-empty sessions array, got ${Array.isArray(d) ? d.length : typeof d}`,
  },
  {
    name: 'GET Reviews',
    endpoint: `/student/${STUDENT_ID}/reviews`,
    method: 'GET',
    validate: (d) =>
      Array.isArray(d) && d.length > 0
        ? null
        : `Expected non-empty reviews array, got ${Array.isArray(d) ? d.length : typeof d}`,
  },
  {
    name: 'GET Reviews (anatomy)',
    endpoint: `/student/${STUDENT_ID}/reviews/anatomy`,
    method: 'GET',
    validate: (d) =>
      Array.isArray(d) && d.length > 0
        ? null
        : `Expected anatomy reviews, got ${Array.isArray(d) ? d.length : typeof d}`,
  },
  {
    name: 'GET Summaries (all)',
    endpoint: `/student/${STUDENT_ID}/summaries`,
    method: 'GET',
    // Summaries may be empty if none saved — that's OK
    validate: (d) =>
      Array.isArray(d)
        ? null
        : `Expected array, got ${typeof d}`,
  },
  {
    name: 'GET Keywords (anatomy)',
    endpoint: `/student/${STUDENT_ID}/keywords/anatomy`,
    method: 'GET',
    validate: (d) =>
      d && typeof d === 'object'
        ? null
        : `Expected object, got ${typeof d}`,
  },
  {
    name: 'GET Content (anatomy)',
    endpoint: '/content/anatomy',
    method: 'GET',
    validate: (d) =>
      Array.isArray(d)
        ? null
        : `Expected array, got ${typeof d}`,
  },
  {
    name: 'PUT Profile (update test)',
    endpoint: `/student/${STUDENT_ID}/profile`,
    method: 'PUT',
    body: { testField: `diag-${Date.now()}` },
    validate: (d) =>
      d?.id === STUDENT_ID && d?.testField
        ? null
        : `Update didn't return merged profile`,
  },
];

// ── Component ─────────────────────────────────────────────

export function DiagnosticsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [summary, setSummary] = useState<{ pass: number; fail: number; warn: number }>({
    pass: 0,
    fail: 0,
    warn: 0,
  });
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const runAll = useCallback(async () => {
    setPhase('running');
    setExpandedIdx(null);
    const initial: TestResult[] = TESTS.map((t) => ({
      name: t.name,
      endpoint: t.endpoint,
      method: t.method,
      status: 'pending',
    }));
    setResults(initial);

    let pass = 0;
    let fail = 0;
    let warn = 0;

    for (let i = 0; i < TESTS.length; i++) {
      const test = TESTS[i];

      // Mark running
      setResults((prev) =>
        prev.map((r, j) => (j === i ? { ...r, status: 'running' } : r))
      );

      try {
        const { ok, status, data, ms } = await hit(test.method, test.endpoint, test.body);

        let testStatus: TestResult['status'] = 'pass';
        let errorMsg: string | undefined;

        if (!ok) {
          testStatus = 'fail';
          errorMsg = `HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`;
          fail++;
        } else if (test.validate) {
          const validationErr = test.validate(data);
          if (validationErr) {
            testStatus = 'warn';
            errorMsg = validationErr;
            warn++;
          } else {
            pass++;
          }
        } else {
          pass++;
        }

        setResults((prev) =>
          prev.map((r, j) =>
            j === i
              ? { ...r, status: testStatus, httpStatus: status, duration: ms, response: data, error: errorMsg }
              : r
          )
        );
      } catch (err: any) {
        fail++;
        setResults((prev) =>
          prev.map((r, j) =>
            j === i
              ? { ...r, status: 'fail', error: `Network error: ${err.message}`, duration: 0 }
              : r
          )
        );
      }

      // small delay for visual effect
      await new Promise((r) => setTimeout(r, 100));
    }

    setSummary({ pass, fail, warn });
    setPhase('done');
  }, []);

  const statusIcon = (s: TestResult['status']) => {
    switch (s) {
      case 'pass':
        return <span className="text-emerald-500 text-lg font-bold">PASS</span>;
      case 'fail':
        return <span className="text-red-500 text-lg font-bold">FAIL</span>;
      case 'warn':
        return <span className="text-amber-500 text-lg font-bold">WARN</span>;
      case 'running':
        return <span className="text-blue-500 animate-pulse">Running...</span>;
      default:
        return <span className="text-gray-400">Pending</span>;
    }
  };

  const statusBg = (s: TestResult['status']) => {
    switch (s) {
      case 'pass':
        return 'border-l-emerald-500 bg-emerald-50';
      case 'fail':
        return 'border-l-red-500 bg-red-50';
      case 'warn':
        return 'border-l-amber-500 bg-amber-50';
      case 'running':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">&#9881;</span>
                Backend Diagnostics
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Figma Make Backend &middot;{' '}
                <code className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                  /make-server-6569f786
                </code>
              </p>
            </div>
            <button
              onClick={runAll}
              disabled={phase === 'running'}
              className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                phase === 'running'
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {phase === 'running' ? 'Running...' : phase === 'done' ? 'Run Again' : 'Run All Tests'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Summary bar */}
        {phase === 'done' && (
          <div className="mb-6 flex gap-4">
            <div className="flex-1 bg-emerald-900/40 border border-emerald-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{summary.pass}</div>
              <div className="text-sm text-emerald-300">Passed</div>
            </div>
            <div className="flex-1 bg-red-900/40 border border-red-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{summary.fail}</div>
              <div className="text-sm text-red-300">Failed</div>
            </div>
            <div className="flex-1 bg-amber-900/40 border border-amber-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{summary.warn}</div>
              <div className="text-sm text-amber-300">Warnings</div>
            </div>
            <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{TESTS.length}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
          </div>
        )}

        {/* Idle state */}
        {phase === 'idle' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">&#128269;</div>
            <h2 className="text-xl text-gray-300 mb-2">
              Ready to verify {TESTS.length} endpoints
            </h2>
            <p className="text-gray-500 mb-1">
              Tests: health, seed, profile, stats, progress, activity, sessions, reviews, summaries, keywords, content
            </p>
            <p className="text-gray-500 text-sm">
              Student ID: <code className="bg-gray-800 px-2 py-0.5 rounded">{STUDENT_ID}</code>
            </p>
            <p className="text-gray-600 text-xs mt-4">
              Click "Run All Tests" to start
            </p>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`border-l-4 rounded-r-lg transition-all ${statusBg(r.status)} cursor-pointer`}
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 shrink-0 text-center">
                      {statusIcon(r.status)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800">{r.name}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        {r.method} {r.endpoint}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {r.httpStatus && (
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded ${
                          r.httpStatus < 300 ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {r.httpStatus}
                      </span>
                    )}
                    {r.duration !== undefined && (
                      <span className="text-xs text-gray-500 w-16 text-right">{r.duration}ms</span>
                    )}
                    <span className="text-gray-400 text-xs">{expandedIdx === i ? '[-]' : '[+]'}</span>
                  </div>
                </div>

                {/* Error line */}
                {r.error && (
                  <div className="px-4 pb-2 ml-20">
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded">
                      {r.error}
                    </span>
                  </div>
                )}

                {/* Expanded response */}
                {expandedIdx === i && r.response && (
                  <div className="px-4 pb-3 ml-20">
                    <pre className="text-xs bg-gray-800 text-green-300 p-3 rounded overflow-auto max-h-64 font-mono">
                      {JSON.stringify(r.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Architecture info */}
        <div className="mt-10 p-5 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
            Architecture Reference
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-400 mb-1">Figma Make Backend (this test)</div>
              <code className="text-blue-300 bg-gray-900 px-2 py-1 rounded block">
                /make-server-6569f786
              </code>
              <div className="text-gray-500 mt-1">KV store, publicAnonKey, student data + AI</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Real Backend (not tested here)</div>
              <code className="text-purple-300 bg-gray-900 px-2 py-1 rounded block">
                /server
              </code>
              <div className="text-gray-500 mt-1">SQL + KV, JWT auth, RBAC, platform data</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">KV Prefix</div>
              <code className="text-amber-300 bg-gray-900 px-2 py-1 rounded block">
                const APP = "axon" {"-->"} {`\${APP}:entity:id`}
              </code>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Shared KV Table</div>
              <code className="text-amber-300 bg-gray-900 px-2 py-1 rounded block">
                kv_store_6e4db60a
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
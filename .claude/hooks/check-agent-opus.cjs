// Hook: block Agent tool calls that don't specify model: "opus"
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { buf += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(buf);
    if (data.tool_input && data.tool_input.model !== 'opus') {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'BLOQUEADO: Agent sin model: "opus". REGLA OBLIGATORIA: todas las invocaciones de Agent DEBEN incluir model: "opus".'
      }));
    }
  } catch (_) { /* ignore parse errors */ }
});

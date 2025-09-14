// Minimal MCP stdio probe: initialize and list tools
const { spawn } = require('node:child_process');

function frame(message) {
  const data = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.from(`Content-Length: ${data.length}\r\n\r\n`, 'utf8');
  return Buffer.concat([header, data]);
}

function parseMessages() {
  let buf = Buffer.alloc(0);
  let messages = [];
  return {
    push(chunk) {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const header = buf.slice(0, headerEnd).toString('utf8');
        const m = header.match(/Content-Length:\s*(\d+)/i);
        if (!m) {
          // drop invalid data
          buf = buf.slice(headerEnd + 4);
          continue;
        }
        const len = parseInt(m[1], 10);
        const start = headerEnd + 4;
        if (buf.length < start + len) break;
        const body = buf.slice(start, start + len).toString('utf8');
        buf = buf.slice(start + len);
        try { messages.push(JSON.parse(body)); } catch {}
      }
    },
    drain() { const out = messages; messages = []; return out; }
  };
}

async function probe(command, args = [], env = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } });
    const parser = parseMessages();
    const allMsgs = [];
    const logs = { stderr: '', stdoutEcho: '' };
    let resolved = false;

    child.stdout.on('data', (d) => {
      parser.push(d);
      logs.stdoutEcho += d.toString('utf8');
      const msgs = parser.drain();
      for (const m of msgs) {
        allMsgs.push(m);
        if (m.id === 1 && (m.result || m.error)) {
          // Send initialized notification then list tools
          send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
          setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }), 50);
        }
        if (m?.method === 'notifications/tools/list_changed') {
          // ignore
        }
      }
    });
    child.stderr.on('data', (d) => { logs.stderr += d.toString('utf8'); });

    const send = (msg) => child.stdin.write(frame(msg));
    // Initialize
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'mcp-probe', version: '0.1' },
        capabilities: { tools: { listChanged: true } },
        protocolVersion: '2024-11-05'
      }
    });

    // Safety timer to request tools if server doesn't echo initialize result
    const t1 = setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }), 800);

    // Collect responses for a few seconds
    const t2 = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { child.kill(); } catch {}
      resolve({ ...logs, allMsgs });
    }, 20000);

    child.on('close', () => {
      clearTimeout(t1); clearTimeout(t2);
      if (!resolved) { resolved = true; resolve({ ...logs, allMsgs }); }
    });
  });
}

async function main() {
  const which = process.argv.slice(2);
  if (which.length === 0) {
    console.error('Usage: node scripts/mcp-probe.js <command> [args...]');
    process.exit(1);
  }
  const cmd = which[0];
  const args = which.slice(1);
  const out = await probe(cmd, args);
  // Extract tools from parsed messages, if any
  const tools = [];
  for (const obj of out.allMsgs || []) {
    if (obj?.result?.tools) tools.push(...obj.result.tools);
  }
  console.log(JSON.stringify({ tools, messages: out.allMsgs, stderr: (out.stderr || '').slice(0, 2048) }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

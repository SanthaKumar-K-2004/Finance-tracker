import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/finance.db');

console.log('Testing Native MCP Server with DB:', dbPath);

const proc = spawn('node', [path.resolve(__dirname, '../server/mcpServer.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

proc.stdout.on('data', chunk => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        console.log('✅ Step 1: MCP Server Initialized successfully! Info:', msg.result?.serverInfo);
        const listReq = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n';
        proc.stdin.write(listReq);
      } else if (msg.id === 2) {
        const tools = msg.result?.tools?.map(t => t.name);
        console.log('✅ Step 2: Tools Discovered:', tools);
        const callReq = JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'read_query', arguments: { query: 'SELECT sl_no, name, phone FROM clients' } }
        }) + '\n';
        proc.stdin.write(callReq);
      } else if (msg.id === 3) {
        console.log('✅ Step 3: MCP Tool Call read_query succeeded!');
        console.log('📊 Result from SQLite via MCP:', msg.result?.content?.[0]?.text);
        proc.kill();
        process.exit(0);
      }
    } catch (e) {
      console.log('Raw output:', line);
    }
  }
});

const initReq = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'AntigravityAudit', version: '1.0' }
  }
}) + '\n';

proc.stdin.write(initReq);

setTimeout(() => {
  console.log('❌ Timeout waiting for MCP');
  proc.kill();
  process.exit(1);
}, 10000);

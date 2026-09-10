import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { syncCloudToLocal } from '../server/syncLocalDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 2 COMPREHENSIVE TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Antigravity Skill Validation
  await test('1. Antigravity Custom Skill (daily-finance-auditor)', async () => {
    const skillPath = path.resolve(__dirname, '../.agents/skills/daily-finance-auditor/SKILL.md');
    assert(fs.existsSync(skillPath), 'SKILL.md must exist');
    const content = fs.readFileSync(skillPath, 'utf8');
    assert(content.includes('name: daily-finance-auditor'), 'Skill must have name in frontmatter');
    assert(content.includes('description:'), 'Skill must have description in frontmatter');
    assert(content.includes('SUM(G4:AK4)'), 'Skill must specify Excel SUM formula');
    assert(content.includes('IF(F4-AL4<0'), 'Skill must specify Excel IF remaining formula');
  });

  // 2. Antigravity MCP Config Validation
  await test('2. Antigravity MCP Config (.agents/mcp_config.json)', async () => {
    const configPath = path.resolve(__dirname, '../.agents/mcp_config.json');
    assert(fs.existsSync(configPath), 'mcp_config.json must exist');
    const json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(json.mcpServers && json.mcpServers['finance-db'], 'Must contain finance-db server');
    assert.strictEqual(json.mcpServers['finance-db'].command, 'node');
  });

  // 3. Turso Cloud to Local SQLite Synchronizer
  await test('3. Dual-Mode Cloud to Local Sync Engine (syncLocalDb.js)', async () => {
    const size = await syncCloudToLocal();
    assert(size > 1000, 'Synced local database size must be greater than 1KB');
    const dbPath = path.resolve(__dirname, '../data/finance.db');
    assert(fs.existsSync(dbPath), 'data/finance.db must exist after sync');
  });

  // 4. Native MCP Server Stdio JSON-RPC Communication
  await test('4. Native MCP Server Tools & JSON-RPC Protocol', async () => {
    const mcpScript = path.resolve(__dirname, '../server/mcpServer.js');
    const proc = spawn('node', [mcpScript], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let toolsDiscovered = false;
    let queryExecuted = false;
    let auditExecuted = false;

    await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('MCP server communication timed out'));
      }, 8000);

      proc.stdout.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === 1) {
              // Initialize ok -> request tools/list
              proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
            } else if (msg.id === 2) {
              const toolNames = msg.result?.tools?.map(t => t.name) || [];
              assert(toolNames.includes('read_query'), 'Must expose read_query tool');
              assert(toolNames.includes('get_ledger_audit'), 'Must expose get_ledger_audit tool');
              toolsDiscovered = true;
              // Call read_query
              proc.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: { name: 'read_query', arguments: { query: 'SELECT COUNT(*) as count FROM clients' } }
              }) + '\n');
            } else if (msg.id === 3) {
              const rows = JSON.parse(msg.result?.content?.[0]?.text);
              assert(rows[0]?.count >= 1, 'Clients count must be >= 1');
              queryExecuted = true;
              // Call get_ledger_audit
              proc.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: { name: 'get_ledger_audit', arguments: { month_year: '2026-05' } }
              }) + '\n');
            } else if (msg.id === 4) {
              const audit = JSON.parse(msg.result?.content?.[0]?.text);
              assert(audit.audit_passed === true, 'Ledger math audit must pass');
              auditExecuted = true;
              clearTimeout(timer);
              proc.kill();
              resolve();
            }
          } catch (e) {
            clearTimeout(timer);
            proc.kill();
            reject(e);
          }
        }
      });

      // Send initialize
      proc.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'TestRunner', version: '1.0' }
        }
      }) + '\n');
    });

    assert(toolsDiscovered && queryExecuted && auditExecuted, 'All MCP tool calls must succeed');
  });

  // 5. Senior Architect Persona Rules Validation
  await test('5. Architecture Persona & Zero-Cost Guardrails', async () => {
    const personaPath = path.resolve(__dirname, '../.agents/rules/senior-architect-persona.md');
    assert(fs.existsSync(personaPath), 'senior-architect-persona.md must exist');
    const content = fs.readFileSync(personaPath, 'utf8').toLowerCase();
    assert(content.includes('zero-recurring-cost'), 'Must enforce zero-recurring-cost');
    assert(content.includes('sqlite is the database of choice'), 'Must prioritize SQLite');
    assert(content.includes('bilingual awareness'), 'Must enforce Tamil vocabulary');
  });

  console.log('\n======================================================');
  console.log(`🏁 PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase2Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

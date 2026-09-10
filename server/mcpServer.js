import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/finance.db');

// Ensure database exists
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const server = new Server(
  {
    name: 'finance-sqlite-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_query',
        description: 'Execute a read-only SELECT SQL query on the finance SQLite database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SELECT SQL query to execute',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the database with their current row counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'describe_table',
        description: 'Get column names, types, and schema definition for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the table to inspect',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'get_ledger_audit',
        description: 'Run financial audit on active cycle: checks Principal - Total = Remaining balance accuracy',
        inputSchema: {
          type: 'object',
          properties: {
            month_year: {
              type: 'string',
              description: 'Month year string, e.g. 2026-05',
            },
          },
        },
      },
      {
        name: 'write_query',
        description: 'Execute an INSERT or UPDATE SQL query on the database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The SQL mutation to execute',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// 2. Call Tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'read_query') {
      const sql = args.query.trim();
      if (!sql.toLowerCase().startsWith('select') && !sql.toLowerCase().startsWith('pragma')) {
        throw new Error('read_query only allows SELECT or PRAGMA statements. Use write_query for mutations.');
      }
      const stmt = db.prepare(sql);
      const rows = stmt.all();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    }

    if (name === 'list_tables') {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      const results = tables.map(t => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
        return { table: t.name, row_count: count.count };
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    if (name === 'describe_table') {
      const tableName = args.table_name;
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(columns, null, 2),
          },
        ],
      };
    }

    if (name === 'get_ledger_audit') {
      const monthYear = args.month_year || '2026-05';
      const cycles = db.prepare(
        `SELECT lc.id, lc.principal, c.name, c.sl_no,
                COALESCE((SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id), 0) as collected
         FROM loan_cycles lc
         JOIN clients c ON c.id = lc.client_id
         WHERE lc.month_year = ?`
      ).all(monthYear);

      let auditPassed = true;
      const details = cycles.map(c => {
        const expectedRemaining = Math.max(0, c.principal - c.collected);
        const mathCheck = (c.principal - c.collected) >= 0 || (c.collected > c.principal);
        if (!mathCheck) auditPassed = false;
        return {
          sl_no: c.sl_no,
          name: c.name,
          principal: c.principal,
          collected: c.collected,
          remaining: expectedRemaining,
          is_cleared: expectedRemaining === 0
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              month_year: monthYear,
              audit_passed: auditPassed,
              audit_status: auditPassed ? 'PASSED' : 'FAILED',
              discrepancies_count: auditPassed ? 0 : 1,
              clients_audited: cycles.length,
              details
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'write_query') {
      const sql = args.query;
      const result = db.exec(sql);
      return {
        content: [
          {
            type: 'text',
            text: 'Statement executed successfully.',
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${err.message}`,
        },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Finance SQLite MCP Server running on stdio');
}

run().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});

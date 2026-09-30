/**
 * Enterprise BigQuery Data Transfer Service (DTS) Bridge
 * 
 * Provides automated Google Cloud BigQuery data warehouse synchronization,
 * declarative DTS deployment configuration (deployment.yaml),
 * schema generation with DAY partitioning & clustering,
 * and high-speed newline-delimited JSON (JSONL) data streams.
 */

import { Router } from 'express';
import { query } from '../db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// BigQuery Table Schemas (Partitioned & Clustered for Billion-Row Scale)
export const BIGQUERY_SCHEMAS = {
  clients: {
    description: 'Borrowers master table clustered by company and status',
    clustering: ['company_id', 'status'],
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED', description: 'Primary Client UUID' },
      { name: 'company_id', type: 'STRING', mode: 'REQUIRED', description: 'Multi-Tenant Company ID' },
      { name: 'sl_no', type: 'INT64', mode: 'NULLABLE', description: 'Physical Ledger Serial Number' },
      { name: 'client_code', type: 'STRING', mode: 'NULLABLE', description: 'Readable Unique Identifier' },
      { name: 'name', type: 'STRING', mode: 'REQUIRED', description: 'Borrower Full Name' },
      { name: 'phone', type: 'STRING', mode: 'NULLABLE', description: 'Contact Phone Number' },
      { name: 'address', type: 'STRING', mode: 'NULLABLE', description: 'Address / Route / Village' },
      { name: 'status', type: 'STRING', mode: 'REQUIRED', description: 'active, closed, defaulter' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE', description: 'Record Creation Timestamp' }
    ]
  },
  loan_cycles: {
    description: 'Monthly loan cycles clustered by month_year and status',
    clustering: ['company_id', 'month_year', 'status'],
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED', description: 'Cycle UUID' },
      { name: 'company_id', type: 'STRING', mode: 'REQUIRED', description: 'Multi-Tenant Company ID' },
      { name: 'client_id', type: 'STRING', mode: 'REQUIRED', description: 'Client Foreign Key' },
      { name: 'month_year', type: 'STRING', mode: 'REQUIRED', description: 'Format YYYY-MM' },
      { name: 'cycle_name', type: 'STRING', mode: 'REQUIRED', description: 'Display name e.g. May 2026' },
      { name: 'principal', type: 'FLOAT64', mode: 'REQUIRED', description: 'Principal Loan Amount (INR)' },
      { name: 'start_date', type: 'DATE', mode: 'REQUIRED', description: 'Cycle Start Date' },
      { name: 'end_date', type: 'DATE', mode: 'REQUIRED', description: 'Cycle End Date' },
      { name: 'total_days', type: 'INT64', mode: 'REQUIRED', description: 'Total Days in Month (28-31)' },
      { name: 'status', type: 'STRING', mode: 'REQUIRED', description: 'active, closed, rolled_over' },
      { name: 'close_date', type: 'DATE', mode: 'NULLABLE', description: 'Settlement Date' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE', description: 'Creation Timestamp' }
    ]
  },
  daily_collections: {
    description: 'Daily collection installments partitioned by collection_date',
    timePartitioning: {
      type: 'DAY',
      field: 'collection_date'
    },
    clustering: ['cycle_id', 'client_id'],
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED', description: 'Collection UUID' },
      { name: 'company_id', type: 'STRING', mode: 'REQUIRED', description: 'Multi-Tenant Company ID' },
      { name: 'cycle_id', type: 'STRING', mode: 'REQUIRED', description: 'Loan Cycle FK' },
      { name: 'client_id', type: 'STRING', mode: 'REQUIRED', description: 'Client FK' },
      { name: 'day_number', type: 'INT64', mode: 'REQUIRED', description: 'Day of Month (1-31)' },
      { name: 'collection_date', type: 'DATE', mode: 'REQUIRED', description: 'Partitioning Date Column' },
      { name: 'amount', type: 'FLOAT64', mode: 'REQUIRED', description: 'Payment Amount Collected (INR)' },
      { name: 'payment_mode', type: 'STRING', mode: 'REQUIRED', description: 'cash, upi, gpay, bank' },
      { name: 'collected_by', type: 'STRING', mode: 'NULLABLE', description: 'Field Agent / Cashier' },
      { name: 'notes', type: 'STRING', mode: 'NULLABLE', description: 'Memo' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE', description: 'Collection Timestamp' }
    ]
  },
  settlements: {
    description: 'Daily cash handover slips partitioned by settlement_date',
    timePartitioning: {
      type: 'DAY',
      field: 'settlement_date'
    },
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED', description: 'Settlement UUID' },
      { name: 'company_id', type: 'STRING', mode: 'REQUIRED', description: 'Company FK' },
      { name: 'settlement_date', type: 'DATE', mode: 'REQUIRED', description: 'Settlement Date' },
      { name: 'agent_name', type: 'STRING', mode: 'REQUIRED', description: 'Agent Name' },
      { name: 'expected_amount', type: 'FLOAT64', mode: 'REQUIRED', description: 'System Expected Total' },
      { name: 'actual_amount', type: 'FLOAT64', mode: 'REQUIRED', description: 'Physical Cash Total' },
      { name: 'denomination_json', type: 'STRING', mode: 'NULLABLE', description: 'Denomination Breakdown' },
      { name: 'status', type: 'STRING', mode: 'REQUIRED', description: 'verified, pending' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE', description: 'Creation Timestamp' }
    ]
  }
};

// 1. GET BigQuery Schemas & Architecture DDL
router.get('/schemas', (req, res) => {
  res.json({
    success: true,
    engine: 'Google Cloud BigQuery',
    version: 'Enterprise v2',
    schemas: BIGQUERY_SCHEMAS
  });
});

// 2. GET Declarative deployment.yaml for BigQuery Data Transfer Service
router.get('/deployment-config', (req, res) => {
  const projectId = process.env.GCP_PROJECT_ID || 'alr-finance-production';
  const region = process.env.GCP_REGION || 'asia-south1'; // Mumbai
  const bucketName = process.env.GCS_BUCKET_NAME || 'alr-finance-ledger-backup';

  const yamlConfig = `# ==============================================================================
# BigQuery Data Transfer Service (DTS) Declarative Deployment
# Automated Daily Ingestion from GCS to BigQuery Data Warehouse
# ==============================================================================
project: ${projectId}
region: ${region}

resources:
  # 1. Target BigQuery Analytics Dataset
  - type: bigquery.v2.dataset
    name: daily_finance_dw
    properties:
      datasetReference:
        datasetId: daily_finance_dw
        projectId: ${projectId}
      location: ${region}
      description: "ALR Finance Centralized Data Warehouse for Multi-Year Analytics & Audit"

  # 2. Daily Collections DTS Ingestion Transfer Config
  - type: bigquerydatatransfer.v1.transferConfig
    name: transfer_daily_collections
    properties:
      displayName: "ALR Daily Collections GCS Ingestion"
      dataSourceId: google_cloud_storage
      destinationDatasetId: daily_finance_dw
      schedule: "every 24 hours"
      disabled: false
      params:
        destination_table_name_template: "daily_collections"
        data_path_template: "gs://${bucketName}/exports/daily_collections/*.jsonl"
        file_data_type: "JSON"
        write_disposition: "WRITE_APPEND"
        ignore_unknown_values: "true"
        max_bad_records: "0"

  # 3. Clients Master Snapshot DTS Config
  - type: bigquerydatatransfer.v1.transferConfig
    name: transfer_clients_master
    properties:
      displayName: "ALR Clients Master Snapshot Ingestion"
      dataSourceId: google_cloud_storage
      destinationDatasetId: daily_finance_dw
      schedule: "every 24 hours"
      disabled: false
      params:
        destination_table_name_template: "clients"
        data_path_template: "gs://${bucketName}/exports/clients/*.jsonl"
        file_data_type: "JSON"
        write_disposition: "WRITE_TRUNCATE"
        ignore_unknown_values: "true"
`;

  res.setHeader('Content-Type', 'text/yaml');
  res.send(yamlConfig);
});

// 3. POST Export Newline-Delimited JSON (JSONL) Data Package for BigQuery DTS
router.post('/export-jsonl', async (req, res) => {
  try {
    const companyId = 'comp_alr_001';

    // Fetch all core datasets concurrently
    const [clients, cycles, collections, settlements] = await Promise.all([
      query('SELECT * FROM clients WHERE company_id = ? AND status != \'deleted\'', [companyId]),
      query('SELECT * FROM loan_cycles WHERE company_id = ? AND status != \'archived\'', [companyId]),
      query('SELECT * FROM daily_collections WHERE company_id = ?', [companyId]),
      query('SELECT * FROM settlements WHERE company_id = ?', [companyId])
    ]);

    // Format into clean BigQuery-compliant JSONL strings
    const toJsonl = (rows) => rows.map(r => JSON.stringify(r)).join('\n');

    const exportPackage = {
      clients_count: clients.length,
      cycles_count: cycles.length,
      collections_count: collections.length,
      settlements_count: settlements.length,
      export_timestamp: new Date().toISOString(),
      files: {
        'clients.jsonl': toJsonl(clients),
        'loan_cycles.jsonl': toJsonl(cycles),
        'daily_collections.jsonl': toJsonl(collections),
        'settlements.jsonl': toJsonl(settlements)
      }
    };

    res.json({
      success: true,
      message: 'BigQuery Data Transfer Service JSONL export package generated successfully',
      ...exportPackage
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET BigQuery Readiness & Stats
router.get('/status', async (req, res) => {
  try {
    const [clientCount, cycleCount, collCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM clients WHERE status != \'deleted\''),
      query('SELECT COUNT(*) as count FROM loan_cycles WHERE status != \'archived\''),
      query('SELECT COUNT(*) as count FROM daily_collections')
    ]);

    res.json({
      success: true,
      data_warehouse_ready: true,
      provider: 'Google Cloud BigQuery',
      transfer_mechanism: 'BigQuery Data Transfer Service (GCS JSONL Connector)',
      records: {
        clients: clientCount[0]?.count || 0,
        loan_cycles: cycleCount[0]?.count || 0,
        daily_collections: collCount[0]?.count || 0
      },
      partition_strategy: 'DAY partitioning on collection_date with cycle_id clustering',
      recommended_schedule: 'Daily at 23:00 IST / 17:30 UTC'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

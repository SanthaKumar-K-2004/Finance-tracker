import { db, query, execute, batch, initSchema } from './db.js';
import { serverCache } from './utils/cache.js';

export async function seedDiverse20() {
  await initSchema();

  console.log('🌱 Seeding 20 diverse, enterprise-grade clients and cycles...');

  // Ensure Company exists
  const companyId = 'comp_alr_001';
  const existingCompanies = await query('SELECT id FROM companies WHERE id = ?', [companyId]);
  if (existingCompanies.length === 0) {
    await execute(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
        'Daily Collection & Microfinance',
        '9585194934',
        'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
        'ta'
      ]
    );
  }

  const clientsData = [
    {
      sl_no: 1,
      client_code: 'ALR-01',
      name: 'P. Murugan (முருகன்)',
      phone: '9840112201',
      address: 'அலங்காநல்லூர், மதுரை (Alanganallur)',
      principal: 10000,
      daily_amount: 500,
      paid_days_count: 20, // 20 * 500 = 10,000 -> CLEARED
      history: true
    },
    {
      sl_no: 2,
      client_code: 'ALR-02',
      name: 'K. Selvi (செல்வி)',
      phone: '9840112202',
      address: 'வாடிப்பட்டி (Vadipatti)',
      principal: 15000,
      daily_amount: 500,
      paid_days_count: 16, // 16 * 500 = 8,000 -> PARTIAL (53%)
      history: true
    },
    {
      sl_no: 3,
      client_code: 'ALR-03',
      name: 'M. Saravanan (சரவணன்)',
      phone: '9840112203',
      address: 'சோழவந்தான் (Sholavandan)',
      principal: 8000,
      daily_amount: 400,
      paid_days_count: 6, // 6 * 400 = 2,400 -> PENDING (30%)
      history: true
    },
    {
      sl_no: 4,
      client_code: 'ALR-04',
      name: 'S. Priya (பிரியா)',
      phone: '9840112204',
      address: 'சமயநல்லூர் (Samayanallur)',
      principal: 12000,
      daily_amount: 500,
      paid_days_count: 8, // 8 * 500 = 4,000 -> PENDING
      history: false
    },
    {
      sl_no: 5,
      client_code: 'ALR-05',
      name: 'R. Karthik (கார்த்திக்)',
      phone: '9840112205',
      address: 'ஒத்தக்கடை (Othakadai)',
      principal: 20000,
      daily_amount: 500,
      paid_days_count: 2, // 2 * 500 = 1,000 -> HIGH BALANCE PENDING
      history: false
    },
    {
      sl_no: 6,
      client_code: 'ALR-06',
      name: 'V. Lakshmi (லக்ஷ்மி)',
      phone: '9840112206',
      address: 'மேலூர் (Melur)',
      principal: 5000,
      daily_amount: 500,
      paid_days_count: 10, // 10 * 500 = 5,000 -> CLEARED
      history: true
    },
    {
      sl_no: 7,
      client_code: 'ALR-07',
      name: 'A. Ramesh (ரமேஷ்)',
      phone: '9840112207',
      address: 'திருமங்கலம் (Thirumangalam)',
      principal: 25000,
      daily_amount: 1000,
      paid_days_count: 18, // 18 * 1000 = 18,000 -> PARTIAL (72%)
      history: true
    },
    {
      sl_no: 8,
      client_code: 'ALR-08',
      name: 'G. Meena (மீனா)',
      phone: '9840112208',
      address: 'உசிலம்பட்டி (Usilampatti)',
      principal: 18000,
      daily_amount: 600,
      paid_days_count: 7, // 7 * 600 = 4,200 -> PENDING
      history: false
    },
    {
      sl_no: 9,
      client_code: 'ALR-09',
      name: 'T. Senthil (செந்தில்)',
      phone: '9840112209',
      address: 'கோரிப்பாளையம் (Goripalayam)',
      principal: 10000,
      daily_amount: 500,
      paid_days_count: 5, // 5 * 500 = 2,500 -> PENDING
      history: false
    },
    {
      sl_no: 10,
      client_code: 'ALR-10',
      name: 'N. Kavitha (கவிதா)',
      phone: '9840112210',
      address: 'சிம்மக்கல் (Simmakkal)',
      principal: 30000,
      daily_amount: 1000,
      paid_days_count: 8, // 8 * 1000 = 8,000 -> PENDING
      history: true
    },
    {
      sl_no: 11,
      client_code: 'ALR-11',
      name: 'D. Vijay (விஜய்)',
      phone: '9840112211',
      address: 'வில்லாபுரம் (Villapuram)',
      principal: 12000,
      daily_amount: 500,
      paid_days_count: 24, // 24 * 500 = 12,000 -> CLEARED
      history: true
    },
    {
      sl_no: 12,
      client_code: 'ALR-12',
      name: 'B. Anitha (அனிதா)',
      phone: '9840112212',
      address: 'அண்ணா நகர் (Anna Nagar)',
      principal: 16000,
      daily_amount: 600,
      paid_days_count: 6, // 6 * 600 = 3,600 -> PENDING
      history: false
    },
    {
      sl_no: 13,
      client_code: 'ALR-13',
      name: 'C. Dinesh (தினேஷ்)',
      phone: '9840112213',
      address: 'தெப்பக்குளம் (Teppakulam)',
      principal: 22000,
      daily_amount: 800,
      paid_days_count: 20, // 20 * 800 = 16,000 -> PARTIAL (73%)
      history: true
    },
    {
      sl_no: 14,
      client_code: 'ALR-14',
      name: 'K. Deepa (தீபா)',
      phone: '9840112214',
      address: 'செல்லூர் (Sellur)',
      principal: 28000,
      daily_amount: 1000,
      paid_days_count: 1, // 1 * 1000 = 1,000 -> HIGH BALANCE PENDING
      history: false
    },
    {
      sl_no: 15,
      client_code: 'ALR-15',
      name: 'M. Manikandan (மணிகண்டன்)',
      phone: '9840112215',
      address: 'பழங்காநத்தம் (Palanganatham)',
      principal: 35000,
      daily_amount: 1200,
      paid_days_count: 6, // 6 * 1200 = 7,200 -> PENDING
      history: false
    },
    {
      sl_no: 16,
      client_code: 'ALR-16',
      name: 'J. Suganya (சுகன்யா)',
      phone: '9840112216',
      address: 'மாட்டுத்தாவணி (Mattuthavani)',
      principal: 6000,
      daily_amount: 500,
      paid_days_count: 12, // 12 * 500 = 6,000 -> CLEARED
      history: true
    },
    {
      sl_no: 17,
      client_code: 'ALR-17',
      name: 'P. Vignesh (விக்னேஷ்)',
      phone: '9840112217',
      address: 'கூடல் நகர் (Koodal Nagar)',
      principal: 40000,
      daily_amount: 1500,
      paid_days_count: 7, // 7 * 1500 = 10,500 -> PENDING
      history: false
    },
    {
      sl_no: 18,
      client_code: 'ALR-18',
      name: 'R. Banu (பானு)',
      phone: '9840112218',
      address: 'நாகமலை புதுக்கோட்டை (Nagamalai)',
      principal: 14000,
      daily_amount: 600,
      paid_days_count: 14, // 14 * 600 = 8,400 -> PARTIAL (60%)
      history: false
    },
    {
      sl_no: 19,
      client_code: 'ALR-19',
      name: 'S. Muthukumar (முத்துக்குமார்)',
      phone: '9840112219',
      address: 'பசுமலை (Pasumalai)',
      principal: 50000,
      daily_amount: 1500,
      paid_days_count: 3, // 3 * 1500 = 4,500 -> HIGH BALANCE PENDING
      history: false
    },
    {
      sl_no: 20,
      client_code: 'ALR-20',
      name: 'E. Revathi (ரேவதி)',
      phone: '9840112220',
      address: 'திருப்பரங்குன்றம் (Tirupparankunram)',
      principal: 24000,
      daily_amount: 800,
      paid_days_count: 4, // 4 * 800 = 3,200 -> PENDING
      history: true
    }
  ];

  const clientInserts = [];
  const cycleInserts = [];
  const collectionInserts = [];

  for (const c of clientsData) {
    const clientId = `client_${c.sl_no}_alr`;
    clientInserts.push({
      sql: `INSERT OR REPLACE INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      args: [clientId, companyId, c.sl_no, c.client_code, c.name, c.phone, c.address]
    });

    // 1. October 2026 Cycle (Active Current Month)
    const cycleIdOct = `cycle_${c.sl_no}_2026_10`;
    cycleInserts.push({
      sql: `INSERT OR REPLACE INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
            VALUES (?, ?, ?, '2026-10', 'October 2026', ?, '2026-10-01', '2026-10-31', 31, 'active')`,
      args: [cycleIdOct, companyId, clientId, c.principal]
    });

    // Collections for October 2026
    for (let day = 1; day <= c.paid_days_count; day++) {
      const colDate = `2026-10-${String(day).padStart(2, '0')}`;
      const colId = `col_${c.sl_no}_2026_10_${day}`;
      collectionInserts.push({
        sql: `INSERT OR REPLACE INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'Agent')`,
        args: [colId, companyId, cycleIdOct, clientId, day, colDate, c.daily_amount]
      });
    }

    // 2. September 2026 Cycle (For clients with history)
    if (c.history) {
      const cycleIdSep = `cycle_${c.sl_no}_2026_09`;
      cycleInserts.push({
        sql: `INSERT OR REPLACE INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
              VALUES (?, ?, ?, '2026-09', 'September 2026', ?, '2026-09-01', '2026-09-30', 30, 'closed')`,
        args: [cycleIdSep, companyId, clientId, c.principal]
      });

      // Collections for September 2026 (Completed)
      const sepDays = Math.min(25, Math.ceil(c.principal / c.daily_amount));
      for (let day = 1; day <= sepDays; day++) {
        const colDate = `2026-09-${String(day).padStart(2, '0')}`;
        const colId = `col_${c.sl_no}_2026_09_${day}`;
        collectionInserts.push({
          sql: `INSERT OR REPLACE INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'Agent')`,
          args: [colId, companyId, cycleIdSep, clientId, day, colDate, c.daily_amount]
        });
      }
    }
  }

  // Closed records for Closed Archive tab
  const closedRecords = [
    {
      id: 'closed_arch_001',
      client_id: 'client_closed_1',
      client_name: 'R. Sundar (சுந்தர்)',
      phone: '9840998811',
      address: 'அலங்காநல்லூர் (Alanganallur)',
      month_year: '2026-08',
      principal: 10000,
      total_collected: 10000,
      remaining_at_closure: 0,
      settlement_amount: 10000,
      closure_reason: 'Full loan cleared successfully (முழு கடன் செலுத்தி முடிக்கப்பட்டது)',
      closed_date: '2026-08-31'
    },
    {
      id: 'closed_arch_002',
      client_id: 'client_closed_2',
      client_name: 'M. Kalavathi (கலாவதி)',
      phone: '9840998822',
      address: 'வாடிப்பட்டி (Vadipatti)',
      month_year: '2026-07',
      principal: 15000,
      total_collected: 15000,
      remaining_at_closure: 0,
      settlement_amount: 15000,
      closure_reason: 'Early closure with special settlement (முன்கூட்டியே முடித்து கணக்கு நேர் செய்யப்பட்டது)',
      closed_date: '2026-07-31'
    },
    {
      id: 'closed_arch_003',
      client_id: 'client_closed_3',
      client_name: 'K. Balaji (பாலாஜி)',
      phone: '9840998833',
      address: 'திருமங்கலம் (Thirumangalam)',
      month_year: '2026-06',
      principal: 20000,
      total_collected: 20000,
      remaining_at_closure: 0,
      settlement_amount: 20000,
      closure_reason: 'Regular closure on cycle completion (தவணைக்காலம் முடிந்து கணக்கு நிறைவுற்றது)',
      closed_date: '2026-06-30'
    }
  ];

  const closedInserts = closedRecords.map(r => ({
    sql: `INSERT OR REPLACE INTO closed_clients (
      id, company_id, client_id, cycle_id, client_name, phone,
      final_principal, total_collected, excess_amount,
      closed_date, closure_reason, snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      r.id, companyId, r.client_id, `cycle_${r.id}`, r.client_name, r.phone,
      r.principal, r.total_collected, 0,
      r.closed_date, r.closure_reason, JSON.stringify(r)
    ]
  }));

  console.log(`Writing ${clientInserts.length} clients...`);
  await batch(clientInserts);

  console.log(`Writing ${cycleInserts.length} loan cycles...`);
  await batch(cycleInserts);

  console.log(`Writing ${collectionInserts.length} daily collections in chunks...`);
  // Insert collections in chunks of 50 to avoid any network size limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < collectionInserts.length; i += CHUNK_SIZE) {
    const chunk = collectionInserts.slice(i, i + CHUNK_SIZE);
    await batch(chunk);
  }

  console.log(`Writing ${closedInserts.length} closed archive records...`);
  await batch(closedInserts);

  // Invalidate serverCache
  serverCache.invalidateTag('clients');
  serverCache.invalidateTag('collections');
  serverCache.invalidateTag('dashboard');
  serverCache.invalidateTag('reports');

  console.log('✅ Diverse 20 clients seeded successfully!');
}

// Run directly if called via node CLI
if (process.argv[1] && process.argv[1].endsWith('seedDiverse20.js')) {
  seedDiverse20()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

import { query, execute } from './db.js';

const companyId = 'comp_alr_001';
const monthYear = '2026-10';

const sampleBorrowers = [
  { sl_no: 1, client_code: 'ALR-01', name: 'P. Murugan (முருகன்)', phone: '9840112201', address: 'அலங்காநல்லூர்', principal: 10000, paid: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] }, // 10000 Cleared
  { sl_no: 2, client_code: 'ALR-02', name: 'K. Selvi (செல்வி)', phone: '9840112202', address: 'வாடிப்பட்டி', principal: 15000, paid: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500] }, // 5000 Partial
  { sl_no: 3, client_code: 'ALR-03', name: 'M. Senthil (செந்தில்)', phone: '9840112203', address: 'அலங்காநல்லூர்', principal: 12000, paid: [400, 400, 400, 400, 400] }, // 2000 Partial
  { sl_no: 4, client_code: 'ALR-04', name: 'S. Priya (பிரியா)', phone: '9840112204', address: 'மதுரை', principal: 20000, paid: [] }, // 0 Zero/Pending
  { sl_no: 5, client_code: 'ALR-05', name: 'R. Kumar (குமார்)', phone: '9840112205', address: 'சோழவந்தான்', principal: 10000, paid: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] }, // 10000 Cleared
  { sl_no: 6, client_code: 'ALR-06', name: 'V. Lakshmi (லக்ஷ்மி)', phone: '9840112206', address: 'மேலூர்', principal: 15000, paid: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600] }, // 15000 Cleared
  { sl_no: 7, client_code: 'ALR-07', name: 'A. Anbu (அன்பு)', phone: '9840112207', address: 'வாடிப்பட்டி', principal: 10000, paid: [400, 400, 400] }, // 1200 Pending
  { sl_no: 8, client_code: 'ALR-08', name: 'T. Kavitha (கவிதா)', phone: '9840112208', address: 'அலங்காநல்லூர்', principal: 25000, paid: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] }, // 25000 Cleared
  { sl_no: 9, client_code: 'ALR-09', name: 'N. Pandi (பாண்டி)', phone: '9840112209', address: 'சமயநல்லூர்', principal: 10000, paid: [500, 500, 500, 500] }, // 2000 Partial
  { sl_no: 10, client_code: 'ALR-10', name: 'C. Meena (மீனா)', phone: '9840112210', address: 'மதுரை', principal: 12000, paid: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600] }, // 12000 Cleared
  { sl_no: 11, client_code: 'ALR-11', name: 'D. Vijay (விஜய்)', phone: '9840112211', address: 'வில்லாபுரம்', principal: 18000, paid: [800, 800, 800, 800, 800] }, // 4000 Partial
  { sl_no: 12, client_code: 'ALR-12', name: 'G. Geetha (கீதா)', phone: '9840112212', address: 'உசிலம்பட்டி', principal: 10000, paid: [] }, // 0 Pending
  { sl_no: 13, client_code: 'ALR-13', name: 'J. Jothi (ஜோதி)', phone: '9840112213', address: 'மேலூர்', principal: 15000, paid: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] }, // 15000 Cleared
  { sl_no: 14, client_code: 'ALR-14', name: 'B. Balan (பாலன்)', phone: '9840112214', address: 'சோழவந்தான்', principal: 10000, paid: [400, 400, 400, 400, 400, 400] }, // 2400 Partial
  { sl_no: 15, client_code: 'ALR-15', name: 'K. Karpagam (கற்பகம்)', phone: '9840112215', address: 'அலங்காநல்லூர்', principal: 20000, paid: [800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800] }, // 20000 Cleared
  { sl_no: 16, client_code: 'ALR-16', name: 'M. Muthu (முத்து)', phone: '9840112216', address: 'வாடிப்பட்டி', principal: 10000, paid: [500, 500] }, // 1000 Pending
  { sl_no: 17, client_code: 'ALR-17', name: 'S. Saranya (சரண்யா)', phone: '9840112217', address: 'மதுரை', principal: 12000, paid: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600] }, // 12000 Cleared
  { sl_no: 18, client_code: 'ALR-18', name: 'R. Rajesh (ராஜேஷ்)', phone: '9840112218', address: 'சமயநல்லூர்', principal: 15000, paid: [500, 500, 500, 500, 500] }, // 2500 Partial
  { sl_no: 19, client_code: 'ALR-19', name: 'V. Valli (வள்ளி)', phone: '9840112219', address: 'உசிலம்பட்டி', principal: 10000, paid: [] }, // 0 Pending
  { sl_no: 20, client_code: 'snop65d', name: 'E. Revathi (ரேவதி)', phone: '9840112220', address: 'திருப்பரங்குன்றம்', principal: 16000, paid: [800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800] } // 16000 Cleared
];

async function seedBorrowers() {
  console.log('🌱 Seeding 20 Tamil Nadu microfinance borrowers for October 2026...');

  for (const b of sampleBorrowers) {
    const clientId = `client_${b.sl_no}_alr`;
    const cycleId = `cycle_${b.sl_no}_2026_10`;

    await execute(
      `INSERT OR REPLACE INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [clientId, companyId, b.sl_no, b.client_code, b.name, b.phone, b.address]
    );

    await execute(
      `INSERT OR REPLACE INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
       VALUES (?, ?, ?, ?, 'October 2026 (அக்டோபர்)', ?, '2026-10-01', '2026-10-31', 31, 'active')`,
      [cycleId, companyId, clientId, monthYear, b.principal]
    );

    // Delete existing daily collections for cycle
    await execute(`DELETE FROM daily_collections WHERE cycle_id = ?`, [cycleId]);

    // Insert payments
    if (b.paid && b.paid.length > 0) {
      for (let day = 1; day <= b.paid.length; day++) {
        const amt = b.paid[day - 1];
        const dayPadded = String(day).padStart(2, '0');
        const colDate = `2026-10-${dayPadded}`;
        const collId = `coll_${cycleId}_d${day}`;

        await execute(
          `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'Agent')`,
          [collId, companyId, cycleId, clientId, day, colDate, amt]
        );
      }
    }
  }

  console.log('✅ Successfully seeded 20 borrowers with cycles and payments!');
  process.exit(0);
}

seedBorrowers().catch(err => {
  console.error('❌ Error seeding borrowers:', err);
  process.exit(1);
});

import express from 'express';
import { query, execute } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = express.Router();

const DEFAULT_COMPANY = {
  id: 'comp_alr_001',
  name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
  tagline: 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்',
  phone: '9585194934',
  address: 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
  default_language: 'ta'
};

// GET Active Company / Shop Profile
router.get('/', async (req, res) => {
  try {
    const company = await serverCache.getOrFetch('company_profile', async () => {
      const rows = await query('SELECT * FROM companies LIMIT 1');
      if (rows.length > 0) {
        return rows[0];
      }
      // Insert default if table was empty
      await execute(
        `INSERT OR IGNORE INTO companies (id, name, tagline, phone, address, default_language)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          DEFAULT_COMPANY.id,
          DEFAULT_COMPANY.name,
          DEFAULT_COMPANY.tagline,
          DEFAULT_COMPANY.phone,
          DEFAULT_COMPANY.address,
          DEFAULT_COMPANY.default_language
        ]
      );
      return DEFAULT_COMPANY;
    }, 5 * 60 * 1000, ['company']);

    res.json({
      success: true,
      data: company
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Update Company / Shop Profile
router.put('/', async (req, res) => {
  try {
    const { name, tagline, phone, address, default_language } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Shop name is required and must be at least 2 characters'
      });
    }

    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanAddress = address ? String(address).trim() : '';
    const cleanTagline = tagline ? String(tagline).trim() : '';
    const cleanLang = default_language || 'ta';

    // Find current company ID
    const currentRows = await query('SELECT id FROM companies LIMIT 1');
    const companyId = currentRows.length > 0 ? currentRows[0].id : 'comp_alr_001';

    await execute(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         tagline = excluded.tagline,
         phone = excluded.phone,
         address = excluded.address,
         default_language = excluded.default_language`,
      [companyId, name.trim(), cleanTagline, cleanPhone, cleanAddress, cleanLang]
    );

    // Invalidate cache immediately
    serverCache.invalidateTag('company');
    serverCache.invalidateTag('reports');

    const updatedRows = await query('SELECT * FROM companies WHERE id = ?', [companyId]);
    const updated = updatedRows.length > 0 ? updatedRows[0] : { id: companyId, name, tagline: cleanTagline, phone: cleanPhone, address: cleanAddress, default_language: cleanLang };

    res.json({
      success: true,
      message: 'Shop profile updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

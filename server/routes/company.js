import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query, execute } from '../db.js';
import { serverCache } from '../utils/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const uploadsDir = path.resolve(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.png';
    cb(null, `shop-logo-${Date.now()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Please upload PNG, JPG, WebP, or SVG.'));
    }
  }
});

const DEFAULT_COMPANY = {
  id: 'comp_alr_001',
  name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
  tagline: 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்',
  phone: '9585194934',
  address: 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
  default_language: 'ta',
  logo_url: null
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
        `INSERT OR IGNORE INTO companies (id, name, tagline, phone, address, default_language, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          DEFAULT_COMPANY.id,
          DEFAULT_COMPANY.name,
          DEFAULT_COMPANY.tagline,
          DEFAULT_COMPANY.phone,
          DEFAULT_COMPANY.address,
          DEFAULT_COMPANY.default_language,
          DEFAULT_COMPANY.logo_url
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
    const { name, tagline, phone, address, default_language, logo_url } = req.body;

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
    const currentRows = await query('SELECT id, logo_url FROM companies LIMIT 1');
    const companyId = currentRows.length > 0 ? currentRows[0].id : 'comp_alr_001';
    const finalLogoUrl = logo_url !== undefined ? logo_url : (currentRows[0]?.logo_url || null);

    await execute(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language, logo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         tagline = excluded.tagline,
         phone = excluded.phone,
         address = excluded.address,
         default_language = excluded.default_language,
         logo_url = excluded.logo_url`,
      [companyId, name.trim(), cleanTagline, cleanPhone, cleanAddress, cleanLang, finalLogoUrl]
    );

    // Invalidate cache immediately
    serverCache.invalidateTag('company');
    serverCache.invalidateTag('reports');

    const updatedRows = await query('SELECT * FROM companies WHERE id = ?', [companyId]);
    const updated = updatedRows.length > 0 ? updatedRows[0] : {
      id: companyId,
      name: name.trim(),
      tagline: cleanTagline,
      phone: cleanPhone,
      address: cleanAddress,
      default_language: cleanLang,
      logo_url: finalLogoUrl
    };

    res.json({
      success: true,
      message: 'Shop profile updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Upload Shop Logo (Supports multipart file upload OR base64 data URI)
router.post('/logo', (req, res, next) => {
  // Check if content-type is multipart
  if (req.is('multipart/form-data')) {
    upload.single('logo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
  try {
    let logoUrl = null;

    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body && req.body.logo_data) {
      // Base64 Data URL support
      const dataUri = String(req.body.logo_data).trim();
      if (!dataUri.startsWith('data:image/')) {
        return res.status(400).json({ success: false, error: 'Invalid image data format. Must be data:image/...' });
      }
      logoUrl = dataUri;
    } else if (req.body && req.body.logo_url) {
      logoUrl = String(req.body.logo_url).trim();
    } else {
      return res.status(400).json({ success: false, error: 'No logo file or image data provided' });
    }

    const currentRows = await query('SELECT id FROM companies LIMIT 1');
    const companyId = currentRows.length > 0 ? currentRows[0].id : 'comp_alr_001';

    await execute(
      `UPDATE companies SET logo_url = ? WHERE id = ?`,
      [logoUrl, companyId]
    );

    serverCache.invalidateTag('company');
    serverCache.invalidateTag('reports');

    const updatedRows = await query('SELECT * FROM companies WHERE id = ?', [companyId]);
    res.json({
      success: true,
      message: 'Shop logo uploaded successfully',
      logo_url: logoUrl,
      data: updatedRows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE Shop Logo
router.delete('/logo', async (req, res) => {
  try {
    const currentRows = await query('SELECT id FROM companies LIMIT 1');
    const companyId = currentRows.length > 0 ? currentRows[0].id : 'comp_alr_001';

    await execute(`UPDATE companies SET logo_url = NULL WHERE id = ?`, [companyId]);

    serverCache.invalidateTag('company');
    serverCache.invalidateTag('reports');

    const updatedRows = await query('SELECT * FROM companies WHERE id = ?', [companyId]);
    res.json({
      success: true,
      message: 'Shop logo removed successfully',
      data: updatedRows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

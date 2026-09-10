import express from 'express';

const router = express.Router();

// In-memory / persistent shop registry with standard Tamil Nadu microfinance defaults
let registeredShops = [
  {
    id: 'comp_alr_001',
    code: 'SHOP-ALR-01',
    name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
    tagline: 'Daily Collection & Microfinance',
    phone: '9585194934',
    address: 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
    default_language: 'ta',
    badge: 'Primary Flagship',
    client_count: 24,
    routes: 'அலங்காநல்லூர், மேலூர், வாடிப்பட்டி',
    pin: '1234'
  },
  {
    id: 'comp_vdp_002',
    code: 'SHOP-VDP-02',
    name: 'Vadipatti Branch (வாடிப்பட்டி கிளை)',
    tagline: 'Micro Loans & Daily Recovery',
    phone: '9842100000',
    address: 'வாடிப்பட்டி, மதுரை (Vadipatti, Madurai)',
    default_language: 'ta',
    badge: 'Branch Office',
    client_count: 18,
    routes: 'மெயின் பஜார், மேற்கு வீதி',
    pin: '1234'
  },
  {
    id: 'comp_mlr_003',
    code: 'SHOP-MLR-03',
    name: 'Melur Branch (மேலூர் கிளை)',
    tagline: 'Rural Enterprise Credit',
    phone: '9789000000',
    address: 'மேலூர், மதுரை (Melur, Madurai)',
    default_language: 'ta',
    badge: 'Branch Office',
    client_count: 12,
    routes: 'பஸ் ஸ்டாண்ட் ரோடு, கிழக்கு தெரு',
    pin: '1234'
  }
];

// 1. GET /api/shops - Return all active shop branches
router.get('/', (req, res) => {
  try {
    const sanitized = registeredShops.map(({ pin, ...rest }) => rest);
    res.json({
      success: true,
      data: sanitized,
      count: sanitized.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/shops/login - Authenticate with shop code and pin
router.post('/login', (req, res) => {
  try {
    const { shopId, pin } = req.body;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID or Code is required' });
    }

    const cleanId = shopId.trim().toLowerCase();
    const found = registeredShops.find(
      (s) => s.id.toLowerCase() === cleanId || s.code.toLowerCase() === cleanId
    );

    if (!found) {
      return res.status(404).json({
        success: false,
        error: `No branch found matching '${shopId}'. Try 'SHOP-ALR-01'`
      });
    }

    // Default PIN: 1234 if not customized
    if (pin && found.pin && found.pin !== pin.trim()) {
      return res.status(401).json({ success: false, error: 'Invalid PIN. Default PIN is 1234' });
    }

    const { pin: _p, ...sanitized } = found;
    res.json({
      success: true,
      data: sanitized,
      message: `Authenticated as ${found.name}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/shops/register - Onboard a new branch
router.post('/register', (req, res) => {
  try {
    const { name, tagline, phone, address, routes, pin } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Shop Name is required' });
    }

    const nextIndex = registeredShops.length + 1;
    const code = `SHOP-BR-${String(nextIndex).padStart(2, '0')}`;
    const id = `comp_${Date.now().toString(36)}`;

    const newShop = {
      id,
      code,
      name: name.trim(),
      tagline: (tagline || 'Daily Collection & Microfinance').trim(),
      phone: (phone || '').trim(),
      address: (address || 'Tamil Nadu').trim(),
      default_language: 'ta',
      badge: 'New Branch',
      client_count: 0,
      routes: (routes || 'All Routes').trim(),
      pin: (pin || '1234').trim()
    };

    registeredShops.push(newShop);

    const { pin: _p, ...sanitized } = newShop;
    res.status(201).json({
      success: true,
      data: sanitized,
      message: `Branch '${newShop.name}' successfully registered with Code ${code}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

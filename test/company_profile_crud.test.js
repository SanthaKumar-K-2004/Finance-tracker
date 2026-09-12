import { test, describe } from 'node:test';
import assert from 'node:assert';

const API_BASE = 'http://localhost:5000';

describe('🏢 Company & Shop Profile Editable Management Tests', () => {
  let initialProfile = null;

  test('1. GET /api/company returns current active shop profile', async () => {
    const res = await fetch(`${API_BASE}/api/company`);
    assert.strictEqual(res.status, 200, 'GET /api/company must return 200');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Company data must be defined');
    assert.ok(json.data.name, 'Shop name must exist');
    assert.ok(json.data.phone, 'Phone must exist');
    assert.ok(json.data.address, 'Address must exist');

    initialProfile = { ...json.data };
  });

  test('2. PUT /api/company rejects empty or invalid shop name', async () => {
    const res = await fetch(`${API_BASE}/api/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ' ' })
    });
    assert.strictEqual(res.status, 400, 'Empty name should return 400 Bad Request');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes('at least 2 characters'));
  });

  test('3. PUT /api/company updates shop profile details and invalidates cache', async () => {
    const updatedPayload = {
      name: 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்) Updated',
      tagline: 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர் கிளை',
      phone: '9585194934',
      address: 'மெயின் ரோடு, அலங்காநல்லூர், மதுரை (Main Road, Alanganallur)'
    };

    const updateRes = await fetch(`${API_BASE}/api/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload)
    });
    assert.strictEqual(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.strictEqual(updateJson.success, true);
    assert.strictEqual(updateJson.data.name, updatedPayload.name);
    assert.strictEqual(updateJson.data.tagline, updatedPayload.tagline);
    assert.strictEqual(updateJson.data.address, updatedPayload.address);

    // Verify GET immediately returns fresh updated data (cache invalidation verified)
    const getRes = await fetch(`${API_BASE}/api/company`);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.data.name, updatedPayload.name);
    assert.strictEqual(getJson.data.tagline, updatedPayload.tagline);
    assert.strictEqual(getJson.data.address, updatedPayload.address);
  });

  test('4. Restore initial shop profile for test idempotency', async () => {
    if (initialProfile) {
      const restoreRes = await fetch(`${API_BASE}/api/company`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: initialProfile.name,
          tagline: initialProfile.tagline,
          phone: initialProfile.phone,
          address: initialProfile.address
        })
      });
      assert.strictEqual(restoreRes.status, 200);
      const restoreJson = await restoreRes.json();
      assert.strictEqual(restoreJson.success, true);
      assert.strictEqual(restoreJson.data.name, initialProfile.name);
    }
  });
});

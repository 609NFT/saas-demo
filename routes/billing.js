const express = require('express');
const users = require('../lib/users');
const billing = require('../lib/billing');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    const user = users.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await billing.createCheckoutSession({ plan, user, origin });
    res.json(result);
  } catch (err) {
    const msg = err && err.message ? err.message : 'checkout_failed';
    res.status(400).json({ error: msg });
  }
});

router.get('/plans', (req, res) => {
  res.json({ plans: billing.PLANS });
});

module.exports = router;

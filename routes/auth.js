const express = require('express');
const users = require('../lib/users');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
    if (String(password).length < 8) return res.status(400).json({ error: 'password_too_short' });
    const user = await users.createUser({ email, password, name });
    req.session.userId = user.id;
    res.json({ user });
  } catch (err) {
    const msg = err && err.message ? err.message : 'signup_failed';
    const status = msg === 'email_taken' ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
    const user = users.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await users.verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    req.session.userId = user.id;
    res.json({ user: users.publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'login_failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', requireAuth, (req, res) => {
  const user = users.getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'not_authenticated' });
  }
  res.json({ user: users.publicUser(user) });
});

module.exports = router;

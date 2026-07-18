const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

const users = require('./lib/users');
const billing = require('./lib/billing');
const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');

const app = express();
const PORT = process.env.PORT || 3000;

// Sign session cookies with a real secret. If one isn't provided, generate a
// random one so sessions can never be forged with a public known default —
// the tradeoff is that sessions reset on restart until SESSION_SECRET is set.
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set — generated a random one. Sessions will NOT survive a restart until you set SESSION_SECRET.');
}

// Stripe webhook — MUST be mounted before express.json(): signature
// verification needs the raw, unparsed request body.
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fail closed — never accept unverifiable webhooks.
    return res.status(503).json({ error: 'webhook_not_configured' });
  }
  const stripe = billing.getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'stripe_not_configured' });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'signature_verification_failed' });
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const userId = s.client_reference_id || (s.metadata && s.metadata.userId);
    const plan = (s.metadata && s.metadata.plan) || 'pro';
    if (userId) users.updateUser(userId, { plan });
  }
  res.json({ received: true });
});

// Behind nginx TLS: trust the proxy so Secure cookies are honored.
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', authRoutes);
app.use('/api', billingRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`SaaS starter listening on port ${PORT}`);
});

let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const Stripe = require('stripe');
  stripeClient = new Stripe(key);
  return stripeClient;
}

const PLANS = {
  pro: { name: 'Pro', priceId: process.env.STRIPE_PRICE_PRO || null, amount: 1900 },
  team: { name: 'Team', priceId: process.env.STRIPE_PRICE_TEAM || null, amount: 4900 },
};

async function createCheckoutSession({ plan, user, origin }) {
  const stripe = getStripe();
  if (!stripe) {
    return {
      configured: false,
      message: 'Set STRIPE_SECRET_KEY (and STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM) in env vars to enable real checkout.',
    };
  }
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error('unknown_plan');
  if (!planConfig.priceId) {
    return {
      configured: false,
      message: `Set STRIPE_PRICE_${plan.toUpperCase()} env var to a Stripe Price ID to enable this plan.`,
    };
  }
  const sessionObj = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${origin}/dashboard.html?upgraded=1`,
    cancel_url: `${origin}/pricing.html`,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
  });
  return { configured: true, url: sessionObj.url };
}

module.exports = { createCheckoutSession, getStripe, PLANS };

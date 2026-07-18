const app = (() => {
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* ignore */ }
    return { ok: res.ok, status: res.status, data };
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function bindSignupForm() {
    const form = document.getElementById('signup-form');
    const err = document.getElementById('signup-error');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(err);
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      const { ok, data } = await api('/api/signup', { method: 'POST', body });
      if (!ok) return showError(err, friendly(data && data.error));
      window.location.href = '/dashboard.html';
    });
  }

  function bindLoginForm() {
    const form = document.getElementById('login-form');
    const err = document.getElementById('login-error');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(err);
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      const { ok, data } = await api('/api/login', { method: 'POST', body });
      if (!ok) return showError(err, friendly(data && data.error));
      window.location.href = '/dashboard.html';
    });
  }

  async function bindDashboard() {
    const { ok, data } = await api('/api/me');
    if (!ok) {
      window.location.href = '/login.html';
      return;
    }
    const user = data.user;
    document.getElementById('user-name').textContent = user.name || user.email;
    document.getElementById('user-plan').textContent = user.plan;
    const statPlan = document.getElementById('stat-plan');
    if (statPlan) statPlan.textContent = user.plan;
    if (user.plan !== 'free') {
      const cta = document.getElementById('upgrade-cta');
      if (cta) cta.hidden = true;
    }
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  async function bindPricingPage() {
    const nav = document.getElementById('nav-actions');
    const me = await api('/api/me');
    if (nav) {
      if (me.ok) {
        nav.innerHTML = '<a href="/dashboard.html">Dashboard</a>';
      } else {
        nav.innerHTML = '<a href="/login.html">Log in</a> <a class="btn primary" href="/signup.html">Sign up</a>';
      }
    }
    const status = document.getElementById('checkout-status');
    document.querySelectorAll('[data-checkout]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!me.ok) {
          window.location.href = '/signup.html';
          return;
        }
        const plan = btn.getAttribute('data-checkout');
        btn.disabled = true;
        const { ok, data } = await api('/api/checkout', { method: 'POST', body: { plan } });
        btn.disabled = false;
        if (!ok) {
          status.hidden = false;
          status.textContent = friendly(data && data.error);
          return;
        }
        if (data.configured && data.url) {
          window.location.href = data.url;
        } else {
          status.hidden = false;
          status.textContent = data.message || 'Stripe not configured yet.';
        }
      });
    });
  }

  function friendly(code) {
    const map = {
      email_and_password_required: 'Email and password are required.',
      password_too_short: 'Password must be at least 8 characters.',
      email_taken: 'An account with that email already exists.',
      invalid_credentials: 'Email or password is incorrect.',
      not_authenticated: 'Please log in.',
      unknown_plan: 'That plan does not exist.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  return { bindSignupForm, bindLoginForm, bindDashboard, bindPricingPage };
})();

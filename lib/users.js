const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (err) {
    // Don't silently return [] then clobber real data — quarantine the corrupt
    // file so it can be recovered, then start clean.
    const quarantine = `${USERS_FILE}.corrupt.${Date.now()}`;
    try {
      fs.renameSync(USERS_FILE, quarantine);
      console.error(`users.json was unreadable — quarantined to ${quarantine}:`, err.message);
    } catch (renameErr) {
      console.error('users.json was unreadable and could not be quarantined:', err.message, renameErr.message);
    }
    return [];
  }
}

function writeAll(users) {
  ensureStore();
  // Atomic write: fully write a temp file then rename over the target so a
  // crash mid-write can never leave a truncated/corrupt users.json.
  const tmp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
  fs.renameSync(tmp, USERS_FILE);
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

async function createUser({ email, password, name }) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !password) throw new Error('email_and_password_required');
  // Hash BEFORE reading the store so the read-modify-write below has no await
  // in the middle — otherwise two concurrent signups read the same snapshot and
  // the second writeAll clobbers the first (lost user / duplicate email).
  const passwordHash = await bcrypt.hash(password, 10);
  const users = readAll();
  if (users.find(u => u.email === email)) {
    throw new Error('email_taken');
  }
  const user = {
    id: crypto.randomUUID(),
    email,
    name: name || email.split('@')[0],
    passwordHash,
    plan: 'free',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeAll(users);
  return publicUser(user);
}

function getUserByEmail(email) {
  email = String(email || '').trim().toLowerCase();
  return readAll().find(u => u.email === email) || null;
}

function getUserById(id) {
  return readAll().find(u => u.id === id) || null;
}

async function verifyPassword(user, password) {
  if (!user || !user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

function updateUser(id, patch) {
  const users = readAll();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch };
  writeAll(users);
  return publicUser(users[idx]);
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  updateUser,
  publicUser,
};

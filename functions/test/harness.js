"use strict";
/* In-memory stand-ins for firebase-admin / firebase-functions so the real
   functions code (index.js, lib/war.js, lib/economy.js) runs in plain Node.
   The fake transaction enforces Firestore's rule that every read must come
   before the first write, so read/write ordering bugs fail the tests. */
const Module = require("module");

const clone = (o) => JSON.parse(JSON.stringify(o));
const INC = Symbol("inc");
const increment = (n) => ({ [INC]: n });
const isInc = (v) => v && typeof v === "object" && INC in v;

function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split("."); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
  const last = ks[ks.length - 1];
  o[last] = isInc(val) ? (typeof o[last] === "number" ? o[last] : 0) + val[INC] : val;
}
function mergeInto(target, src) {
  Object.keys(src).forEach((k) => {
    const v = src[k];
    if (isInc(v)) target[k] = (typeof target[k] === "number" ? target[k] : 0) + v[INC];
    else if (v && typeof v === "object" && !Array.isArray(v)) { if (typeof target[k] !== "object" || target[k] === null || Array.isArray(target[k])) target[k] = {}; mergeInto(target[k], v); }
    else target[k] = Array.isArray(v) ? clone(v) : v;
  });
}
function freeze(v) { // stores a deep-cloned plain value (increments already resolved by caller)
  return clone(v);
}

class FakeDb {
  constructor() { this.store = new Map(); this.txCount = 0; }
  doc(path) {
    const db = this;
    return {
      path, id: path.split("/").pop(),
      async get() { return db._snap(path); },
      async set(data, opts) { db._set(path, data, opts); },
      async update(data) { db._update(path, data); },
      async delete() { db.store.delete(path); },
    };
  }
  _snap(path) {
    const has = this.store.has(path);
    const data = has ? clone(this.store.get(path)) : undefined;
    return { id: path.split("/").pop(), exists: has, ref: this.doc(path), data: () => (has ? clone(data) : undefined) };
  }
  _set(path, data, opts) {
    if (opts && opts.merge) {
      const cur = this.store.has(path) ? this.store.get(path) : {};
      mergeInto(cur, data); this.store.set(path, cur);
    } else {
      const next = {}; mergeInto(next, data); this.store.set(path, next);
    }
  }
  _update(path, data) {
    if (!this.store.has(path)) throw Object.assign(new Error("NOT_FOUND: " + path), { code: 5 });
    const cur = this.store.get(path);
    Object.keys(data).forEach((k) => setPath(cur, k, data[k]));
  }
  collection(path) {
    const db = this, filters = []; let lim = Infinity;
    const q = {
      where(f, op, v) { filters.push([f, op, v]); return q; },
      limit(n) { lim = n; return q; },
      async get() {
        const docs = [];
        for (const [p, data] of db.store) {
          const parts = p.split("/");
          if (parts.length !== path.split("/").length + 1 || !p.startsWith(path + "/")) continue;
          const ok = filters.every(([f, op, v]) => {
            const x = getPath(data, f);
            if (op === "==") return x === v;
            if (op === "<=") return x !== undefined && x !== null && x <= v;
            if (op === "in") return v.includes(x);
            throw new Error("op " + op);
          });
          if (ok) docs.push(db._snap(p));
          if (docs.length >= lim) break;
        }
        return { docs, size: docs.length, empty: !docs.length };
      },
    };
    return q;
  }
  async runTransaction(fn) {
    this.txCount++;
    const db = this, writes = []; let wrote = false;
    const tx = {
      async get(ref) { if (wrote) throw new Error("Firestore transactions require all reads to be executed before all writes."); return db._snap(ref.path); },
      set(ref, data, opts) { wrote = true; writes.push(() => db._set(ref.path, data, opts)); return tx; },
      update(ref, data) { wrote = true; writes.push(() => db._update(ref.path, data)); return tx; },
      delete(ref) { wrote = true; writes.push(() => db.store.delete(ref.path)); return tx; },
    };
    const result = await fn(tx);
    writes.forEach((w) => w());
    return clone(result === undefined ? null : result);
  }
  // test helpers
  seed(path, data) { const next = {}; mergeInto(next, data); this.store.set(path, next); }
  read(path) { return this.store.has(path) ? clone(this.store.get(path)) : undefined; }
}

class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }

function install() {
  const db = new FakeDb();
  const admin = {
    initializeApp() {},
    firestore: Object.assign(() => db, { FieldValue: { increment, serverTimestamp: () => Date.now() } }),
  };
  const functions = {
    https: { onCall: (fn) => fn, HttpsError },
    pubsub: { schedule: () => ({ onRun: (fn) => fn }) },
  };
  const orig = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "firebase-admin") return admin;
    if (request === "firebase-functions") return functions;
    return orig.apply(this, arguments);
  };
  return { db, admin, functions, HttpsError };
}

module.exports = { install, FakeDb, clone };

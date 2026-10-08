// Firebase/Firestore purchase backend (with localStorage fallback).
// Zero server code — the Firebase config lives in src/firebase.js and is
// baked into the bundle at build time, so every deploy target (Vercel,
// GitHub Pages, Firebase Hosting) works without extra environment setup.
//
// Setup: Firestore is created + rules deployed via `firebase deploy`
// (see firestore.rules). Without Firebase the site keeps working on
// localStorage.

import {
  savePurchase as _savePurchase,
  fetchPurchases as _fetchPurchases,
  subscribePurchases as _subscribePurchases,
  updatePurchaseStatus as _updatePurchaseStatus,
  deletePurchase as _deletePurchase,
  isFirebaseConfigured,
  PURCHASES_TABLE,
} from "./firebase.js"

export const PURCHASES_KEY = "portfolio-admin-purchases-v1"
export const PURCHASES_COLLECTION = PURCHASES_TABLE

export const isCloudConfigured = isFirebaseConfigured

let db = null

if (isCloudConfigured) {
  db = { isCloud: true }
}

function readLocal() {
  try {
    const saved = localStorage.getItem(PURCHASES_KEY)
    const list = saved ? JSON.parse(saved) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list))
  } catch {
    // private mode etc. — ignore
  }
}

function toEntry(id, data) {
  return {
    id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    plan: data.plan || "",
    planLabel: data.planLabel || data.plan || "",
    amount: data.amount || "",
    received: data.received || new Date().toISOString().slice(0, 10),
    status: data.status || "new",
    message: data.message || "",
  }
}

function mergeLocalEntry(entry) {
  writeLocal(readLocal().map((item) =>
    String(item.id) === String(entry.id) ? entry : item
  ))
}

/** Contact form → save (cloud when configured, always local). */
export async function savePurchase(entry) {
  const withMeta = {
    ...entry,
    received: entry.received || new Date().toISOString().slice(0, 10),
    status: entry.status || "new",
  }
  const local = toEntry("local-" + Date.now(), withMeta)
  writeLocal([local, ...readLocal()])

  if (db?.isCloud) {
    try {
      const result = await _savePurchase(withMeta)
      return result
    } catch {
      return { id: local.id, cloud: false }
    }
  }
  return { id: local.id, cloud: false }
}

/** Admin: fetch all (cloud preferred, local fallback). */
export async function fetchPurchases() {
  const local = readLocal()
  if (db?.isCloud) {
    try {
      const result = await _fetchPurchases()
      if (result.items.length > 0) {
        writeLocal(result.items)
        return result
      }
    } catch {
      // fall through to local
    }
  }
  return { items: local, cloud: false }
}

/** Admin: live updates. Returns unsubscribe. */
export function subscribePurchases(callback) {
  if (db?.isCloud) {
    return _subscribePurchases((items) => {
      const mapped = items.map((item) =>
        toEntry(item.id, {
          name: item.name,
          email: item.email,
          phone: item.phone,
          plan: item.plan,
          planLabel: item.planLabel,
          amount: item.amount,
          received: item.received,
          status: item.status,
          message: item.message,
        })
      )
      writeLocal(mapped)
      callback(mapped)
    })
  }
  return () => {}
}

/** Admin: update status (cloud + local mirror). */
export async function updatePurchaseStatus(id, status) {
  const local = readLocal().map((item) =>
    String(item.id) === String(id) ? { ...item, status } : item
  )
  writeLocal(local)

  if (db?.isCloud) {
    try {
      await _updatePurchaseStatus(id, status)
      return true
    } catch {
      return false
    }
  }
  return true
}

/** Admin: delete one (cloud + local mirror). */
export async function deletePurchase(id) {
  const local = readLocal().filter((item) => String(item.id) !== String(id))
  writeLocal(local)

  if (db?.isCloud) {
    try {
      await _deletePurchase(id)
      return true
    } catch {
      return false
    }
  }
  return true
}


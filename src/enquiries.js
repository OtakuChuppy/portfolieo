// Supabase enquiry backend (with localStorage fallback).
// Zero server code. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// in Vercel env vars (see README.md) or leave unset to use localStorage.
//
// Setup:
//  1. Create project at https://supabase.com
//  2. Run the SQL schema in Supabase Dashboard > SQL editor
//  3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel env
//  4. Rebuild. Without keys the site keeps working on localStorage.

import {
  saveEnquiry as _saveEnquiry,
  fetchEnquiries as _fetchEnquiries,
  subscribeEnquiries as _subscribeEnquiries,
  updateEnquiryStatus as _updateEnquiryStatus,
  deleteEnquiry as _deleteEnquiry,
  isSupabaseConfigured,
  ENQUIRIES_TABLE,
} from "./supabase.js"

export const STORAGE_KEY = "portfolio-admin-enquiries-v1"
export const COLLECTION = ENQUIRIES_TABLE

export const isCloudConfigured = isSupabaseConfigured

let db = null

if (isCloudConfigured) {
  db = { isCloud: true }
}

function readLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const list = saved ? JSON.parse(saved) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // private mode etc. — ignore
  }
}

function toLocalEntry(id, data) {
  return {
    id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    service: data.service || "",
    budget: data.budget || "",
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
export async function saveEnquiry(entry) {
  const withReceived = {
    ...entry,
    received: entry.received || new Date().toISOString().slice(0, 10),
    status: entry.status || "new",
  }
  const local = toLocalEntry("local-" + Date.now(), withReceived)
  writeLocal([local, ...readLocal()])

  if (db?.isCloud) {
    try {
      const result = await _saveEnquiry(withReceived)
      return result
    } catch {
      return { id: local.id, cloud: false }
    }
  }
  return { id: local.id, cloud: false }
}

/** Admin: fetch all (cloud preferred, local fallback). */
export async function fetchEnquiries() {
  const local = readLocal()
  if (db?.isCloud) {
    try {
      const result = await _fetchEnquiries()
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
export function subscribeEnquiries(callback) {
  if (db?.isCloud) {
    return _subscribeEnquiries((items) => {
      const mapped = items.map((item) =>
        toLocalEntry(item.id, {
          name: item.name,
          email: item.email,
          phone: item.phone,
          service: item.service,
          budget: item.budget,
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
export async function updateEnquiryStatus(id, status) {
  const local = readLocal().map((item) =>
    String(item.id) === String(id) ? { ...item, status } : item
  )
  writeLocal(local)

  if (db?.isCloud) {
    try {
      await _updateEnquiryStatus(id, status)
      return true
    } catch {
      return false
    }
  }
  return true
}

/** Admin: delete one (cloud + local mirror). */
export async function deleteEnquiry(id) {
  const local = readLocal().filter((item) => String(item.id) !== String(id))
  writeLocal(local)

  if (db?.isCloud) {
    try {
      await _deleteEnquiry(id)
      return true
    } catch {
      return false
    }
  }
  return true
}

/** Seed demo rows into localStorage only (never touches cloud). */
export function seedLocalIfEmpty(seedRows) {
  if (readLocal().length > 0) return false
  writeLocal(seedRows)
  return true
}

// Re-export cloud handles for sibling modules
export { db as cloudDb, isCloudConfigured as cloudEnabled }



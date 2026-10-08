// Supabase backend for enquiries, purchases, and content.
// Zero server code. The Supabase client is bundled at build time
// (no runtime CDN import — an esm.sh outage used to crash this module
// and take down the whole page, including the hero effect).
//
// Setup:
//  1. Create project at https://supabase.com
//  2. Copy project URL and anon key to Vercel env vars
//  3. Run the SQL schema below in Supabase Dashboard > SQL editor
//  4. Add RLS policies (see SQL schema)
//
// Env vars in Vercel:
//  - VITE_SUPABASE_URL
//  - VITE_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let supabase = null

if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  } catch (error) {
    // Never let a client init failure break the page — fall back to localStorage.
    console.error("Supabase client failed to initialise:", error)
    supabase = null
  }
}

// ── Enquiries ────────────────────────────────────────────────

export const ENQUIRIES_TABLE = "enquiries"

export function toEnquiryEntry(id, data) {
  return {
    id,
    name: data?.name || "",
    email: data?.email || "",
    phone: data?.phone || "",
    service: data?.service || "",
    budget: data?.budget || "",
    received: data?.received || new Date().toISOString().slice(0, 10),
    status: data?.status || "new",
    message: data?.message || "",
    createdAt: data?.created_at || new Date().toISOString(),
  }
}

export async function saveEnquiry(entry) {
  const withReceived = {
    ...entry,
    received: entry.received || new Date().toISOString().slice(0, 10),
    status: entry.status || "new",
    created_at: new Date().toISOString(),
  }
  if (!supabase) return { id: "local-" + Date.now(), cloud: false }

  try {
    const { data, error } = await supabase
      .from(ENQUIRIES_TABLE)
      .insert(withReceived)
      .select()
      .single()
    if (error) throw error
    return { id: data.id, cloud: true }
  } catch {
    return { id: "local-" + Date.now(), cloud: false }
  }
}

export async function fetchEnquiries() {
  if (!supabase) {
    return { items: [], cloud: false }
  }
  try {
    const { data, error } = await supabase
      .from(ENQUIRIES_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    const items = (data || []).map((d) => toEnquiryEntry(d.id, d))
    return { items, cloud: true }
  } catch {
    return { items: [], cloud: false }
  }
}

export function subscribeEnquiries(callback) {
  if (!supabase) return () => {}
  try {
    return supabase
      .channel("enquiries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: ENQUIRIES_TABLE },
        (payload) => {
          callback([toEnquiryEntry(payload.new.id, payload.new)])
        }
      )
      .subscribe()
  } catch {
    return () => {}
  }
}

export async function updateEnquiryStatus(id, status) {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from(ENQUIRIES_TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
    return !error
  } catch {
    return false
  }
}

export async function deleteEnquiry(id) {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from(ENQUIRIES_TABLE)
      .delete()
      .eq("id", id)
    return !error
  } catch {
    return false
  }
}

// ── Purchases ───────────────────────────────────────────────

export const PURCHASES_TABLE = "purchases"

export function toPurchaseEntry(id, data) {
  return {
    id,
    name: data?.name || "",
    email: data?.email || "",
    phone: data?.phone || "",
    plan: data?.plan || "",
    planLabel: data?.plan_label || data?.plan || "",
    amount: data?.amount || "",
    received: data?.received || new Date().toISOString().slice(0, 10),
    status: data?.status || "new",
    message: data?.message || "",
    createdAt: data?.created_at || new Date().toISOString(),
  }
}

export async function savePurchase(entry) {
  const withMeta = {
    ...entry,
    received: entry.received || new Date().toISOString().slice(0, 10),
    status: entry.status || "new",
    created_at: new Date().toISOString(),
  }
  if (!supabase) return { id: "local-" + Date.now(), cloud: false }

  try {
    const { data, error } = await supabase
      .from(PURCHASES_TABLE)
      .insert(withMeta)
      .select()
      .single()
    if (error) throw error
    return { id: data.id, cloud: true }
  } catch {
    return { id: "local-" + Date.now(), cloud: false }
  }
}

export async function fetchPurchases() {
  if (!supabase) {
    return { items: [], cloud: false }
  }
  try {
    const { data, error } = await supabase
      .from(PURCHASES_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    const items = (data || []).map((d) => toPurchaseEntry(d.id, d))
    return { items, cloud: true }
  } catch {
    return { items: [], cloud: false }
  }
}

export function subscribePurchases(callback) {
  if (!supabase) return () => {}
  try {
    return supabase
      .channel("purchases")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: PURCHASES_TABLE },
        (payload) => {
          callback([toPurchaseEntry(payload.new.id, payload.new)])
        }
      )
      .subscribe()
  } catch {
    return () => {}
  }
}

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

// ── Content ─────────────────────────────────────────────────

export const CONTENT_TABLE = "content"

export function toContentEntry(id, data) {
  return {
    id,
    key: data?.key || "",
    category: data?.category || "",
    title: data?.title || "",
    description: data?.description || "",
    image: data?.image || "",
  }
}

export async function fetchContent() {
  if (!supabase) {
    return { items: [], cloud: false }
  }
  try {
    const { data, error } = await supabase
      .from(CONTENT_TABLE)
      .select("*")
      .order("sort_order", { ascending: true })
    if (error) throw error
    const items = (data || []).map((d) => toContentEntry(d.id, d))
    return { items, cloud: true }
  } catch {
    return { items: [], cloud: false }
  }
}

// ── Health check ────────────────────────────────────────────

export async function checkSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: "not_configured" }
  }
  try {
    const { data, error } = await supabase.from("enquiries").select("count", {
      count: "exact",
      head: true,
    })
    if (error && error.status !== 406) throw error
    return { ok: true, reason: "connected" }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}

// Firebase/Firestore backend for enquiries, purchases, and site content.
// Zero server code — the web config below is public by design: it only
// identifies the project, while Firestore security rules control access.
// (Replaces the Supabase client whose project was deleted, and the old
// firebase/firestore imports that had no Firebase app behind them.)
//
// Layers:
//   enquiries.js   → contact form submissions (collection: enquiries)
//   purchases.js   → checkout/purchase requests (collection: purchases)
//   siteContent.js → admin-edited site content (doc: siteContent/numbers)

import { initializeApp } from "firebase/app"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBa9yIMvoFTwmKkmXsdylqD-sc1Vo_ZSYM",
  authDomain: "chuppi-protfolieo-firebase.firebaseapp.com",
  projectId: "chuppi-protfolieo-firebase",
  storageBucket: "chuppi-protfolieo-firebase.firebasestorage.app",
  messagingSenderId: "982427238990",
  appId: "1:982427238990:web:9131eba47213824d4a791f",
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
)

/** Firestore instance (or null when not configured / init failed). */
export let db = null

if (isFirebaseConfigured) {
  try {
    db = getFirestore(initializeApp(firebaseConfig))
  } catch (error) {
    // Never let client init failure break the page — fall back to localStorage.
    console.error("Firestore failed to initialise:", error)
    db = null
  }
}

export const ENQUIRIES_TABLE = "enquiries"
export const PURCHASES_TABLE = "purchases"

/** Strip local pseudo-ids so Firestore can assign real document ids. */
function withoutLocalId(entry) {
  const { id, ...data } = entry || {}
  return data
}

function byNewest(a, b) {
  return String(b.created_at || b.received || "").localeCompare(
    String(a.created_at || a.received || "")
  )
}

function docsToItems(snap) {
  const items = snap.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
  items.sort(byNewest)
  return items
}

async function fetchAll(name) {
  const items = docsToItems(await getDocs(collection(db, name)))
  return { items, cloud: true }
}

function subscribeAll(name, callback) {
  return onSnapshot(collection(db, name), (snap) => callback(docsToItems(snap)))
}

async function saveEntry(name, entry) {
  const data = {
    ...withoutLocalId(entry),
    created_at: new Date().toISOString(),
  }
  const ref = await addDoc(collection(db, name), data)
  return { id: ref.id, cloud: true }
}

async function updateStatus(name, id, status) {
  await updateDoc(doc(db, name, id), {
    status,
    updated_at: new Date().toISOString(),
  })
  return true
}

async function removeEntry(name, id) {
  await deleteDoc(doc(db, name, id))
  return true
}

// ── Enquiries (contact form) ─────────────────────────────────

export function saveEnquiry(entry) {
  return saveEntry(ENQUIRIES_TABLE, entry)
}

export function fetchEnquiries() {
  return fetchAll(ENQUIRIES_TABLE)
}

export function subscribeEnquiries(callback) {
  return subscribeAll(ENQUIRIES_TABLE, callback)
}

export function updateEnquiryStatus(id, status) {
  return updateStatus(ENQUIRIES_TABLE, id, status)
}

export function deleteEnquiry(id) {
  return removeEntry(ENQUIRIES_TABLE, id)
}

// ── Purchases (checkout) ─────────────────────────────────────

export function savePurchase(entry) {
  return saveEntry(PURCHASES_TABLE, entry)
}

export function fetchPurchases() {
  return fetchAll(PURCHASES_TABLE)
}

export function subscribePurchases(callback) {
  return subscribeAll(PURCHASES_TABLE, callback)
}

export function updatePurchaseStatus(id, status) {
  return updateStatus(PURCHASES_TABLE, id, status)
}

export function deletePurchase(id) {
  return removeEntry(PURCHASES_TABLE, id)
}

// ── Site content ─────────────────────────────────────────────
// siteContent.js performs its own getDoc/setDoc against the exported
// Firestore instance (see `cloudDb` re-exported by enquiries.js).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA53KGcoUUDzHw9vWlgviEG90LCUJiCe_4",
  authDomain: "nifemi-tracker.firebaseapp.com",
  projectId: "nifemi-tracker",
  storageBucket: "nifemi-tracker.firebasestorage.app",
  messagingSenderId: "194979491045",
  appId: "1:194979491045:web:55e8640a062917d26bb80c"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

let allFirms = [];

async function loadFromFirestore() {
  showLoading(true);
  try {
    const snap = await getDocs(collection(db, "firms"));
    allFirms = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    allFirms.sort((a, b) => (a.id || 0) - (b.id || 0));
    refresh();
  } catch (e) {
    showError("Could not load data: " + e.message);
  } finally {
    showLoading(false);
  }
}

async function saveToFirestore(firm) {
  showLoading(true);
  try {
    await updateDoc(doc(db, "firms", firm._id), {
      status: firm.status,
      userNotes: firm.userNotes
    });
    showToast("Saved ✓");
  } catch (e) {
    showError("Could not save: " + e.message);
  } finally {
    showLoading(false);
  }
}

async function addToFirestore(newFirm) {
  showLoading(true);
  try {
    const ref = await addDoc(collection(db, "firms"), newFirm);
    newFirm._id = ref.id;
    allFirms.push(newFirm);
    showToast("Firm added ✓");
    refresh();
  } catch (e) {
    showError("Could not add firm: " + e.message);
  } finally {
    showLoading(false);
  }
}

// ── UI helpers ────────────────────────────────────────────
function showLoading(on) {
  document.getElementById("loading-bar").style.display = on ? "block" : "none";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2500);
}

function showError(msg) {
  const t = document.getElementById("toast");
  t.textContent = "⚠ " + msg;
  t.style.background = "var(--red)";
  t.classList.remove("hidden");
  setTimeout(() => { t.classList.add("hidden"); t.style.background = ""; }, 4000);
}

// ── Badge helpers ─────────────────────────────────────────
function badgeClass(status) {
  switch (status) {
    case "RESEARCHED":  return "badge badge-researched";
    case "APPLIED":     return "badge badge-applied";
    case "APPLY EARLY": return "badge badge-early";
    case "REJECTED":    return "badge badge-rejected";
    case "OFFER":       return "badge badge-offer";
    default:            return "badge badge-default";
  }
}

// ── Stats ─────────────────────────────────────────────────
function updateStats() {
  document.getElementById("stat-total").textContent      = `📋 Total: ${allFirms.length}`;
  document.getElementById("stat-applied").textContent    = `✅ Applied: ${allFirms.filter(f=>f.status==="APPLIED").length}`;
  document.getElementById("stat-researched").textContent = `🔍 Researched: ${allFirms.filter(f=>f.status==="RESEARCHED").length}`;
  document.getElementById("stat-early").textContent      = `⚡ Apply Early: ${allFirms.filter(f=>f.status==="APPLY EARLY").length}`;
}

// ── Filter ────────────────────────────────────────────────
function getFiltered() {
  const search   = document.getElementById("search").value.toLowerCase();
  const status   = document.getElementById("filter-status").value;
  const location = document.getElementById("filter-location").value;
  return allFirms.filter(f => {
    const matchSearch   = !search   || f.firm.toLowerCase().includes(search) || (f.location||"").toLowerCase().includes(search);
    const matchStatus   = !status   || f.status === status;
    const matchLocation = !location || (f.location||"").includes(location);
    return matchSearch && matchStatus && matchLocation;
  });
}

// ── Render ────────────────────────────────────────────────
function renderTable(firms) {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";
  if (firms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--grey)">No firms match your filters.</td></tr>`;
    return;
  }
  firms.forEach((f, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td class="firm">${f.firm}</td>
      <td class="location">${f.location || "—"}</td>
      <td class="salary">${f.salary || "—"}</td>
      <td class="req">${f.req || "—"}</td>
      <td class="deadline">${f.deadline || "—"}</td>
      <td><span class="${badgeClass(f.status)}">${f.status}</span></td>
      <td class="notes-cell">${f.userNotes || "—"}</td>
    `;
    tr.addEventListener("click", () => openModal(f));
    tbody.appendChild(tr);
  });
}

function refresh() {
  updateStats();
  renderTable(getFiltered());
}

// ── Edit Modal ────────────────────────────────────────────
let currentFirm = null;

function openModal(f) {
  currentFirm = f;
  document.getElementById("modal-title").textContent = f.firm;
  document.getElementById("modal-status").value = f.status;
  document.getElementById("modal-notes").value  = f.userNotes || "";
  document.getElementById("modal-overlay").classList.remove("hidden");
}

document.getElementById("modal-save").addEventListener("click", async () => {
  currentFirm.status    = document.getElementById("modal-status").value;
  currentFirm.userNotes = document.getElementById("modal-notes").value;
  document.getElementById("modal-overlay").classList.add("hidden");
  refresh();
  await saveToFirestore(currentFirm);
});

document.getElementById("modal-cancel").addEventListener("click", () => {
  document.getElementById("modal-overlay").classList.add("hidden");
});

document.getElementById("modal-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modal-overlay"))
    document.getElementById("modal-overlay").classList.add("hidden");
});

// ── Add Firm Modal ────────────────────────────────────────
document.getElementById("btn-add").addEventListener("click", () => {
  document.getElementById("add-overlay").classList.remove("hidden");
});

document.getElementById("add-cancel").addEventListener("click", () => {
  document.getElementById("add-overlay").classList.add("hidden");
});

document.getElementById("add-save").addEventListener("click", async () => {
  const firm = document.getElementById("add-firm").value.trim();
  if (!firm) { alert("Firm name is required."); return; }
  const newFirm = {
    id:        Date.now(),
    firm,
    location:  document.getElementById("add-location").value.trim(),
    salary:    document.getElementById("add-salary").value.trim(),
    req:       document.getElementById("add-req").value.trim(),
    deadline:  document.getElementById("add-deadline").value.trim(),
    type:      document.getElementById("add-type").value.trim(),
    status:    document.getElementById("add-status").value,
    userNotes: document.getElementById("add-notes").value.trim(),
  };
  document.getElementById("add-overlay").classList.add("hidden");
  ["add-firm","add-location","add-salary","add-req","add-deadline","add-type","add-notes"].forEach(id => {
    document.getElementById(id).value = "";
  });
  await addToFirestore(newFirm);
});

// ── Controls ──────────────────────────────────────────────
document.getElementById("search").addEventListener("input", refresh);
document.getElementById("filter-status").addEventListener("change", refresh);
document.getElementById("filter-location").addEventListener("change", refresh);
document.getElementById("btn-reset").addEventListener("click", () => {
  document.getElementById("search").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-location").value = "";
  refresh();
});

// ── Boot ──────────────────────────────────────────────────
loadFromFirestore();

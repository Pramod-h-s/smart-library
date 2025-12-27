import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const tbody = document.getElementById("membersTableBody");

// Load only pending students
async function loadPending() {
  tbody.innerHTML = "";

  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    where("approved", "==", false)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    tbody.innerHTML =
      `<tr><td colspan="7">No pending approvals</td></tr>`;
    return;
  }

  snap.forEach(docSnap => {
    const u = docSnap.data();
    const uid = docSnap.id;

    tbody.innerHTML += `
      <tr>
        <td>${u.usn || "-"}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || "-"}</td>
        <td>Student</td>
        <td>Pending</td>
        <td>
          <button class="btn-success"
            onclick="approveUser('${uid}')">
            Approve
          </button>
        </td>
      </tr>
    `;
  });
}

// Approve user
window.approveUser = async function (uid) {
  await updateDoc(doc(db, "users", uid), {
    approved: true
  });

  alert("Student approved successfully");
  loadPending();
};

// Load all users
async function loadAll() {
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(docSnap => {
    const u = docSnap.data();
    tbody.innerHTML += `
      <tr>
        <td>${u.usn || "-"}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || "-"}</td>
        <td>${u.role}</td>
        <td>${u.approved ? "Approved" : "Pending"}</td>
        <td>-</td>
      </tr>
    `;
  });
}

// Button handlers
document.getElementById("pendingBtn").onclick = loadPending;
document.getElementById("allBtn").onclick = loadAll;

// Default load
loadPending();

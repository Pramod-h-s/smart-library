// js/admin/members.js
import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

window.Members = {
  async loadPending() {
    const tbody = document.getElementById("membersTableBody");
    tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

    const q = query(
      collection(db, "users"),
      where("approved", "==", false)
    );

    const snapshot = await getDocs(q);
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML =
        "<tr><td colspan='8'>No pending approvals</td></tr>";
      return;
    }

    snapshot.forEach(docSnap => {
      const u = docSnap.data();
      const row = `
        <tr>
          <td>${u.usn}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.phone}</td>
          <td>${u.role}</td>
          <td><span class="badge badge-warning">Pending</span></td>
          <td>-</td>
          <td>
            <button class="btn-success"
              onclick="Members.approveUser('${docSnap.id}')">
              Approve
            </button>
          </td>
        </tr>`;
      tbody.innerHTML += row;
    });
  },

  async loadAll() {
    const tbody = document.getElementById("membersTableBody");
    tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

    const snapshot = await getDocs(collection(db, "users"));
    tbody.innerHTML = "";

    snapshot.forEach(docSnap => {
      const u = docSnap.data();
      const row = `
        <tr>
          <td>${u.usn}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.phone}</td>
          <td>${u.role}</td>
          <td>${u.approved ? "Approved" : "Pending"}</td>
          <td>${u.createdAt?.toDate?.()?.toLocaleDateString() || "-"}</td>
          <td>-</td>
        </tr>`;
      tbody.innerHTML += row;
    });
  },

  async approveUser(userId) {
    await updateDoc(doc(db, "users", userId), {
      approved: true
    });
    alert("User approved successfully");
    this.loadPending();
  }
};

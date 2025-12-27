// js/admin/members.js
import { db } from "./firebase.js";
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
    const q = query(
      collection(db, "users"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    this.render(snapshot.docs);
  },

  async loadAll() {
    const snapshot = await getDocs(collection(db, "users"));
    this.render(snapshot.docs);
  },

  render(docs) {
    const tbody = document.getElementById("membersTableBody");
    tbody.innerHTML = "";

    if (docs.length === 0) {
      tbody.innerHTML =
        `<tr><td colspan="8">No users found</td></tr>`;
      return;
    }

    docs.forEach(d => {
      const u = d.data();
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${u.usn || "-"}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || "-"}</td>
        <td>${u.role}</td>
        <td>${u.status}</td>
        <td>
          ${u.status === "pending"
            ? `<button class="btn-success"
                onclick="Members.approve('${d.id}')">
                Approve
              </button>`
            : "-"
          }
        </td>
      `;

      tbody.appendChild(row);
    });
  },

  async approve(uid) {
    await updateDoc(doc(db, "users", uid), {
      status: "approved"
    });

    alert("User approved");
    this.loadPending();
  }
};

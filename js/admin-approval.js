import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const tableBody = document.getElementById("pendingUsersTable");

async function loadPendingUsers() {
  tableBody.innerHTML = "";

  const q = query(
    collection(db, "users"),
    where("approved", "==", false)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    tableBody.innerHTML = `<tr><td colspan="4">No pending approvals</td></tr>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.usn}</td>
      <td>
        <button class="btn-primary" onclick="approveUser('${docSnap.id}')">
          Approve
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

window.approveUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    approved: true
  });

  alert("User approved successfully");
  loadPendingUsers();
};

loadPendingUsers();

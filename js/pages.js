/**
 * Smart Library - Pages (Firestore)
 */

import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ================= AUTH STATE ================= */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* ================= PAGES ================= */
const Pages = {

  /* ===== STUDENT BOOKS PAGE ===== */
  books: {
    async init() {
      console.log("Student Books page initialized");

      const grid = document.getElementById("booksGrid");
      const noBooks = document.getElementById("noBooks");
      if (!grid) return;

      const snap = await getDocs(collection(db, "books"));
      const books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      grid.innerHTML = "";

      if (!books.length) {
        if (noBooks) noBooks.style.display = "block";
        return;
      }

      if (noBooks) noBooks.style.display = "none";

      books.forEach(b => {
        grid.innerHTML += `
          <div class="book-card glass-card">
            <h4>${b.title}</h4>
            <p><strong>Author:</strong> ${b.author}</p>
            <p><strong>Category:</strong> ${b.category}</p>
            <span class="availability-badge ${b.quantity > 0 ? "available" : "unavailable"}">
              ${b.quantity > 0 ? "Available" : "Out of stock"}
            </span>
          </div>
        `;
      });
    }
  },

  /* ===== STUDENT DASHBOARD ===== */
  userDashboard: {
    async init() {
      console.log("User Dashboard initialized");
      if (!currentUser) return;

      await this.loadStats();
      await this.loadTransactions();
    },

    async loadStats() {
      const snap = await getDocs(
        query(collection(db, "transactions"),
          where("userId", "==", currentUser.uid))
      );

      const issued = snap.docs.filter(d => d.data().status === "issued");
      const overdue = issued.filter(d => {
        const due = d.data().dueDate?.toDate();
        return due && new Date() > due;
      });

      document.getElementById("issuedCount").textContent = issued.length;
      document.getElementById("overdueCount").textContent = overdue.length;
    },

    async loadTransactions() {
      const tbody = document.getElementById("transactionsBody");
      if (!tbody) return;

      tbody.innerHTML = "";

      const snap = await getDocs(
        query(collection(db, "transactions"),
          where("userId", "==", currentUser.uid))
      );

      if (snap.empty) {
        tbody.innerHTML =
          `<tr><td colspan="6" class="no-data">No transactions yet.</td></tr>`;
        return;
      }

      snap.docs.forEach(d => {
        const t = d.data();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${d.id}</td>
          <td>${t.bookTitle}</td>
          <td>${t.issueDate?.toDate().toLocaleDateString()}</td>
          <td>${t.dueDate?.toDate().toLocaleDateString()}</td>
          <td>${t.status.toUpperCase()}</td>
          <td>-</td>
        `;
        tbody.appendChild(row);
      });
    }
  },

  /* ===== STUDENT PROFILE ===== */
  userProfile: {
    init() {
      console.log("User Profile initialized");
      if (!currentUser) return;

      document.getElementById("profileNameDisplay").textContent =
        currentUser.displayName || "Student";
      document.getElementById("profileUSNDisplay").textContent =
        currentUser.usn || "-";

      document.getElementById("profileName").value =
        currentUser.displayName || "";
      document.getElementById("profileEmail").value =
        currentUser.email || "";
    }
  }
};

window.Pages = Pages;

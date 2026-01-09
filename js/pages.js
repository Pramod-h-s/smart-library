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

/* ================= AUTH ================= */
const Auth = {
  currentUser: null,

  init() {
    onAuthStateChanged(auth, user => {
      this.currentUser = user;
    });
  },

  getCurrentUser() {
    return this.currentUser;
  }
};

Auth.init();
window.Auth = Auth;

/* ================= PAGES ================= */
const Pages = {

  /* ===== HOME ===== */
  home: {
    async init() {
      console.log("Home page initialized");
    }
  },

  /* ===== STUDENT BOOKS PAGE ===== */
  books: {
    async init() {
      console.log("Student books page initialized");
      const books = await this.getBooks();
      this.renderBooks(books);
    },

    async getBooks() {
      const snap = await getDocs(collection(db, "books"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    renderBooks(books) {
      const grid = document.getElementById("booksGrid");
      const noBooks = document.getElementById("noBooks");

      if (!grid) return;

      grid.innerHTML = "";

      if (!books.length) {
        noBooks.style.display = "block";
        return;
      }

      noBooks.style.display = "none";

      books.forEach(b => {
        grid.innerHTML += `
          <div class="book-card glass-card">
            <h4>${b.title}</h4>
            <p><strong>Author:</strong> ${b.author}</p>
            <p><strong>Category:</strong> ${b.category}</p>
            <p>
              <span class="availability-badge ${b.quantity > 0 ? "available" : "unavailable"}">
                ${b.quantity > 0 ? "Available" : "Out of stock"}
              </span>
            </p>
          </div>
        `;
      });
    }
  },
/*=======STUDENT PROFILE======*/
  Pages.userProfile = {
  async init() {
    console.log("User Profile initialized");

    const user = Auth.getCurrentUser();
    if (!user) return;

    document.getElementById("profileNameDisplay").textContent =
      user.displayName || "Student";
    document.getElementById("profileUSNDisplay").textContent =
      user.usn || "-";

    document.getElementById("profileName").value =
      user.displayName || "";
    document.getElementById("profileEmail").value =
      user.email || "";
  }
};
  
  /* ===== STUDENT DASHBOARD ===== */
  userDashboard: {
    async init() {
      console.log("User Dashboard initialized");

      const user = Auth.getCurrentUser();
      if (!user) return;

      await this.loadStats(user);
      await this.loadTransactions(user);
    },

    async loadStats(user) {
      const snap = await getDocs(
        query(collection(db, "transactions"), where("userId", "==", user.uid))
      );

      const issued = snap.docs.filter(d => d.data().status === "issued");

      const overdue = issued.filter(d => {
        const due = d.data().dueDate?.toDate();
        return due && new Date() > due;
      });

      document.getElementById("issuedCount").textContent = issued.length;
      document.getElementById("overdueCount").textContent = overdue.length;
    },

    async loadTransactions(user) {
      const tbody = document.getElementById("transactionsBody");
      if (!tbody) return;

      tbody.innerHTML = "";

      const snap = await getDocs(
        query(collection(db, "transactions"), where("userId", "==", user.uid))
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
  }
};

window.Pages = Pages;


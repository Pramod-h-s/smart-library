/**
 * Smart Library - Page-Specific Logic (Firestore Compatible)
 */

/* ================= FIREBASE ================= */
import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
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
  },

  checkAuth() {
    return !!this.currentUser;
  }
};

Auth.init();
window.Auth = Auth;

/* ================= APP (FIRESTORE HELPERS) ================= */
const App = {

  async getBooks() {
    const snap = await getDocs(collection(db, "books"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getUserTransactions(userId) {
    const snap = await getDocs(
      query(
        collection(db, "transactions"),
        where("userId", "==", userId)
      )
    );
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      issueDate: d.data().issueDate?.toDate(),
      dueDate: d.data().dueDate?.toDate(),
      returnDate: d.data().returnDate?.toDate()
    }));
  },

  async returnBook(transactionId) {
    await updateDoc(doc(db, "transactions", transactionId), {
      status: "returned",
      returnDate: new Date()
    });
  },

  calculateFine(dueDate) {
    if (!dueDate) return 0;
    const days =
      Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return days > 0 ? days * 5 : 0;
  },

  formatDate(date) {
    return date ? new Date(date).toLocaleDateString() : "-";
  }
};

window.App = App;

/* ================= PAGES ================= */
const Pages = {

  /* ---------- HOME ---------- */
  home: {
    async init() {
      console.log("Home page initialized");
      const books = await App.getBooks();
      console.log("Featured books:", books.slice(0, 6));
    }
  },

  /* ---------- BOOKS ---------- */
  books: {
    async init() {
      console.log("Books page initialized");
      const books = await App.getBooks();
      this.displayBooks(books);
    },

    displayBooks(books) {
      const grid = document.getElementById("booksGrid");
      if (!grid) return;

      grid.innerHTML = "";
      books.forEach(b => {
        grid.innerHTML += `
          <div class="book-card">
            <h4>${b.title}</h4>
            <p>${b.author}</p>
            <p>Available: ${b.quantity}</p>
          </div>
        `;
      });
    }
  },

  /* ---------- STUDENT DASHBOARD ---------- */
  userDashboard: {
    async init() {
      console.log("User Dashboard initialized");

      const user = Auth.getCurrentUser();
      if (!user) {
        console.error("No logged-in user");
        return;
      }

      await this.loadUserInfo(user);
      await this.loadStats(user);
      await this.loadTransactions(user);
    },

    async loadUserInfo(user) {
      const nameEl = document.getElementById("userFullName");
      const emailEl = document.getElementById("userEmail");

      if (nameEl) nameEl.textContent = user.email;
      if (emailEl) emailEl.textContent = user.email;
    },

    async loadStats(user) {
      const tx = await App.getUserTransactions(user.uid);

      const issued = tx.filter(t => t.status === "issued");
      const overdue = issued.filter(t => new Date() > t.dueDate);

      document.getElementById("issuedCount")?.textContent = issued.length;
      document.getElementById("overdueCount")?.textContent = overdue.length;
    },

    async loadTransactions(user) {
      const tbody = document.getElementById("transactionsBody");
      if (!tbody) return;

      const tx = await App.getUserTransactions(user.uid);
      tbody.innerHTML = "";

      if (!tx.length) {
        tbody.innerHTML =
          `<tr><td colspan="6">No transactions found</td></tr>`;
        return;
      }

      tx.forEach(t => {
        const fine = App.calculateFine(t.dueDate);
        const overdue =
          t.status === "issued" && new Date() > t.dueDate;

        tbody.innerHTML += `
          <tr>
            <td>${t.bookTitle}</td>
            <td>${App.formatDate(t.issueDate)}</td>
            <td>${App.formatDate(t.dueDate)}</td>
            <td>${t.status.toUpperCase()}</td>
            <td>${fine} ₹</td>
            <td>
              ${
                t.status === "issued"
                  ? `<button onclick="Pages.userDashboard.returnBook('${t.id}')">
                       Return
                     </button>`
                  : "-"
              }
            </td>
          </tr>
        `;
      });
    },

    async returnBook(transactionId) {
      if (!confirm("Return this book?")) return;
      await App.returnBook(transactionId);
      alert("Book returned");
      this.init();
    }
  }
};

/* ================= SIMPLE PAGE INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  const page =
    window.location.pathname.split("/").pop().split(".")[0] || "index";

  if (Pages[page]?.init) {
    Pages[page].init();
  }
});

window.Pages = Pages;

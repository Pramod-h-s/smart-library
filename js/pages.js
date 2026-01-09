/**
 * Smart Library - Pages Logic (Student Side)
 * Firestore-based (No localStorage, No App dependency)
 */

import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ================= AUTH STATE ================= */
let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* ================= PAGES ================= */
const Pages = {

  /* ================= HOME ================= */
  home: {
    init() {
      console.log("Home page initialized");
    }
  },

  /* ================= STUDENT BOOKS ================= */
  books: {

    async init() {
      console.log("Student Books page initialized");
      await this.loadBooks();
      this.setupSearchAndFilters();
    },

    async loadBooks() {
      const snap = await getDocs(collection(db, "books"));
      const books = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      this.renderBooks(books);
    },

    setupSearchAndFilters() {
      const searchInput = document.getElementById("searchBooks");
      const categoryFilter = document.getElementById("categoryFilter");
      const availabilityFilter = document.getElementById("availabilityFilter");

      if (searchInput) {
        searchInput.addEventListener("input", () => this.applyFilters());
      }
      if (categoryFilter) {
        categoryFilter.addEventListener("change", () => this.applyFilters());
      }
      if (availabilityFilter) {
        availabilityFilter.addEventListener("change", () => this.applyFilters());
      }
    },

    async applyFilters() {
      const search =
        document.getElementById("searchBooks")?.value.toLowerCase() || "";
      const category =
        document.getElementById("categoryFilter")?.value || "";
      const availability =
        document.getElementById("availabilityFilter")?.value || "";

      const snap = await getDocs(collection(db, "books"));
      const books = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => {
          const matchSearch =
            !search ||
            b.title?.toLowerCase().includes(search) ||
            b.author?.toLowerCase().includes(search) ||
            b.isbn?.toLowerCase().includes(search);

          const matchCategory =
            !category || b.category === category;

          const matchAvailability =
            !availability ||
            (availability === "available" && b.quantity > 0);

          return matchSearch && matchCategory && matchAvailability;
        });

      this.renderBooks(books);
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

      books.forEach(book => {
        grid.innerHTML += `
          <div class="book-card glass-card">
            <h4>${book.title}</h4>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Category:</strong> ${book.category}</p>

            <span class="availability-badge ${
              book.quantity > 0 ? "available" : "unavailable"
            }">
              ${book.quantity > 0 ? "Available" : "Out of Stock"}
            </span>

            ${
              book.quantity > 0
                ? `<button class="btn-primary btn-sm"
                     onclick="Pages.books.requestBook('${book.id}', '${book.title}')">
                     Request Book
                   </button>`
                : ""
            }
          </div>
        `;
      });
    },

    async requestBook(bookId, bookTitle) {
      if (!currentUser) {
        alert("Please login to request a book");
        return;
      }

      await addDoc(collection(db, "book_requests"), {
        bookId,
        bookTitle,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: "pending",
        requestedAt: Timestamp.now()
      });

      alert("Book request sent to admin");
    }
  },

  /* ================= STUDENT DASHBOARD ================= */
  userDashboard: {
    async init() {
      console.log("User Dashboard initialized");

      if (!currentUser) return;

      await this.loadStats();
      await this.loadTransactions();
    },

    async loadStats() {
      const snap = await getDocs(
        query(
          collection(db, "transactions"),
          where("userId", "==", currentUser.uid)
        )
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
        query(
          collection(db, "transactions"),
          where("userId", "==", currentUser.uid)
        )
      );

      if (snap.empty) {
        tbody.innerHTML =
          `<tr><td colspan="6" class="no-data">No transactions yet.</td></tr>`;
        return;
      }

      snap.docs.forEach(d => {
        const t = d.data();
        tbody.innerHTML += `
          <tr>
            <td>${d.id}</td>
            <td>${t.bookTitle}</td>
            <td>${t.issueDate?.toDate().toLocaleDateString()}</td>
            <td>${t.dueDate?.toDate().toLocaleDateString()}</td>
            <td>${t.status.toUpperCase()}</td>
            <td>-</td>
          </tr>
        `;
      });
    }
  },

  /* ================= STUDENT PROFILE ================= */
  userProfile: {
    init() {
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

/* ================= GLOBAL EXPORT ================= */
window.Pages = Pages;

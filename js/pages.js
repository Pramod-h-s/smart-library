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

/* ================= TEMP COMPATIBILITY APP ================= */
const App = {

  async getBooks() {
    const snap = await getDocs(collection(db, "books"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async searchBooks(query = "", category = "", availability = "") {
    const books = await this.getBooks();

    return books.filter(b => {
      const matchQuery =
        !query ||
        b.title?.toLowerCase().includes(query.toLowerCase()) ||
        b.author?.toLowerCase().includes(query.toLowerCase());

      const matchCategory = !category || b.category === category;
      const matchAvailability =
        !availability ||
        (availability === "available" && b.quantity > 0) ||
        (availability === "unavailable" && b.quantity <= 0);

      return matchQuery && matchCategory && matchAvailability;
    });
  },

  async getTransactions() {
    const snap = await getDocs(collection(db, "transactions"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async returnBook(transactionId) {
    await updateDoc(doc(db, "transactions", transactionId), {
      status: "returned"
    });
  },

  calculateFine(dueDate) {
    if (!dueDate) return 0;
    const days = Math.floor(
      (new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days * 5 : 0;
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString();
  }
};

window.App = App;

/* ================= AUTH HELPERS ================= */
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

/* ================= PAGES ================= */
const Pages = {

  home: {
    async init() {
      console.log("Home page initialized");
      await this.loadBooks();
    },

    async loadBooks() {
      const books = await App.getBooks();
      console.log("Featured books:", books.slice(0, 6));
    }
  },

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
          </div>`;
      });
    }
  }
};

/* ================= ROUTER ================= */
document.addEventListener("DOMContentLoaded", () => {
  const page =
    window.location.pathname.split("/").pop().split(".")[0] || "index";

  if (Pages[page]?.init) {
    Pages[page].init();
  }
});

window.Pages = Pages;

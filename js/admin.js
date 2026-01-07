/**
 * Smart Library - Admin Panel (Firestore Only)
 * Dashboard, Books, Transactions, Issue/Return
 */

/* ==================== IMPORTS ==================== */
import { db, auth } from "./firebase.js";
import {
  collection, getDocs, addDoc, deleteDoc, doc, Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { protectPage } from "./auth-check.js";

/* ==================== HELPERS ==================== */
function calculateFine(dueDate) {
  if (!dueDate) return 0;
  const now = new Date();
  const days = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  return days > 0 ? days * 5 : 0;
}

/* ==================== ADMIN OBJECT ==================== */
const Admin = {};
window.Admin = Admin; // 🔥 REQUIRED
/* ==================== DASHBOARD ==================== */
Admin.dashboard = {
  async init() {
    await this.updateStats();
    await this.loadRecentTransactions();
  },

  async updateStats() {
    const booksSnap = await getDocs(collection(db, "books"));
    const usersSnap = await getDocs(query(
      collection(db, "users"),
      where("role", "==", "student")
    ));
    const issuedSnap = await getDocs(query(
      collection(db, "transactions"),
      where("status", "==", "issued")
    ));

    let totalBooks = 0;
    let availableCopies = 0;
    const categories = new Set();
    let overdue = 0;
    const now = new Date();

    booksSnap.forEach(d => {
      totalBooks++;
      const b = d.data();
      availableCopies += Number(b.quantity || 0);
      categories.add(b.category);
    });

    issuedSnap.forEach(d => {
      const due = d.data().dueDate?.toDate();
      if (due && now > due) overdue++;
    });

    // UI update (only if element exists)
    document.getElementById("totalBooks")?.textContent = totalBooks;
    document.getElementById("issuedBooks")?.textContent = issuedSnap.size;
    document.getElementById("registeredUsers")?.textContent = usersSnap.size;
    document.getElementById("overdueBooks")?.textContent = overdue;
    document.getElementById("availableCopies")?.textContent = availableCopies;
    document.getElementById("totalCategories")?.textContent = categories.size;
  },

  async loadRecentTransactions() {
    const tbody = document.getElementById("recentTransactionsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "transactions"));
    const txs = snap.docs
      .map(d => ({ id: d.id, ...d.data(), issueDate: d.data().issueDate?.toDate() }))
      .sort((a, b) => b.issueDate - a.issueDate)
      .slice(0, 10);

    if (!txs.length) {
      tbody.innerHTML =
        `<tr><td colspan="6" class="no-data">No recent transactions</td></tr>`;
      return;
    }

    txs.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.bookTitle}</td>
        <td>${t.userName}</td>
        <td>${t.userUSN}</td>
        <td>${t.status.toUpperCase()}</td>
        <td>${t.dueDate?.toDate().toLocaleDateString() || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  }
};

/* ==================== BOOKS ==================== */
Admin.books = {

  async init() {
    await this.loadBooks();
    this.bindUI();
  },

  bindUI() {
    document.getElementById("addBookBtn")?.addEventListener("click", this.showAddBookModal);
    document.getElementById("importCsvBtn")?.addEventListener("click", this.importCSV);
    document.getElementById("exportCsvBtn")?.addEventListener("click", this.exportCSV);
    document.getElementById("closeModalBtn")?.addEventListener("click", this.closeModal);
    document.getElementById("cancelModalBtn")?.addEventListener("click", this.closeModal);
    document.getElementById("logoutBtn")?.addEventListener("click", logoutUser);

    const form = document.getElementById("bookForm");
    form?.addEventListener("submit", this.saveBook.bind(this));
  },

  async loadBooks() {
    const tbody = document.getElementById("booksTableBody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "books"));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="9">No books</td></tr>`;
      return;
    }

    snap.forEach(d => {
      const b = d.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img src="${b.coverUrl || '../assets/book-placeholder.jpg'}" class="book-thumbnail"></td>
        <td>${d.id}</td>
        <td>${b.title}</td>
        <td>${b.author}</td>
        <td>${b.isbn || "N/A"}</td>
        <td>${b.category}</td>
        <td>${b.quantity > 0 ? "Yes" : "No"}</td>
        <td>${b.quantity}</td>
        <td><button data-id="${d.id}" class="deleteBtn">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.addEventListener("click", async e => {
        await deleteDoc(doc(db, "books", e.target.dataset.id));
        this.loadBooks();
      });
    });
  },

  async saveBook(e) {
    e.preventDefault();

    await addDoc(collection(db, "books"), {
      title: bookTitle.value.trim(),
      author: bookAuthor.value.trim(),
      isbn: bookISBN.value.trim(),
      category: bookCategory.value.trim(),
      quantity: Number(bookQuantity.value),
      coverUrl: bookCover.value.trim(),
      createdAt: Timestamp.now()
    });

    alert("Book added");
    e.target.reset();
    this.closeModal();
    this.loadBooks();
  },

  importCSV() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async () => {
      const rows = (await input.files[0].text()).split("\n").filter(r => r.trim());
      const headers = rows.shift().split(",");

      for (const r of rows) {
        const values = r.split(",");
        const b = {};
        headers.forEach((h, i) => b[h.trim()] = values[i]?.trim());

        await addDoc(collection(db, "books"), {
          title: b.title,
          author: b.author,
          category: b.category,
          isbn: b.isbn || "",
          quantity: Number(b.quantity || 1),
          coverUrl: b.coverUrl || "",
          createdAt: Timestamp.now()
        });
      }

      alert("CSV Imported");
      Admin.books.loadBooks();
    };

    input.click();
  },

  exportCSV() {
    getDocs(collection(db, "books")).then(snap => {
      const rows = ["title,author,isbn,category,quantity,coverUrl"];
      snap.forEach(d => {
        const b = d.data();
        rows.push(`${b.title},${b.author},${b.isbn || ""},${b.category},${b.quantity},${b.coverUrl || ""}`);
      });

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "books.csv";
      a.click();
    });
  },

  showAddBookModal() {
    document.getElementById("bookModal").style.display = "flex";
  },

  closeModal() {
    document.getElementById("bookModal").style.display = "none";
  }
};

/* ==================== TRANSACTIONS ==================== */
Admin.transactions = {
  async init() {
    await this.load();
  },

  async load() {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "transactions"));

    if (snap.empty) {
      tbody.innerHTML =
        `<tr><td colspan="10" class="no-data">No transactions</td></tr>`;
      return;
    }

    snap.forEach(d => {
      const t = d.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.id}</td>
        <td>${t.bookTitle}</td>
        <td>${t.userName}</td>
        <td>${t.userUSN}</td>
        <td>${t.issueDate?.toDate().toLocaleDateString()}</td>
        <td>${t.dueDate?.toDate().toLocaleDateString()}</td>
        <td>${t.returnDate?.toDate().toLocaleDateString() || "N/A"}</td>
        <td>${t.status}</td>
        <td>${calculateFine(t.dueDate?.toDate())} ₹</td>
        <td>
          ${t.status === "issued"
            ? `<button onclick="Admin.transactions.forceReturn('${d.id}')">Return</button>`
            : "-"}
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async forceReturn(id) {
    await updateDoc(doc(db, "transactions", id), {
      status: "returned",
      returnDate: Timestamp.now()
    });
    alert("Returned");
    this.load();
  }
};

/* ==================== ISSUE / RETURN ==================== */
Admin.issueReturn = {

  async issueBook(book, student) {
    await addDoc(collection(db, "transactions"), {
      bookId: book.id,
      bookTitle: book.title,
      userId: student.id,
      userName: student.name,
      userUSN: student.usn,
      issueDate: Timestamp.now(),
      dueDate: Timestamp.fromDate(
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      ),
      status: "issued"
    });

    await updateDoc(doc(db, "books", book.id), {
      quantity: book.quantity - 1
    });

    alert("Book issued");
  }
};

/* ==================== LOGOUT ==================== */
async function logoutUser() {
  await signOut(auth);
  location.href = "/login.html";
}

/* ==================== INIT ==================== */
protectPage("admin");
Admin.books.init();

// 🔑 Make Admin accessible to HTML buttons
window.Admin = Admin;





/**
 * Smart Library - Admin Panel (Firestore Only)
 * Dashboard, Books, Transactions, Issue/Return
 */
/* ==================== IMPORTS ==================== */
import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc, 
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js"
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

// ==================== ADMIN DASHBOARD ====================

  Admin.dashboard = {
    async init() {
      await this.updateStats();
      await this.loadRecentTransactions();
    },

    async updateStats() {
      // ---------- FIRESTORE QUERIES ----------
      const booksSnap = await getDocs(collection(db, "books"));

      const usersSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "student"))
      );

      const transactionsSnap = await getDocs(collection(db, "transactions"));

      // ---------- PROCESS DATA (OLD LOGIC PRESERVED) ----------
      const books = [];
      const transactions = [];
      const categories = new Set();

      booksSnap.forEach(doc => {
        const data = doc.data();
        books.push({
          id: doc.id,
          ...data,
          quantity: Number(data.quantity || 0)
        });
        if (data.category) categories.add(data.category);
      });

      transactionsSnap.forEach(doc => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          issueDate: data.issueDate?.toDate
            ? data.issueDate.toDate()
            : new Date(data.issueDate),
          dueDate: data.dueDate?.toDate
            ? data.dueDate.toDate()
            : new Date(data.dueDate)
        });
      });

      const usersCount = usersSnap.size;

      // ---------- DASHBOARD CALCULATIONS ----------
      const totalBooks = books.length;

      const issuedCount = transactions.filter(
        t => t.status === "issued"
      ).length;

      const now = new Date();
      const overdueCount = transactions.filter(
        t => t.status === "issued" && now > t.dueDate
      ).length;

      const totalQuantity = books.reduce(
        (sum, b) => sum + b.quantity, 0
      );

      const availableCopies = totalQuantity - issuedCount;

      // ---------- UI UPDATE (IDS UNCHANGED) ----------
      document.getElementById("totalBooks")?.textContent = totalBooks;
      document.getElementById("issuedBooks")?.textContent = issuedCount;
      document.getElementById("registeredUsers")?.textContent = usersCount;
      document.getElementById("overdueBooks")?.textContent = overdueCount;
      document.getElementById("availableCopies")?.textContent = availableCopies;
      document.getElementById("totalCategories")?.textContent = categories.size;
    },

    async loadRecentTransactions() {
      const tbody = document.getElementById("recentTransactionsBody");
      if (!tbody) return;

      tbody.innerHTML = "";

      const snap = await getDocs(collection(db, "transactions"));

      const transactions = snap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            issueDate: data.issueDate?.toDate
              ? data.issueDate.toDate()
              : new Date(data.issueDate),
            dueDate: data.dueDate?.toDate
              ? data.dueDate.toDate()
              : null
          };
        })
        .sort((a, b) => b.issueDate - a.issueDate)
        .slice(0, 10);

      if (!transactions.length) {
        tbody.innerHTML =
          `<tr><td colspan="6" class="no-data">No recent transactions.</td></tr>`;
        return;
      }

      transactions.forEach(t => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${t.id}</td>
          <td>${t.bookTitle}</td>
          <td>${t.userName}</td>
          <td>${t.userUSN}</td>
          <td>
            <span class="status-badge status-${t.status}">
              ${t.status.toUpperCase()}
            </span>
          </td>
          <td>${t.dueDate ? t.dueDate.toLocaleDateString() : "-"}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }
};

/* ==================== BOOKS ==================== */
Admin.books = {

  async init() {
    await this.loadBooks();
    this.setupFilters();
    this.setupForm();
  },

  // ================= LOAD BOOKS =================
  async loadBooks() {
    const tbody = document.getElementById("booksTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "books"));

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="no-data">No books available.</td></tr>';
      return;
    }

    snap.forEach(docSnap => {
      const book = {
        id: docSnap.id,
        ...docSnap.data(),
        quantity: Number(docSnap.data().quantity || 0)
      };
      const row = this.createBookRow(book);
      tbody.appendChild(row);
    });
  },

  // ================= CREATE ROW =================
  createBookRow(book) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <img src="${book.coverUrl || 'assets/book-placeholder.jpg'}"
             alt="${book.title}"
             class="book-thumbnail" loading="lazy">
      </td>
      <td>${book.id}</td>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.isbn || 'N/A'}</td>
      <td>${book.category}</td>
      <td>
        <span class="availability-badge ${book.quantity > 0 ? 'available' : 'unavailable'}">
          ${book.quantity > 0 ? `Yes (${book.quantity})` : 'No'}
        </span>
      </td>
      <td>${book.quantity}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-sm btn-primary" title="Edit"
            onclick="Admin.books.editBook('${book.id}')">
            ✏️
          </button>
          <button class="btn-sm btn-danger" title="Delete"
            onclick="Admin.books.deleteBook('${book.id}')">
            🗑
          </button>
        </div>
      </td>
    `;
    return row;
  },

  // ================= FILTERS =================
  async setupFilters() {
    const searchInput = document.getElementById("bookSearch");
    const categoryFilter = document.getElementById("categoryFilter");

    if (searchInput) {
      searchInput.addEventListener("input", () => this.filterBooks());
    }

    if (categoryFilter) {
      const snap = await getDocs(collection(db, "books"));
      const categories = new Set();

      snap.forEach(d => {
        if (d.data().category) categories.add(d.data().category);
      });

      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });

      categoryFilter.addEventListener("change", () => this.filterBooks());
    }
  },

  async filterBooks() {
    const searchTerm =
      document.getElementById("bookSearch")?.value.toLowerCase() || "";
    const category =
      document.getElementById("categoryFilter")?.value || "";

    const tbody = document.getElementById("booksTableBody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "books"));
    const results = [];

    snap.forEach(docSnap => {
      const b = { id: docSnap.id, ...docSnap.data() };

      const matchSearch =
        !searchTerm ||
        b.title.toLowerCase().includes(searchTerm) ||
        b.author.toLowerCase().includes(searchTerm) ||
        b.id.toLowerCase().includes(searchTerm);

      const matchCategory = !category || b.category === category;

      if (matchSearch && matchCategory) results.push(b);
    });

    if (!results.length) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="no-data">No books found matching your criteria.</td></tr>';
      return;
    }

    results.forEach(b => tbody.appendChild(this.createBookRow(b)));
  },

  // ================= FORM =================
  setupForm() {
    const form = document.getElementById("bookForm");
    if (!form) return;

    form.addEventListener("submit", e => {
      e.preventDefault();
      this.saveBook();
    });
  },

  showAddBookModal() {
    document.getElementById("modalTitle").textContent = "Add New Book";
    document.getElementById("bookId").value = "";
    document.getElementById("bookForm").reset();
    document.getElementById("bookModal").style.display = "flex";
  },

  // ================= EDIT =================
  async editBook(bookId) {
    const snap = await getDoc(doc(db, "books", bookId));
    if (!snap.exists()) {
      alert("Book not found");
      return;
    }

    const b = snap.data();
    document.getElementById("modalTitle").textContent = "Edit Book";
    document.getElementById("bookId").value = bookId;
    document.getElementById("bookTitle").value = b.title;
    document.getElementById("bookAuthor").value = b.author;
    document.getElementById("bookISBN").value = b.isbn || "";
    document.getElementById("bookCategory").value = b.category;
    document.getElementById("bookQuantity").value = b.quantity;
    document.getElementById("bookCover").value = b.coverUrl || "";
    document.getElementById("bookModal").style.display = "flex";
  },

  // ================= DELETE =================
  async deleteBook(bookId) {
    if (!confirm("Are you sure you want to delete this book?")) return;

    await deleteDoc(doc(db, "books", bookId));
    alert("Book deleted successfully");
    this.loadBooks();
  },

  // ================= SAVE =================
  async saveBook() {
    const id = document.getElementById("bookId").value;
    const title = bookTitle.value.trim();
    const author = bookAuthor.value.trim();
    const isbn = bookISBN.value.trim();
    const category = bookCategory.value.trim();
    const quantity = Number(bookQuantity.value);
    const coverUrl = bookCover.value.trim();

    if (!title || !author || !category || quantity < 1) {
      alert("Please fill all required fields");
      return;
    }

    const data = {
      title,
      author,
      isbn,
      category,
      quantity,
      coverUrl,
      updatedAt: Timestamp.now()
    };

    if (id) {
      await updateDoc(doc(db, "books", id), data);
      alert("Book updated successfully");
    } else {
      await addDoc(collection(db, "books"), {
        ...data,
        createdAt: Timestamp.now()
      });
      alert("Book added successfully");
    }

    this.closeModal();
    this.loadBooks();
  },

  closeModal() {
    document.getElementById("bookModal").style.display = "none";
  },

  // ================= CSV =================
  importCSV() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async () => {
      const rows = (await input.files[0].text())
        .split("\n")
        .filter(r => r.trim());

      const headers = rows.shift().split(",");

      for (const r of rows) {
        const vals = r.split(",");
        const b = {};
        headers.forEach((h, i) => (b[h.trim()] = vals[i]?.trim()));

        await addDoc(collection(db, "books"), {
          title: b.title,
          author: b.author,
          isbn: b.isbn || "",
          category: b.category,
          quantity: Number(b.quantity || 1),
          coverUrl: b.coverUrl || "",
          createdAt: Timestamp.now()
        });
      }

      alert("CSV Imported");
      this.loadBooks();
    };

    input.click();
  },

  exportCSV() {
    getDocs(collection(db, "books")).then(snap => {
      const rows = ["title,author,isbn,category,quantity,coverUrl"];
      snap.forEach(d => {
        const b = d.data();
        rows.push(
          `${b.title},${b.author},${b.isbn || ""},${b.category},${b.quantity},${b.coverUrl || ""}`
        );
      });

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "books.csv";
      a.click();
    });
  }
};

/* ==================== TRANSACTIONS ==================== */
Admin.transactions = {

  async init() {
    await this.loadTransactions();
    this.setupFilters();
  },

  // ================= LOAD =================
  async loadTransactions() {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "transactions"));

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="10" class="no-data">No transactions found.</td></tr>';
      return;
    }

    const transactions = snap.docs.map(d => {
      const t = d.data();
      return {
        id: d.id,
        ...t,
        issueDate: t.issueDate?.toDate ? t.issueDate.toDate() : new Date(t.issueDate),
        dueDate: t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate),
        returnDate: t.returnDate?.toDate ? t.returnDate.toDate() : null
      };
    }).sort((a, b) => b.issueDate - a.issueDate);

    transactions.forEach(t => {
      tbody.appendChild(this.createTransactionRow(t));
    });
  },

  // ================= ROW =================
  createTransactionRow(transaction) {
    const row = document.createElement("tr");

    const now = new Date();
    const fine = this.calculateFine(transaction.dueDate);
    const isOverdue =
      transaction.status === "issued" && now > transaction.dueDate;

    row.innerHTML = `
      <td>${transaction.id}</td>
      <td>${transaction.bookTitle}</td>
      <td>${transaction.userName}</td>
      <td>${transaction.userUSN}</td>
      <td>${this.formatDate(transaction.issueDate)}</td>
      <td>${this.formatDate(transaction.dueDate)}</td>
      <td>${transaction.returnDate ? this.formatDate(transaction.returnDate) : 'N/A'}</td>
      <td>
        <span class="status-badge status-${transaction.status} ${isOverdue ? 'overdue' : ''}">
          ${transaction.status.toUpperCase()}
          ${isOverdue ? ' (OVERDUE)' : ''}
        </span>
      </td>
      <td>${fine} ₹</td>
      <td>
        <div class="action-buttons">
          ${
            transaction.status === "issued"
              ? `<button onclick="Admin.transactions.forceReturn('${transaction.id}')"
                        class="btn-sm btn-warning" title="Force Return">
                    Force Return
                 </button>`
              : '<span class="text-muted">-</span>'
          }
          <button onclick="Admin.transactions.deleteTransaction('${transaction.id}')"
                  class="btn-sm btn-danger" title="Delete Transaction">
            🗑
          </button>
        </div>
      </td>
    `;

    return row;
  },

  // ================= FILTERS =================
  setupFilters() {
    const searchInput = document.getElementById("transactionSearch");
    const statusFilter = document.getElementById("statusFilter");

    if (searchInput) {
      searchInput.addEventListener("input", () => this.filterTransactions());
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => this.filterTransactions());
    }
  },

  async filterTransactions() {
    const searchTerm =
      document.getElementById("transactionSearch")?.value.toLowerCase() || "";
    const status =
      document.getElementById("statusFilter")?.value || "";

    const tbody = document.getElementById("transactionsTableBody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "transactions"));
    const results = [];

    snap.forEach(d => {
      const t = d.data();
      const tx = {
        id: d.id,
        ...t,
        issueDate: t.issueDate?.toDate(),
        dueDate: t.dueDate?.toDate(),
        returnDate: t.returnDate?.toDate() || null
      };

      const matchSearch =
        !searchTerm ||
        tx.bookTitle.toLowerCase().includes(searchTerm) ||
        tx.userName.toLowerCase().includes(searchTerm) ||
        tx.userUSN.toLowerCase().includes(searchTerm) ||
        tx.id.toLowerCase().includes(searchTerm);

      const matchStatus = !status || tx.status === status;

      if (matchSearch && matchStatus) results.push(tx);
    });

    if (!results.length) {
      tbody.innerHTML =
        '<tr><td colspan="10" class="no-data">No transactions found matching your criteria.</td></tr>';
      return;
    }

    results
      .sort((a, b) => b.issueDate - a.issueDate)
      .forEach(tx => tbody.appendChild(this.createTransactionRow(tx)));
  },

  // ================= ACTIONS =================
  async forceReturn(transactionId) {
    if (!confirm("Force return this book?")) return;

    await updateDoc(doc(db, "transactions", transactionId), {
      status: "returned",
      returnDate: Timestamp.now()
    });

    alert("Book returned successfully");

    if (document.getElementById("totalBooks")) {
      Admin.dashboard.updateStats();
    }

    this.loadTransactions();
  },

  async deleteTransaction(transactionId) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    await deleteDoc(doc(db, "transactions", transactionId));

    alert("Transaction deleted successfully");

    if (document.getElementById("totalBooks")) {
      Admin.dashboard.updateStats();
    }

    this.loadTransactions();
  },

  // ================= UTILITIES =================
  calculateFine(dueDate) {
    const now = new Date();
    if (!dueDate || now <= dueDate) return 0;
    const days = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    return days * 2; // same logic as old App.calculateFine
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString();
  },

  // ================= EXPORT =================
  async exportTransactionCSV() {
    const snap = await getDocs(collection(db, "transactions"));
    if (snap.empty) {
      alert("No transactions to export");
      return;
    }

    const rows = [
      "transactionId,bookTitle,bookId,userName,userUSN,issueDate,dueDate,returnDate,status,fine"
    ];

    snap.forEach(d => {
      const t = d.data();
      const due = t.dueDate?.toDate();
      rows.push(
        `${d.id},${t.bookTitle},${t.bookId || ""},${t.userName},${t.userUSN},` +
        `${t.issueDate?.toDate().toISOString()},${due?.toISOString()},` +
        `${t.returnDate?.toDate()?.toISOString() || ""},${t.status},${this.calculateFine(due)}`
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transactions.csv";
    a.click();
  }
};

/* ==================== ISSUE / RETURN ==================== */
Admin.issueReturn = {

  init() {
    this.scanner = null;
    this.selectedBook = null;
    this.selectedStudent = null;
    this.setupScanner();
    this.setupEventListeners();
  },

  // ================= EVENTS =================
  setupEventListeners() {
    const bookSearch = document.getElementById("bookSearch");
    const studentSearch = document.getElementById("studentSearch");

    if (bookSearch) {
      bookSearch.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchBook();
        }
      });
    }

    if (studentSearch) {
      studentSearch.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchStudent();
        }
      });
    }
  },

  // ================= SCANNER =================
  setupScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      document.getElementById("scannerError")?.style.display = "block";
      return;
    }

    this.scanner = {
      start: () => console.log("Scanner started"),
      stop: () => console.log("Scanner stopped")
    };
  },

  // ================= BOOK SEARCH =================
  async searchBook() {
    const term = document.getElementById("bookSearch").value.trim();
    if (!term) {
      alert("Please enter a search term");
      return;
    }

    const snap = await getDocs(collection(db, "books"));
    let book = null;

    snap.forEach(d => {
      const b = { id: d.id, ...d.data() };
      if (
        d.id === term ||
        b.title?.toLowerCase().includes(term.toLowerCase())
      ) {
        book = b;
      }
    });

    if (!book) {
      alert("Book not found");
      return;
    }

    this.selectedBook = book;
    this.displayBookInfo(book);
  },

  displayBookInfo(book) {
    document.getElementById("selectedBookInfo").innerHTML = `
      <div class="book-info">
        <img src="${book.coverUrl || 'assets/book-placeholder.jpg'}"
             class="book-cover">
        <div class="book-details">
          <h4>${book.title}</h4>
          <p><strong>Author:</strong> ${book.author}</p>
          <p><strong>ISBN:</strong> ${book.isbn || "N/A"}</p>
          <p><strong>Available:</strong> ${book.quantity}</p>
          <p><strong>Status:</strong>
            <span class="availability-badge ${book.quantity > 0 ? 'available' : 'unavailable'}">
              ${book.quantity > 0 ? "Available" : "Out of Stock"}
            </span>
          </p>
        </div>
      </div>
    `;

    document.getElementById("bookResults").style.display = "block";
    document.getElementById("issueBtn").disabled = book.quantity <= 0;
    document.getElementById("returnBtn").disabled = true;
  },

  // ================= STUDENT SEARCH =================
  async searchStudent() {
    const term = document.getElementById("studentSearch").value.trim();
    if (!term) {
      alert("Please enter a search term");
      return;
    }

    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "student"))
    );

    let student = null;

    snap.forEach(d => {
      const u = { id: d.id, ...d.data() };
      if (
        u.name?.toLowerCase().includes(term.toLowerCase()) ||
        u.usn?.toLowerCase().includes(term.toLowerCase()) ||
        u.email?.toLowerCase().includes(term.toLowerCase())
      ) {
        student = u;
      }
    });

    if (!student) {
      alert("Student not found");
      document.getElementById("studentResults").innerHTML = "";
      return;
    }

    this.selectedStudent = student;
    this.displayStudentInfo(student);
  },

  displayStudentInfo(student) {
    document.getElementById("studentResults").innerHTML = `
      <div class="student-card glass-card">
        <h4>${student.name}</h4>
        <p><strong>USN:</strong> ${student.usn}</p>
        <p><strong>Email:</strong> ${student.email}</p>
        <p><strong>Phone:</strong> ${student.phone || "-"}</p>
      </div>
    `;

    document.getElementById("issueBtn").disabled =
      !this.selectedBook || this.selectedBook.quantity <= 0;
    document.getElementById("returnBtn").disabled = false;
  },

  // ================= ISSUE =================
  async issueBook() {
    if (!this.selectedBook || !this.selectedStudent) {
      alert("Please select both book and student");
      return;
    }

    if (this.selectedBook.quantity <= 0) {
      alert("Book is not available");
      return;
    }

    // Create transaction
    await addDoc(collection(db, "transactions"), {
      bookId: this.selectedBook.id,
      bookTitle: this.selectedBook.title,
      userId: this.selectedStudent.id,
      userName: this.selectedStudent.name,
      userUSN: this.selectedStudent.usn,
      issueDate: Timestamp.now(),
      dueDate: Timestamp.fromDate(
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      ),
      status: "issued"
    });

    // Update book quantity
    await updateDoc(doc(db, "books", this.selectedBook.id), {
      quantity: this.selectedBook.quantity - 1
    });

    alert("Book issued successfully");

    if (document.getElementById("totalBooks")) {
      Admin.dashboard.updateStats();
    }

    this.resetForm();
  },

  // ================= RETURN =================
  async returnBook() {
    if (!this.selectedBook || !this.selectedStudent) {
      alert("Please select both book and student");
      return;
    }

    const snap = await getDocs(
      query(
        collection(db, "transactions"),
        where("bookId", "==", this.selectedBook.id),
        where("userId", "==", this.selectedStudent.id),
        where("status", "==", "issued")
      )
    );

    if (snap.empty) {
      alert("No active issue found for this book and student");
      return;
    }

    const txDoc = snap.docs[0];

    await updateDoc(doc(db, "transactions", txDoc.id), {
      status: "returned",
      returnDate: Timestamp.now()
    });

    await updateDoc(doc(db, "books", this.selectedBook.id), {
      quantity: this.selectedBook.quantity + 1
    });

    alert("Book returned successfully");

    if (document.getElementById("totalBooks")) {
      Admin.dashboard.updateStats();
    }

    this.resetForm();
  },

  // ================= RESET =================
  resetForm() {
    this.selectedBook = null;
    this.selectedStudent = null;
    document.getElementById("bookSearch").value = "";
    document.getElementById("studentSearch").value = "";
    document.getElementById("selectedBookInfo").innerHTML = "";
    document.getElementById("studentResults").innerHTML = "";
    document.getElementById("bookResults").style.display = "none";
  }
};

/* ==================== LOGOUT ==================== */
async function logoutUser() {
  await signOut(auth);
  location.href = "/login.html";
}

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", () => {
  protectPage("admin");
  Admin.books.init();
  window.Admin = Admin; // required for inline onclick
});



/**
 * Smart Library - Admin Panel Functionality
 * Books management, transactions, issue/return operations
 */
// ==================== FIRESTORE HELPERS ====================
async function getFirestoreTransactions() {
  const snap = await getDocs(collection(db, "transactions"));
  const transactions = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    transactions.push({
      id: docSnap.id,
      ...data,
      issueDate: data.issueDate?.toDate(),
      dueDate: data.dueDate?.toDate(),
      returnDate: data.returnDate ? data.returnDate.toDate() : null
    });
  });

  return transactions;
}

function calculateFine(dueDate) {
  if (!dueDate) return 0;
  const now = new Date();
  const days = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  return days > 0 ? days * 5 : 0;
}
const Admin = {
    // ==================== DASHBOARD ====================
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export async function loadDashboardStats() {

  // Books
  const booksSnap = await getDocs(collection(db, "books"));
  let totalBooks = 0;
  let availableCopies = 0;
  const categories = new Set();

  booksSnap.forEach(doc => {
    totalBooks++;
    const b = doc.data();
    availableCopies += Number(b.quantity || 0);
    categories.add(b.category);
  });

  // Transactions
  const issuedSnap = await getDocs(
    query(collection(db, "transactions"), where("status", "==", "issued"))
  );

  let overdue = 0;
  const now = new Date();

  issuedSnap.forEach(doc => {
    const due = doc.data().dueDate?.toDate();
    if (due && now > due) overdue++;
  });

  // Users
  const usersSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student"))
  );

  // UI update
  totalBooksEl.textContent = totalBooks;
  issuedBooks.textContent = issuedSnap.size;
  registeredUsers.textContent = usersSnap.size;
  overdueBooks.textContent = overdue;
  availableCopiesEl.textContent = availableCopies;
  totalCategories.textContent = categories.size;
}
   // ==================== BOOKS MANAGEMENT (FIRESTORE ONLY) ====================
books: {

  async init() {
    await this.loadBooks();
    this.setupForm();
  },

  async loadBooks() {
    const tbody = document.getElementById("booksTableBody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "books"));

    if (snap.empty) {
      tbody.innerHTML =
        `<tr><td colspan="9" class="no-data">No books available.</td></tr>`;
      return;
    }

    snap.forEach(docSnap => {
      const book = { id: docSnap.id, ...docSnap.data() };
      tbody.appendChild(this.createBookRow(book));
    });
  },

  createBookRow(book) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <img src="${book.coverUrl || '../assets/book-placeholder.jpg'}"
             class="book-thumbnail"
             alt="${book.title}">
      </td>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.isbn || "N/A"}</td>
      <td>${book.category}</td>
      <td>
        <span class="availability-badge ${book.quantity > 0 ? 'available' : 'unavailable'}">
          ${book.quantity > 0 ? `Yes (${book.quantity})` : 'No'}
        </span>
      </td>
      <td>
        <button class="btn-sm btn-danger"
                onclick="Admin.books.deleteBook('${book.id}')">
          Delete
        </button>
      </td>
    `;

    return row;
  },

  setupForm() {
    const form = document.getElementById("bookForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.saveBook();
    });
  },

  async saveBook() {
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

    await addDoc(collection(db, "books"), {
      title,
      author,
      isbn,
      category,
      quantity,
      coverUrl,
      createdAt: Timestamp.now()
    });

    alert("Book added successfully");
    document.getElementById("bookForm").reset();
    this.loadBooks();
  },

  async deleteBook(bookId) {
    if (!confirm("Are you sure you want to delete this book?")) return;

    await deleteDoc(doc(db, "books", bookId));
    alert("Book deleted");
    this.loadBooks();
  },

  importCSV() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const rows = text.split("\n").filter(r => r.trim());

      const headers = rows[0].split(",").map(h => h.trim());

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(",");
        if (values.length < headers.length) continue;

        const book = {};
        headers.forEach((h, idx) => {
          book[h] = values[idx]?.trim();
        });

        await addDoc(collection(db, "books"), {
          title: book.title,
          author: book.author,
          isbn: book.isbn || "",
          category: book.category,
          quantity: Number(book.quantity || 1),
          coverUrl: book.coverUrl || "",
          createdAt: Timestamp.now()
        });
      }

      alert("CSV imported successfully");
      this.loadBooks();
    };

    input.click();
  }
},
   // ==================== TRANSACTIONS ====================
  transactions: {

    async init() {
      await this.loadTransactions();
      this.setupFilters();
    },

    async loadTransactions() {
      const transactions = (await getFirestoreTransactions())
        .sort((a, b) => b.issueDate - a.issueDate);

      const tbody = document.getElementById("transactionsTableBody");
      tbody.innerHTML = "";

      if (transactions.length === 0) {
        tbody.innerHTML =
          `<tr><td colspan="10" class="no-data">No transactions found.</td></tr>`;
        return;
      }

      transactions.forEach(tx => {
        tbody.appendChild(this.createTransactionRow(tx));
      });
    },

    createTransactionRow(transaction) {
      const row = document.createElement("tr");
      const fine = calculateFine(transaction.dueDate);
      const isOverdue =
        transaction.status === "issued" &&
        new Date() > transaction.dueDate;

      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${transaction.bookTitle}</td>
        <td>${transaction.userName}</td>
        <td>${transaction.userUSN}</td>
        <td>${transaction.issueDate.toLocaleDateString()}</td>
        <td>${transaction.dueDate.toLocaleDateString()}</td>
        <td>${transaction.returnDate ? transaction.returnDate.toLocaleDateString() : "N/A"}</td>
        <td>
          <span class="status-badge status-${transaction.status} ${isOverdue ? "overdue" : ""}">
            ${transaction.status.toUpperCase()}
            ${isOverdue ? " (OVERDUE)" : ""}
          </span>
        </td>
        <td>${fine} ₹</td>
        <td>
          <div class="action-buttons">
            ${
              transaction.status === "issued"
                ? `<button class="btn-sm btn-warning"
                           onclick="Admin.transactions.forceReturn('${transaction.id}')">
                      Force Return
                   </button>`
                : `<span class="text-muted">-</span>`
            }
            <button class="btn-sm btn-danger"
                    onclick="Admin.transactions.deleteTransaction('${transaction.id}')">
              Delete
            </button>
          </div>
        </td>
      `;

      return row;
    },

    setupFilters() {
      const searchInput = document.getElementById("transactionSearch");
      const statusFilter = document.getElementById("statusFilter");

      if (searchInput)
        searchInput.addEventListener("input", () => this.filterTransactions());

      if (statusFilter)
        statusFilter.addEventListener("change", () => this.filterTransactions());
    },

    async filterTransactions() {
      const searchTerm =
        document.getElementById("transactionSearch")?.value.toLowerCase() || "";
      const status =
        document.getElementById("statusFilter")?.value || "";

      const transactions = await getFirestoreTransactions();

      const filtered = transactions.filter(tx => {
        const matchesSearch =
          !searchTerm ||
          tx.bookTitle.toLowerCase().includes(searchTerm) ||
          tx.userName.toLowerCase().includes(searchTerm) ||
          tx.userUSN.toLowerCase().includes(searchTerm) ||
          tx.id.toLowerCase().includes(searchTerm);

        const matchesStatus = !status || tx.status === status;
        return matchesSearch && matchesStatus;
      });

      const tbody = document.getElementById("transactionsTableBody");
      tbody.innerHTML = "";

      if (filtered.length === 0) {
        tbody.innerHTML =
          `<tr><td colspan="10" class="no-data">No transactions found.</td></tr>`;
        return;
      }

      filtered.forEach(tx => {
        tbody.appendChild(this.createTransactionRow(tx));
      });
    },

    async forceReturn(transactionId) {
      if (!confirm("Force return this book?")) return;

      await updateDoc(doc(db, "transactions", transactionId), {
        status: "returned",
        returnDate: Timestamp.now()
      });

      alert("Book returned successfully");
      this.loadTransactions();
    },

    async deleteTransaction(transactionId) {
      if (!confirm("Delete this transaction permanently?")) return;

      await deleteDoc(doc(db, "transactions", transactionId));
      alert("Transaction deleted");
      this.loadTransactions();
    },

    async exportTransactionCSV() {
      const transactions = await getFirestoreTransactions();

      if (transactions.length === 0) {
        alert("No transactions to export");
        return;
      }

      const csvData = transactions.map(tx => ({
        transactionId: tx.id,
        bookTitle: tx.bookTitle,
        userName: tx.userName,
        userUSN: tx.userUSN,
        issueDate: tx.issueDate.toISOString(),
        dueDate: tx.dueDate.toISOString(),
        returnDate: tx.returnDate ? tx.returnDate.toISOString() : "",
        status: tx.status,
        fine: calculateFine(tx.dueDate)
      }));

      App.exportToCSV(csvData, "transactions");
    }
  }
};

// INIT
document.addEventListener("DOMContentLoaded", () => {
  if (Admin.transactions) {
    Admin.transactions.init();
  }
});
  // ==================== ISSUE / RETURN SYSTEM (FIRESTORE) ====================
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

Admin.issueReturn = {

  init() {
    this.selectedBook = null;
    this.selectedStudent = null;
    this.setupEventListeners();
  },

  setupEventListeners() {
    const bookSearch = document.getElementById("bookSearch");
    const studentSearch = document.getElementById("studentSearch");

    if (bookSearch) {
      bookSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchBook();
        }
      });
    }

    if (studentSearch) {
      studentSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchStudent();
        }
      });
    }
  },

  // ==================== BOOK SEARCH ====================
  async searchBook() {
    const searchTerm = document.getElementById("bookSearch").value.trim();
    if (!searchTerm) {
      alert("Enter book title / ID");
      return;
    }

    const snap = await getDocs(collection(db, "books"));
    let foundBook = null;

    snap.forEach(docSnap => {
      const b = docSnap.data();
      if (
        docSnap.id === searchTerm ||
        b.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        foundBook = { id: docSnap.id, ...b };
      }
    });

    if (!foundBook) {
      alert("Book not found");
      return;
    }

    this.selectedBook = foundBook;
    this.displayBookInfo(foundBook);
  },

  displayBookInfo(book) {
    document.getElementById("selectedBookInfo").innerHTML = `
      <div class="book-info">
        <img src="${book.coverUrl || '../assets/book-placeholder.jpg'}"
             class="book-cover">
        <div class="book-details">
          <h4>${book.title}</h4>
          <p><strong>Author:</strong> ${book.author}</p>
          <p><strong>ISBN:</strong> ${book.isbn || "N/A"}</p>
          <p><strong>Available:</strong> ${book.quantity}</p>
          <p>
            <span class="availability-badge ${
              book.quantity > 0 ? "available" : "unavailable"
            }">
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

  // ==================== STUDENT SEARCH ====================
  async searchStudent() {
    const searchTerm = document.getElementById("studentSearch").value.trim();
    if (!searchTerm) {
      alert("Enter student name / USN / email");
      return;
    }

    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );

    const snap = await getDocs(q);
    let student = null;

    snap.forEach(docSnap => {
      const u = docSnap.data();
      if (
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        student = { id: docSnap.id, ...u };
      }
    });

    if (!student) {
      alert("Student not found");
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
      </div>
    `;

    document.getElementById("issueBtn").disabled =
      !this.selectedBook || this.selectedBook.quantity <= 0;

    document.getElementById("returnBtn").disabled = false;
  },

  // ==================== ISSUE BOOK ====================
  async issueBook() {
    if (!this.selectedBook || !this.selectedStudent) {
      alert("Select book and student");
      return;
    }

    if (this.selectedBook.quantity <= 0) {
      alert("Book not available");
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
      returnDate: null,
      status: "issued"
    });

    // Reduce book quantity
    await updateDoc(doc(db, "books", this.selectedBook.id), {
      quantity: this.selectedBook.quantity - 1
    });

    alert("Book issued successfully");
    this.resetForm();
  },

  // ==================== RETURN BOOK ====================
  async returnBook() {
    if (!this.selectedBook || !this.selectedStudent) {
      alert("Select book and student");
      return;
    }

    const q = query(
      collection(db, "transactions"),
      where("bookId", "==", this.selectedBook.id),
      where("userId", "==", this.selectedStudent.id),
      where("status", "==", "issued")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      alert("No active issue found");
      return;
    }

    const txDoc = snap.docs[0];

    // Mark transaction returned
    await updateDoc(txDoc.ref, {
      status: "returned",
      returnDate: Timestamp.now()
    });

    // Increase book quantity
    await updateDoc(doc(db, "books", this.selectedBook.id), {
      quantity: this.selectedBook.quantity + 1
    });

    alert("Book returned successfully");
    this.resetForm();
  },

  // ==================== RESET ====================
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



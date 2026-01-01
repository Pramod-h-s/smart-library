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
        init() {
            this.loadTransactions();
            this.setupFilters();
        },

        loadTransactions() {
            const transactions = App.getTransactions()
                .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

            const tbody = document.getElementById('transactionsTableBody');
            tbody.innerHTML = '';

            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="no-data">No transactions found.</td></tr>';
                return;
            }

            transactions.forEach(transaction => {
                const row = this.createTransactionRow(transaction);
                tbody.appendChild(row);
            });
        },

        createTransactionRow(transaction) {
            const row = document.createElement('tr');
            const fine = App.calculateFine(transaction.dueDate);
            const isOverdue = transaction.status === 'issued' && new Date() > new Date(transaction.dueDate);

            row.innerHTML = `
                <td>${transaction.id}</td>
                <td>${transaction.bookTitle}</td>
                <td>${transaction.userName}</td>
                <td>${transaction.userUSN}</td>
                <td>${App.formatDate(transaction.issueDate)}</td>
                <td>${App.formatDate(transaction.dueDate)}</td>
                <td>${transaction.returnDate ? App.formatDate(transaction.returnDate) : 'N/A'}</td>
                <td>
                    <span class="status-badge status-${transaction.status} ${isOverdue ? 'overdue' : ''}">
                        ${transaction.status.toUpperCase()}
                        ${isOverdue ? ' (OVERDUE)' : ''}
                    </span>
                </td>
                <td>${fine} ₹</td>
                <td>
                    <div class="action-buttons">
                        ${transaction.status === 'issued' ?
                            `<button onclick="Admin.transactions.forceReturn('${transaction.id}')"
                                    class="btn-sm btn-warning" title="Force Return">Force Return</button>` :
                            '<span class="text-muted">-</span>'
                        }
                        <button onclick="Admin.transactions.deleteTransaction('${transaction.id}')"
                                class="btn-sm btn-danger" title="Delete Transaction">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;

            return row;
        },

        setupFilters() {
            const searchInput = document.getElementById('transactionSearch');
            const statusFilter = document.getElementById('statusFilter');

            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterTransactions());
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', () => this.filterTransactions());
            }
        },

        filterTransactions() {
            const searchTerm = document.getElementById('transactionSearch')?.value.toLowerCase() || '';
            const status = document.getElementById('statusFilter')?.value || '';
            
            const transactions = App.getTransactions().filter(transaction => {
                const matchesSearch = !searchTerm || 
                    transaction.bookTitle.toLowerCase().includes(searchTerm) ||
                    transaction.userName.toLowerCase().includes(searchTerm) ||
                    transaction.userUSN.toLowerCase().includes(searchTerm) ||
                    transaction.id.toLowerCase().includes(searchTerm);
                
                const matchesStatus = !status || transaction.status === status;
                
                return matchesSearch && matchesStatus;
            });

            const tbody = document.getElementById('transactionsTableBody');
            tbody.innerHTML = '';

            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="no-data">No transactions found matching your criteria.</td></tr>';
                return;
            }

            transactions.forEach(transaction => {
                const row = this.createTransactionRow(transaction);
                tbody.appendChild(row);
            });
        },

        forceReturn(transactionId) {
            if (!confirm('Force return this book?')) {
                return;
            }

            try {
                App.returnBook(transactionId);
                App.showToast('Book returned successfully');
                if (document.getElementById('totalBooks')) {
                    Admin.dashboard.updateStats();
                }
                this.loadTransactions();
            } catch (error) {
                App.showToast(error.message, 'error');
            }
        },

        deleteTransaction(transactionId) {
            if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                return;
            }

            try {
                const transactions = App.getTransactions();
                const updated = transactions.filter(t => t.id !== transactionId);
                App.saveTransactions(updated);
                App.showToast('Transaction deleted successfully');
                if (document.getElementById('totalBooks')) {
                    Admin.dashboard.updateStats();
                }
                this.loadTransactions();

            } catch (error) {
                App.showToast('Failed to delete transaction: ' + error.message, 'error');
            }
        },

        exportTransactionCSV() {
            const transactions = App.getTransactions();
            if (transactions.length === 0) {
                App.showToast('No transactions to export', 'error');
                return;
            }

            const csvData = transactions.map(transaction => ({
                transactionId: transaction.id,
                bookTitle: transaction.bookTitle,
                bookId: transaction.bookId,
                userName: transaction.userName,
                userUSN: transaction.userUSN,
                issueDate: transaction.issueDate,
                dueDate: transaction.dueDate,
                returnDate: transaction.returnDate || '',
                status: transaction.status,
                fine: App.calculateFine(transaction.dueDate)
            }));

            App.exportToCSV(csvData, 'transactions');
        }
    },

    // ==================== ISSUE/RETURN SYSTEM ====================
    issueReturn: {
        init() {
            this.scanner = null;
            this.selectedBook = null;
            this.selectedStudent = null;
            this.setupScanner();
            this.setupEventListeners();
        },

        setupEventListeners() {
            const bookSearch = document.getElementById('bookSearch');
            const studentSearch = document.getElementById('studentSearch');

            if (bookSearch) {
                bookSearch.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.searchBook();
                    }
                });
            }

            if (studentSearch) {
                studentSearch.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.searchStudent();
                    }
                });
            }
        },

        setupScanner() {
            // Check if camera is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                document.getElementById('scannerError').style.display = 'block';
                return;
            }

            // Initialize scanner (this is a placeholder - you would need to integrate with a real barcode scanner library)
            this.scanner = {
                start: () => {
                    // Placeholder for scanner implementation
                    console.log('Scanner started');
                },
                stop: () => {
                    // Placeholder for scanner implementation
                    console.log('Scanner stopped');
                }
            };
        },

        searchBook() {
            const searchTerm = document.getElementById('bookSearch').value.trim();
            if (!searchTerm) {
                App.showToast('Please enter a search term', 'error');
                return;
            }

            const book = App.findBookById(searchTerm) || 
                        App.getBooks().find(b => 
                            b.title.toLowerCase().includes(searchTerm.toLowerCase())
                        );

            if (!book) {
                App.showToast('Book not found', 'error');
                return;
            }

            this.selectedBook = book;
            this.displayBookInfo(book);
        },

        displayBookInfo(book) {
            const bookInfo = `
                <div class="book-info">
                    <img src="${book.coverUrl || 'assets/book-placeholder.jpg'}" 
                         alt="${book.title}" class="book-cover">
                    <div class="book-details">
                        <h4>${book.title}</h4>
                        <p><strong>Author:</strong> ${book.author}</p>
                        <p><strong>ISBN:</strong> ${book.isbn || 'N/A'}</p>
                        <p><strong>Available:</strong> ${book.quantity} copies</p>
                        <p><strong>Status:</strong> 
                            <span class="availability-badge ${book.quantity > 0 ? 'available' : 'unavailable'}">
                                ${book.quantity > 0 ? 'Available' : 'Out of Stock'}
                            </span>
                        </p>
                    </div>
                </div>
            `;

            document.getElementById('selectedBookInfo').innerHTML = bookInfo;
            document.getElementById('bookResults').style.display = 'block';
            
            // Enable/disable issue button based on availability
            document.getElementById('issueBtn').disabled = book.quantity <= 0;
            document.getElementById('returnBtn').disabled = true;
        },

        searchStudent() {
            const searchTerm = document.getElementById('studentSearch').value.trim();
            if (!searchTerm) {
                App.showToast('Please enter a search term', 'error');
                return;
            }

            const users = App.getUsers().filter(u => u.role === 'student');
            const student = users.find(u => 
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (!student) {
                App.showToast('Student not found', 'error');
                document.getElementById('studentResults').innerHTML = '';
                return;
            }

            this.selectedStudent = student;
            this.displayStudentInfo(student);
        },

        displayStudentInfo(student) {
            const studentInfo = `
                <div class="student-card glass-card">
                    <h4>${student.name}</h4>
                    <p><strong>USN:</strong> ${student.usn}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Phone:</strong> ${student.phone}</p>
                </div>
            `;

            document.getElementById('studentResults').innerHTML = studentInfo;
            
            // Enable action buttons if both book and student are selected
            const issueBtn = document.getElementById('issueBtn');
            const returnBtn = document.getElementById('returnBtn');
            
            if (this.selectedBook && this.selectedBook.quantity > 0) {
                issueBtn.disabled = false;
            }
            returnBtn.disabled = false;
        },

        issueBook() {
            if (!this.selectedBook || !this.selectedStudent) {
                App.showToast('Please select both book and student', 'error');
                return;
            }

            if (this.selectedBook.quantity <= 0) {
                App.showToast('Book is not available', 'error');
                return;
            }

            try {
                App.issueBook(this.selectedBook.id, this.selectedStudent.userId);
                App.showToast('Book issued successfully');
                if (document.getElementById('totalBooks')) {
                    Admin.dashboard.updateStats();
                }
                this.resetForm();
                this.loadTransactions();
            } catch (error) {
                App.showToast(error.message, 'error');
            }
        },

        returnBook() {
            if (!this.selectedBook || !this.selectedStudent) {
                App.showToast('Please select both book and student', 'error');
                return;
            }

            // Find active transaction
            const transactions = App.getTransactions();
            const transaction = transactions.find(t => 
                t.bookId === this.selectedBook.id && 
                t.userId === this.selectedStudent.userId &&
                t.status === 'issued'
            );

            if (!transaction) {
                App.showToast('No active issue found for this book and student', 'error');
                return;
            }

            try {
                App.returnBook(transaction.id);
                App.showToast('Book returned successfully');
                if (document.getElementById('totalBooks')) {
                    Admin.dashboard.updateStats();
                }
                this.resetForm();
                this.loadTransactions();
            } catch (error) {
                App.showToast(error.message, 'error');
            }
        },

        resetForm() {
            this.selectedBook = null;
            this.selectedStudent = null;
            document.getElementById('bookSearch').value = '';
            document.getElementById('studentSearch').value = '';
            document.getElementById('selectedBookInfo').innerHTML = '';
            document.getElementById('studentResults').innerHTML = '';
            document.getElementById('bookResults').style.display = 'none';
        },

        loadTransactions() {
            // Refresh the transactions count on dashboard if on that page
            if (typeof Admin.dashboard !== 'undefined' && document.getElementById('totalBooks')) {
                Admin.dashboard.updateStats();
            }
        }
    }
};

// Initialize admin functionality
document.addEventListener('DOMContentLoaded', () => {
    // Admin functionality is initialized by individual page scripts

});

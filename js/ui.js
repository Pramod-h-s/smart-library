/**
 * Smart Library - UI Controller
 * Navbar, Footer, Logout
 */

import { auth, db } from "./firebase.js";
import { logoutUser } from "./auth-check.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const UI = {

  navConfig: {
    guest: [
      { label: "Home", href: "/index.html" },
      { label: "Books", href: "/books.html" },
      { label: "About", href: "/about.html" },
      { label: "Login", href: "/login.html" }
    ],
    student: [
      { label: "Home", href: "/index.html" },
      { label: "Books", href: "/books.html" },
      { label: "Dashboard", href: "/user/dashboard.html" },
      { label: "Profile", href: "/user/profile.html" },
      { label: "Logout", action: "logout" }
    ],
    admin: [
      { label: "Home", href: "/index.html" },
      { label: "Books", href: "/books.html" },
      { label: "Admin Dashboard", href: "/admin/dashboard.html" },
      { label: "Books Manager", href: "/admin/books.html" },
      { label: "Transactions", href: "/admin/transactions.html" },
      { label: "Issue / Return", href: "/admin/issue-return.html" },
      { label: "Logout", action: "logout" }
    ]
  },

  renderNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    onAuthStateChanged(auth, async (user) => {
      let role = "guest";

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          role = snap.data().role;
        }
      }

      const links = this.navConfig[role];
      const currentPage = location.pathname.split("/").pop();

      nav.innerHTML = `
        <div class="nav-brand">
          <a href="/index.html">
            <img src="/assets/cbit-logo.jpg" alt="Smart Library">
          </a>
        </div>

        <div class="nav-title">
          <h1>Smart Library</h1>
        </div>

        <ul class="nav-links">
          ${links.map(link => {
            if (link.action === "logout") {
              return `
                <li>
                  <a href="#" id="logoutBtn">Logout</a>
                </li>
              `;
            }

            const active =
              currentPage === link.href.split("/").pop() ? "active" : "";

            return `
              <li>
                <a href="${link.href}" class="${active}">
                  ${link.label}
                </a>
              </li>
            `;
          }).join("")}
        </ul>
      `;

      // ✅ SINGLE SOURCE LOGOUT
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await logoutUser();
          window.location.replace("/login.html");
        });
      }
    });
  },

  renderFooter() {
    const footer = document.querySelector(".glass-footer");
    if (!footer) return;

    const year = new Date().getFullYear();

    footer.innerHTML = `
      <div class="footer-content">
        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/index.html">Home</a></li>
            <li><a href="/books.html">Books</a></li>
            <li><a href="/about.html">About</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Contact</h4>
          <p>C Byre Gowda Institute of Technology</p>
          <p>Kolar, Karnataka</p>
          <p>Email: library@cbit.edu.in</p>
        </div>

        <div class="footer-col">
          <h4>Follow Us</h4>
          <div class="social-links">
            <a href="#"><img src="/assets/icon-facebook.png"></a>
            <a href="#"><img src="/assets/icon-instagram.png"></a>
            <a href="#"><img src="/assets/icon-linkedin.png"></a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© ${year} Smart Library. All rights reserved.</p>
      </div>
    `;
  }
};

// INIT
document.addEventListener("DOMContentLoaded", () => {
  UI.renderNav();
  UI.renderFooter();
});

export default UI;

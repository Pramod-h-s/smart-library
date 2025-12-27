/**
 * Smart Library - UI Components and Navigation (Firebase-based)
 */

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const UI = {

  navConfig: {
    guest: [
      { label: "Home", href: "index.html" },
      { label: "Books", href: "books.html" },
      { label: "About", href: "about.html" },
      { label: "Login", href: "login.html" }
    ],
    student: [
      { label: "Home", href: "../index.html" },
      { label: "Books", href: "../books.html" },
      { label: "About", href: "../about.html" },
      { label: "Dashboard", href: "/user/dashboard.html" },
      { label: "Profile", href: "/user/profile.html" },
      { label: "Logout", action: "logout" }
    ],
    admin: [
      { label: "Home", href: "../index.html" },
      { label: "Books", href: "../books.html" },
      { label: "About", href: "../about.html" },
      { label: "Admin Dashboard", href: "/admin/dashboard.html" },
      { label: "Books Manager", href: "/admin/books.html" },
      { label: "Transactions", href: "/admin/transactions.html" },
      { label: "Issue/Return", href: "/admin/issue-return.html" },
      { label: "Logout", action: "logout" }
    ]
  },

  async renderNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    onAuthStateChanged(auth, async (user) => {
      let role = "guest";

      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          role = snap.data().role || "student";
        }
      }

      const links = this.navConfig[role];
      const currentPage = window.location.pathname.split("/").pop();

      const logoSrc =
        role === "guest"
          ? "assets/cbit-logo.jpg"
          : "../assets/cbit-logo.jpg";

      nav.innerHTML = `
        <div class="nav-brand">
          <a href="${role === "admin" ? "/admin/dashboard.html" : "index.html"}">
            <img src="${logoSrc}" alt="Smart Library">
          </a>
        </div>

        <div class="nav-title">
          <h1>Smart Library</h1>
        </div>

        <ul class="nav-links">
          ${links
            .map((link) => {
              if (link.action === "logout") {
                return `
                  <li>
                    <a href="#" id="logoutBtn">Logout</a>
                  </li>
                `;
              }

              const active =
                link.href &&
                currentPage === link.href.split("/").pop()
                  ? "active"
                  : "";

              return `
                <li>
                  <a href="${link.href}" class="${active}">
                    ${link.label}
                  </a>
                </li>
              `;
            })
            .join("")}
        </ul>
      `;

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          await signOut(auth);
          window.location.href = "/login.html";
        };
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
            <li><a href="index.html">Home</a></li>
            <li><a href="about.html">About</a></li>
            <li><a href="books.html">Books</a></li>
            <li><a href="https://cbitkolar.edu.in/">College Website</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <p>C. Byre Gowda Institute of Technology</p>
          <p>Kolar, Karnataka</p>
          <p>Email: library@cbitkolar.edu.in</p>
        </div>
        <div class="footer-col">
          <h4>Follow Us</h4>
          <div class="social-links">
            <a href="#"><img src="assets/icon-facebook.png"></a>
            <a href="#"><img src="assets/icon-twitter.png"></a>
            <a href="#"><img src="assets/icon-instagram.png"></a>
            <a href="#"><img src="assets/icon-linkedin.png"></a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} C. Byre Gowda Institute of Technology. All rights reserved.</p>
      </div>
    `;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  UI.renderNav();
  UI.renderFooter();
});

export default UI;

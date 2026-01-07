// js/login-firebase.js
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      // 🔐 Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔍 Get user role from Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User record not found. Contact admin.");
        return;
      }

      const userData = userSnap.data();

      // 🚫 Not approved
      if (userData.approved === false) {
        alert("Your account is pending admin approval.");
        return;
      }

      // ✅ Role-based redirect
      if (userData.role === "admin") {
        window.location.replace("/admin/dashboard.html");
      } else {
        window.location.replace("/index.html");
      }
      
    } catch (error) {
      alert(error.message);
      console.error("Login error:", error);
    }
  });
});

// js/auth.js (FINAL – CLEAN – FIREBASE ONLY)

import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const Auth = {

  /* ================= LOGIN ================= */
  initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);

        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          alert("User record not found. Contact admin.");
          return;
        }

        const user = snap.data();

        if (user.status !== "approved") {
          alert("Account pending admin approval.");
          return;
        }

        if (user.role === "admin") {
          window.location.href = "admin/dashboard.html";
        } else {
          window.location.href = "user/dashboard.html";
        }

      } catch (err) {
        alert(err.message);
      }
    });
  },

  /* ================= REGISTER ================= */
  async registerStudent({ name, email, usn, phone, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

await setDoc(doc(db, "users", user.uid), {
  name: name,
  email: email,
  usn: usn,
  phone: phone,
  role: "student",
  status: "pending",
  createdAt: new Date()
});
  }
};

export default Auth;


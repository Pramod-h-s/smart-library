// js/auth-check.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/**
 * Protect pages based on role
 * @param {"admin" | "student"} requiredRole
 */
export function protectPage(requiredRole) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("/login.html");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert("User record not found. Contact admin.");
        await logoutUser();
        return;
      }

      const userData = snap.data();

      // ❌ Not approved
      if (userData.approved === false) {
        alert("Your account is pending admin approval.");
        await logoutUser();
        return;
      }

      // ❌ Wrong role
      if (userData.role !== requiredRole) {
        alert("Access denied.");
        await logoutUser();
        return;
      }

      // ✅ Allowed
      console.log("Access granted:", requiredRole);

    } catch (err) {
      console.error("Auth check failed:", err);
      await logoutUser();
    }
  });
}

/**
 * 🔐 Central Logout Function (USE THIS EVERYWHERE)
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    window.location.replace("/login.html");
  }
}

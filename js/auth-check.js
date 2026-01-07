// js/auth-check.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/**
 * Protect pages based on role
 * @param {"admin" | "student"} requiredRole
 */
export function protectPage(requiredRole) {
  onAuthStateChanged(auth, async (user) => {

    // 🔴 Not logged in
    if (!user) {
      window.location.href("/login.html");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await forceLogout("User record not found.");
        return;
      }

      const userData = snap.data();

      // 🔴 Not approved
      if (userData.approved === false) {
        await forceLogout("Your account is pending admin approval.");
        return;
      }

      // 🔴 Role mismatch (ONLY block on protected pages)
      if (requiredRole && userData.role !== requiredRole) {
        await forceLogout("Access denied.");
        return;
      }

      // ✅ Access allowed
      console.log("Access granted:", userData.role);

    } catch (err) {
      console.error("Auth check failed:", err);
      await forceLogout("Authentication error.");
    }
  });
}

/**
 * 🔐 Central forced logout
 */
async function forceLogout(message) {
  if (message) alert(message);
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    window.location.href("/login.html");
  }
}

/**
 * ✅ Optional manual logout (buttons)
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    window.location.href("/login.html");
  }
}

window.logoutUser = logoutUser;
// ==================== GLOBAL AUTH COMPATIBILITY ====================

// Provide backward compatibility for onclick="Auth.logout()"
window.Auth = {
  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/login.html";
    }
  }
};

// Also expose direct logout function
window.logoutUser = window.Auth.logout;

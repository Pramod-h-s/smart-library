// js/auth-check.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/**
 * Protect pages based on role
 * @param {"admin" | "student"} requiredRole
 */
export function protectPage(requiredRole) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in
            window.location.href = "/login.html";
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            alert("User record not found. Contact admin.");
            window.location.href = "/login.html";
            return;
        }

        const userData = userSnap.data();

        // ❌ Not approved
        if (!userData.approved) {
            alert("Your account is pending admin approval.");
            window.location.href = "/login.html";
            return;
        }

        // ❌ Wrong role
        if (userData.role !== requiredRole) {
            alert("Access denied.");
            window.location.href = "/login.html";
            return;
        }

        // ✅ Allowed
        console.log("Access granted:", requiredRole);
    });
}

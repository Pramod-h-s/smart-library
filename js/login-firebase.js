import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) {
      alert("User record not found. Contact admin.");
      return;
    }

    const user = userSnap.data();

    if (!user.approved) {
      alert("Admin approval pending.");
      return;
    }

    if (user.role === "admin") {
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "user/dashboard.html";
    }

  } catch (error) {
    alert(error.message);
  }
});

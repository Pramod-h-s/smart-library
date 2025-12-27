import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc, setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = regName.value;
  const email = regEmail.value;
  const usn = regUSN.value;
  const phone = regPhone.value;
  const password = regPassword.value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      usn,
      phone,
      role: "student",
      approved: false
    });

    alert("Registered successfully. Wait for admin approval.");
    window.location.href = "login.html";

  } catch (err) {
    alert(err.message);
  }
});

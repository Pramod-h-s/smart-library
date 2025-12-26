// js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBKZfatQ30uJtBp-LyQQEJcgesmpVmt_pM",
  authDomain: "smart-library-c2710.firebaseapp.com",
  projectId: "smart-library-c2710",
  storageBucket: "smart-library-c2710.firebasestorage.app",
  messagingSenderId: "359933328798",
  appId: "1:359933328798:web:a4fb9d35c3208fa7776a8f"
};

  // Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


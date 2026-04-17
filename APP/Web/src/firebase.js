import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDE9akAZZ3MhL87TVBbWgMSgsNxyq9rOw",
  authDomain: "lokawazk-be431.firebaseapp.com",
  projectId: "lokawazk-be431",
  storageBucket: "lokawazk-be431.firebasestorage.app",
  messagingSenderId: "1006188739154",
  appId: "1:1006188739154:web:cb291f94e40fa99d417d8b",
  measurementId: "G-GJ4MJ7QHQ0"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
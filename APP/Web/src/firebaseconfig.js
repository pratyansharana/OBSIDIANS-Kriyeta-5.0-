// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDE9akAZZ3MhL87TVBbWgMSgsNxyq9rOw",
  authDomain: "lokawazk-be431.firebaseapp.com",
  projectId: "lokawazk-be431",
  storageBucket: "lokawazk-be431.firebasestorage.app",
  messagingSenderId: "1006188739154",
  appId: "1:1006188739154:web:cb291f94e40fa99d417d8b",
  measurementId: "G-GJ4MJ7QHQ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
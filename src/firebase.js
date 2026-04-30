import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAqdtvFMVGh419mo_tW5q84dFmn7u9fE6g",
  authDomain: "schedule-app-69081.firebaseapp.com",
  databaseURL: "https://schedule-app-69081-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "schedule-app-69081",
  storageBucket: "schedule-app-69081.firebasestorage.app",
  messagingSenderId: "988289110841",
  appId: "1:988289110841:web:eb22e858303f5a37f08ee8"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB6lKfn6-vLD1JiAcSy7fuETzxGiUrcOQA",
  authDomain: "mondial2026-50703.firebaseapp.com",
  databaseURL: "https://mondial2026-50703-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mondial2026-50703",
  storageBucket: "mondial2026-50703.firebasestorage.app",
  messagingSenderId: "1028945312467",
  appId: "1:1028945312467:web:27690cee00ea24fbecf226"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, onValue };

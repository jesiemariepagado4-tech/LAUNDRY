import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYmrxvQbu-nDqWChQTABDAWVTOzz9laAs",
  authDomain: "laundirt-3b50a.firebaseapp.com",
  projectId: "laundirt-3b50a",
  storageBucket: "laundirt-3b50a.firebasestorage.app",
  messagingSenderId: "782994470105",
  appId: "1:782994470105:web:648ef3cc8db690b5be3ac8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
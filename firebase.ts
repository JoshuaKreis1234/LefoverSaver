import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC9aQyaasujxcB2DArKwanr-o0PYR9MRd4",
  authDomain: "leftoversaver-bb248.firebaseapp.com",
  projectId: "leftoversaver-bb248",
  storageBucket: "leftoversaver-bb248.appspot.com", // ✅ fixed here
  messagingSenderId: "11219079849",
  appId: "1:11219079849:web:e97fd987adcbeefeb20fb8",
  measurementId: "G-SK5XFR1L08" // This is okay to keep, but unused unless you re-enable analytics
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABEnxVVO5NJK6jTpXg0FXtLwmYkBsu5hQ",
  authDomain: "stockstar-6fab9.firebaseapp.com",
  projectId: "stockstar-6fab9",
  storageBucket: "stockstar-6fab9.firebasestorage.app",
  messagingSenderId: "800308523049",
  appId: "1:800308523049:web:4c2fbe8d683db912e16c38",
  measurementId: "G-LG38XRFV1C",
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

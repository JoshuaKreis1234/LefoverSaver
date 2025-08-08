import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import mockOffers from './mock-offers.json' assert { type: 'json' };

const firebaseConfig = {
  apiKey: "AIzaSyC9aQyaasujxcB2DArKwanr-o0PYR9MRd4",
  authDomain: "leftoversaver-bb248.firebaseapp.com",
  projectId: "leftoversaver-bb248",
  storageBucket: "leftoversaver-bb248.appspot.com",
  messagingSenderId: "11219079849",
  appId: "1:11219079849:web:e97fd987adcbeefeb20fb8",
};

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  await signInAnonymously(auth);

  for (const offer of mockOffers) {
    await addDoc(collection(db, 'offers'), {
      ...offer,
      createdAt: serverTimestamp(),
    });
  }

  console.log(`Seeded ${mockOffers.length} offers`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

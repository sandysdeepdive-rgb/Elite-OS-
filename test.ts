import { adminDb } from './lib/firebase/admin';
adminDb.collection('schools').limit(1).get()
  .then(s => console.log('success', s.size))
  .catch(e => console.error('FIREBASE ADMIN ERROR:', e.message));

// Firebase Configuration
// Replace these values with your Firebase project config from:
// Firebase Console → Project Settings → Your apps → Add web app

const firebaseConfig = {
  apiKey: "AIzaSyDnNsJ6ko5WrHQYyoym1vs0bERLJA7V1tU",
  authDomain: "live-reactions-3dea2.firebaseapp.com",
  databaseURL: "https://live-reactions-3dea2-default-rtdb.firebaseio.com",
  projectId: "live-reactions-3dea2",
  storageBucket: "live-reactions-3dea2.firebasestorage.app",
  messagingSenderId: "590379663125",
  appId: "1:590379663125:web:12c7c5fbb16f9d77d4331c",
  measurementId: "G-KSVMJN9GHY"
};

// Export for use in both audience app and presenter overlay
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional


// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
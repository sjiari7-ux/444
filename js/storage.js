// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDaZVxynpwb2lkHuCCJuQ4ICZfVAvjHmuU",
  authDomain: "arcadaimmo.firebaseapp.com",
  databaseURL: "https://arcadaimmo-default-rtdb.firebaseio.com",
  projectId: "arcadaimmo",
  storageBucket: "arcadaimmo.firebasestorage.app",
  messagingSenderId: "302453347843",
  appId: "1:302453347843:web:0c96be2b644f89b4aee036",
  measurementId: "G-SB1HFYTBHY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

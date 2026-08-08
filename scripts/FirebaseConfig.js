import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getDatabase, ref, set, get, push, update, onValue, onChildAdded, onDisconnect } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJjEL9uAgiA7yBhUgeHWI10i4hU4Hwddk",
    authDomain: "chain-reaction-4df42.firebaseapp.com",
    databaseURL: "https://chain-reaction-4df42-default-rtdb.firebaseio.com",
    projectId: "chain-reaction-4df42",
    storageBucket: "chain-reaction-4df42.firebasestorage.app",
    messagingSenderId: "843213442663",
    appId: "1:843213442663:web:1128b54b460d3c37de0ec2",
    measurementId: "G-MW7JZZLP98"
};

initializeApp(firebaseConfig);

const database = getDatabase();
const auth = getAuth();

export { database, ref, set, get, push, update, onValue, onChildAdded, onDisconnect, auth, signInAnonymously }
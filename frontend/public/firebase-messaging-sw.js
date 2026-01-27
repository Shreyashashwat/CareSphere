<<<<<<< HEAD
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyC7POku1ofofXT7jwo1L3Aq0O-0dD-uMUk",
  authDomain: "caresphere-c870c.firebaseapp.com",
  projectId: "caresphere-c870c",
  storageBucket: "caresphere-c870c.firebasestorage.app",
  messagingSenderId: "785418315133",
  appId: "1:785418315133:web:5238eb79d972d84cea9814",
  measurementId: "G-BR5CS7G9WM"
=======
// C:\Users\HP\Desktop\coding\CareSphere\frontend\public\firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAEWnPNtu9gQt7C7FkkPRKGdIVgPm7adas",
  authDomain: "caresphere-474703.firebaseapp.com",
  projectId: "caresphere-474703",
  storageBucket: "caresphere-474703.firebasestorage.app",
  messagingSenderId: "748085462199",
  appId: "1:748085462199:web:9a5ad7823e59000c2bf932"
>>>>>>> 35e9642bf3f16921bddaef6dd75288f3c3c6a033
});

const messaging = firebase.messaging();

<<<<<<< HEAD
// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', payload);

  // Use data payload (sent from cron job) for consistency
  const data = payload.data || {};
  const medicineId = data.medicineId;
  const title = data.title || '💊 Medicine Reminder';
  const body = data.body || '';

  const notificationOptions = {
    body,
    icon: '/logo192.png',
    data, // keep all fields for click actions
    actions: [
      { action: 'snooze', title: 'Snooze 10 min' }
    ]
  };

  // Show system notification
  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click actions
self.addEventListener('notificationclick', function(event) {
  const medicineId = event.notification.data?.medicineId;

  if (event.action === 'snooze' && medicineId) {
    // Call backend to snooze the reminder
    event.waitUntil(
      fetch(`http://localhost:8000/api/v1/medicine/${medicineId}/snooze`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 10 })
      })
      .then(() => console.log(`💤 Medicine ${medicineId} snoozed via SW click`))
      .catch(err => console.error('❌ Error snoozing via SW:', err))
    );
  }

  // Close the notification regardless
  event.notification.close();
});

// Optional: Listen for push events to log any raw payloads
self.addEventListener('push', function(event) {
  console.log('[SW] Raw push event:', event);
});
=======
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);

  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
  });
});
>>>>>>> 35e9642bf3f16921bddaef6dd75288f3c3c6a033

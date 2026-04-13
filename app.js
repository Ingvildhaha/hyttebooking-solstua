  const firebaseConfig = {
    apiKey: "AIzaSyCL0zYDfRHkTJsUaJuTrkNyr0ZRjGTnBXc",
    authDomain: "hyttebooking-566c5.firebaseapp.com",
    projectId: "hyttebooking-566c5",
    storageBucket: "hyttebooking-566c5.firebasestorage.app",
    messagingSenderId: "186118256622",
    appId: "1:186118256622:web:33a5467ae67977d5fe80ff",
    measurementId: "G-0TDKE5FHN6"
  };


// Init Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Firestore-instans
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendar");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("bookingForm");
  const nameInput = document.getElementById("name");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const room1Input = document.getElementById("room1");
  const room2Input = document.getElementById("room2");
  const room3Input = document.getElementById("room3");
  const deleteButton = document.getElementById("deleteButton");
  const cancelButton = document.getElementById("cancelButton");

  // Holder på id til booking vi redigerer/sletter.
  // null betyr "ny booking".
  let currentBookingId = null;

  function openModalForNew(dateStr) {
    currentBookingId = null;
    modalTitle.textContent = "Ny booking";

    // Resett skjema
    form.reset();

    // Sett datoene til den klikkede datoen
    startInput.value = dateStr;
    endInput.value = dateStr;

    // Skjul slette-knapp ved ny booking
    deleteButton.classList.add("hidden");

    modalOverlay.classList.remove("hidden");
    nameInput.focus();
  }

  function openModalForExisting(bookingId, data) {
    currentBookingId = bookingId;
    modalTitle.textContent = "Rediger / slett booking";

    // Fyll inn feltene
    nameInput.value = data.name || "";
    startInput.value = data.startDate || "";
    endInput.value = data.endDate || "";
    room1Input.checked = !!data.room1;
    room2Input.checked = !!data.room2;
    room3Input.checked = !!data.room3;

    // Vis slette-knapp
    deleteButton.classList.remove("hidden");

    modalOverlay.classList.remove("hidden");
    nameInput.focus();
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    currentBookingId = null;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "nb",
    events: [],

    // Klikk på dato -> ny booking
    dateClick: (info) => {
      openModalForNew(info.dateStr);
    },

    // Klikk på booking -> rediger / evt. slett
    eventClick: (info) => {
      // Hent data for denne bookingen fra Firestore
      const bookingId = info.event.id;

      db.collection("bookings")
        .doc(bookingId)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            alert("Fant ikke booking i databasen.");
            return;
          }
          const data = doc.data();
          openModalForExisting(bookingId, data);
        })
        .catch((err) => {
          console.error("Feil ved henting:", err);
          alert("Klarte ikke å hente booking.");
        });
    }
  });

  calendar.render();

  // Lytte på bookinger i Firestore
  db.collection("bookings").onSnapshot((snapshot) => {
    const events = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.name,
        start: data.startDate,
        end: data.endDate
      });
    });

    calendar.removeAllEvents();
    calendar.addEventSource(events);
  });

  // Lagre (create / update) ved submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = nameInput.value;
    const startDate = startInput.value;
    const endDate = endInput.value;
    const room1 = room1Input.checked;
    const room2 = room2Input.checked;
    const room3 = room3Input.checked;

    if (!name || !startDate || !endDate) {
      alert("Fyll ut alle feltene.");
      return;
    }

    if (endDate < startDate) {
      alert("Sluttdato kan ikke være før startdato.");
      return;
    }

    const data = { name, startDate, endDate, room1, room2, room3 };

    if (currentBookingId) {
      // Oppdater eksisterende booking
      db.collection("bookings")
        .doc(currentBookingId)
        .update(data)
        .then(() => {
          closeModal();
        })
        .catch((err) => {
          console.error("Feil ved oppdatering:", err);
          alert("Noe gikk galt ved lagring.");
        });
    } else {
      // Ny booking
      db.collection("bookings")
        .add(data)
        .then(() => {
          closeModal();
        })
        .catch((err) => {
          console.error("Feil ved lagring:", err);
          alert("Noe gikk galt ved lagring.");
        });
    }
  });

  // Slett-knapp
  deleteButton.addEventListener("click", () => {
    if (!currentBookingId) {
      // Burde egentlig ikke skje, men vi sjekker.
      closeModal();
      return;
    }

    const ok = confirm("Er du sikker på at du vil slette denne bookingen?");
    if (!ok) return;

    db.collection("bookings")
      .doc(currentBookingId)
      .delete()
      .then(() => {
        closeModal();
      })
      .catch((err) => {
        console.error("Feil ved sletting:", err);
        alert("Noe gikk galt ved sletting.");
      });
  });

  // Avbryt-knapp
  cancelButton.addEventListener("click", () => {
    closeModal();
  });
});
 
// Firebase-konfigurasjon, hentet fra fra Firebase-konsollen.
// For å koble frontend-koden til riktig Firebase-prosjekt. 
 const firebaseConfig = {
    apiKey: "AIzaSyCL0zYDfRHkTJsUaJuTrkNyr0ZRjGTnBXc",
    authDomain: "hyttebooking-566c5.firebaseapp.com",
    projectId: "hyttebooking-566c5",
    storageBucket: "hyttebooking-566c5.firebasestorage.app",
    messagingSenderId: "186118256622",
    appId: "1:186118256622:web:33a5467ae67977d5fe80ff",
    measurementId: "G-0TDKE5FHN6"
  };

// Initialiser Firebase 
firebase.initializeApp(firebaseConfig);

// Firestore-instans
const db = firebase.firestore();

//Når DOM er lastet, hent elementer
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

  // Holder på id til booking vi redigerer
  // null betyr "ny booking".
  let currentBookingId = null;

  // Åpne modal for ny booking, 
  function openModalForNew(dateStr) {
    currentBookingId = null;
    modalTitle.textContent = "Ny booking";

    // Tøm skjema
    form.reset();

    // Sett datoene til den klikkede datoen
    startInput.value = dateStr;
    endInput.value = dateStr;

    // Skjul slette-knapp ved ny booking
    deleteButton.classList.add("hidden");

    // Vis modal
    modalOverlay.classList.remove("hidden");
    nameInput.focus();
  }

// Åpne modal for eksisterende booking, og fyll inn data fra Firestore
  function openModalForExisting(bookingId, data) {
    currentBookingId = bookingId;
    modalTitle.textContent = "Rediger / slett booking";

    // Fyll inn feltene med eksisterende data
    nameInput.value = data.name || "";
    startInput.value = data.startDate || "";
    endInput.value = data.endDate || "";
    room1Input.checked = !!data.room1;
    room2Input.checked = !!data.room2;
    room3Input.checked = !!data.room3;

    // Vis slette-knapp
    deleteButton.classList.remove("hidden");

    // Vis modal
    modalOverlay.classList.remove("hidden");
    nameInput.focus();
  }

  // Lukk modal og nullstill currentBookingId
  function closeModal() {
    modalOverlay.classList.add("hidden");
    currentBookingId = null;
  }


  // Sette opp FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "nb",   //Norsk
    events: [],

    // Klikk på dato, åpne modal for ny booking
    dateClick: (info) => {
      openModalForNew(info.dateStr);
    },

    // Klikk på booking, åpne modal med data for redigering/slett
    eventClick: (info) => {
      const bookingId = info.event.id; // id er lik id i Firestore

      // Hent data for denne bookingen fra Firestore
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

  //Tegn kalenderen
  calendar.render();

  // Lytte på bookinger i Firestore med onSnapshot
  // Hver gang det skjer en endring i "bookings"-samlingen, oppdateres kalenderen. 
  db.collection("bookings").onSnapshot((snapshot) => {
    const events = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
    
      //Gjør hvert dokument om til en kalender-event
      events.push({
        id: doc.id,
        title: data.name,
        start: data.startDate,
        end: data.endDate
      });
    });

    // Fjern alle eksisterende events og legg til alle på nytt
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

    // Validering: mp fylle ut alle felter
    if (!name || !startDate || !endDate) {
      alert("Fyll ut alle feltene.");
      return;
    }

    // Validering: sluttdato kan ikke være før startdato
    if (endDate < startDate) {
      alert("Sluttdato kan ikke være før startdato.");
      return;
    }
    // Objekt som skal lagres i Firestore
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
      // Opprett ny booking
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
      // Burde egentlig ikke skje, men sjekker og lukker.
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

  // Avbryt-knapp, uten å lagre 
  cancelButton.addEventListener("click", () => {
    closeModal();
  });
});
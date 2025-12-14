/* =========================
   SOCKET + VARIABLES GLOBALES
========================= */
const socket = io();
window.socket = socket; 
let currentUsername = null;
window.currentUserRole = null; 




  
/* =========================
   FUNCIÓN CRÍTICA: MOSTRAR BOTÓN SALAS
========================= */
function checkAdminAccess() {
  const salasLink = document.getElementById("admin-salas-link");
  const role = window.currentUserRole; 

  if (salasLink) {
    if (role === 'moderator' || role === 'admin') {
      salasLink.classList.remove("hidden");
      // Forzamos el display block o inline para que el CSS funcione bien
      salasLink.style.display = ""; 
    } else {
      salasLink.classList.add("hidden");
    }
  }
}

/* =========================
   LOGIN / LOGOUT / REGISTER
========================= */
function openLogin() {
  if (currentUsername) {
    const logout = confirm(`Hola ${currentUsername}, vols tancar la sessió?`);
    if (logout) {
      location.reload(); 
    }
    return;
  }
  document.getElementById("login-modal").classList.remove("hidden");
  backToRoleChoice();
}

function closeLogin() {
  document.getElementById("login-modal").classList.add("hidden");
}

function openRegister() {
  closeLogin();
  document.getElementById("register-modal").classList.remove("hidden");
}

function closeRegister() {
  document.getElementById("register-modal").classList.add("hidden");
}

/* =========================
   OCULTAR LANDING Y ENTRAR AL JUEGO
========================= */
function hideLanding() {
  history.pushState({ view: "game" }, "", "#joc");

  document.querySelector(".hero").style.display = "none";
  document.querySelector(".main-header").style.display = "none";

  closeLogin();
  closeRegister();

  const gameContainer = document.getElementById("game-container");
  gameContainer.style.display = "block";

  const chat = document.getElementById("chat-container");
  
  if (currentUsername) {
    chat.classList.remove("hidden");
    chat.style.display = "flex";
  } else {
    chat.classList.add("hidden"); 
  }

  document.getElementById("exit-game-btn").classList.remove("hidden");
}

/* =========================
   INTERFAZ LOGIN
========================= */
function showPlayerLogin() {
  document.getElementById("login-choice").classList.add("hidden");
  document.getElementById("login-player").classList.remove("hidden");
}

function showModeratorLogin() {
  document.getElementById("login-choice").classList.add("hidden");
  document.getElementById("login-moderator").classList.remove("hidden");
}

function backToRoleChoice() {
  document.getElementById("login-player").classList.add("hidden");
  document.getElementById("login-moderator").classList.add("hidden");
  document.getElementById("login-choice").classList.remove("hidden");
}

/* =========================
   LÓGICA LOGIN (FETCH)
========================= */
async function loginAsPlayer() {
  const username = document.getElementById("player-username").value.trim();
  const password = document.getElementById("player-password").value.trim();
  await doLogin(username, password, "player");
}

async function loginAsModerator() {
  const username = document.getElementById("moderator-username").value.trim();
  const password = document.getElementById("moderator-password").value.trim();
  await doLogin(username, password, "moderator");
}

async function doLogin(username, password, role) {
  if (!username || !password) {
    alert("Tots els camps són obligatoris");
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

    const data = await res.json();
    if (data.status !== "ok") {
      alert(data.error);
      return;
    }

    const userData = data.user || data;

    // 1. Guardar en memoria RAM (para el juego actual)
    currentUsername = userData.username;
    window.currentUserRole = userData.role || role || "player"; 

    // 2. IMPORTANTE: Guardar en LocalStorage TEMPORALMENTE
    // Esto permite que al clicar en "SALAS" y cambiar de página,
    // la página 'salas.html' pueda leer quién eres.
    localStorage.setItem('junglixUser', currentUsername);
    localStorage.setItem('junglixRole', window.currentUserRole);
    localStorage.setItem("junglixUserId", userData._id);


    console.log("👤 Login Exitoso. Rol:", window.currentUserRole);

    // Actualizar botón y permisos
    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) loginBtn.innerText = currentUsername;
    
    checkAdminAccess(); // Esto hará aparecer el botón SALAS

    closeLogin();

  } catch (err) {
    console.error("❌ ERROR LOGIN:", err);
    alert("Hi ha hagut un error de connexió.");
  }
}

function updateChatAccess() {
  const chatLink = document.getElementById("chat-link");
  if (!chatLink) return;

  if (currentUsername) {
    chatLink.classList.remove("hidden");
  } else {
    chatLink.classList.add("hidden");
  }
}


/* =========================
   REGISTER
========================= */
async function registerUser() {
  const username = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const age = document.getElementById("reg-age").value;
  const password = document.getElementById("reg-password").value;
  const fullname = document.getElementById("reg-fullname").value.trim();
  const moderatorCode = document.getElementById("reg-admin-code").value.trim();

  if (!username || !email || !password || !age) {
    alert("Tots els camps obligatoris s'han d'omplir");
    return;
  }

  try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, email, age: Number(age), password, fullname, moderatorCode
        })
      });

      const data = await res.json();
      if (data.status !== "ok") {
        alert(data.error); 
        return;
      }

      alert("Registre correcte! Ja pots iniciar sessió");
      closeRegister();
      openLogin();
  } catch(err) {
      console.error(err);
      alert("Error al registrar-se");
  }
}

/* =========================
   ENTRAR AL JOC
========================= */
/* =========================
   ENTRAR AL JOC
========================= */
function openMap() {
  // 1. BLOQUEO DE SEGURIDAD: Si no ha iniciado sesión, no pasa.
  if (!currentUsername) {
    alert("Has d'iniciar sessió per poder jugar!");
    openLogin(); // Abre automáticamente la ventana de login
    return; // Detiene la ejecución aquí
  }

  const roomCode = localStorage.getItem("junglixRoom");

  // 2. Si es jugador y no está en sala, no puede jugar (Lógica existente)
  if (window.currentUserRole === "player" && !roomCode) {
    alert("Has d'unir-te abans a una sala amb un codi");
    openJoinRoomModal();
    return;
  }

  hideLanding();

  // Ahora usernameToUse siempre será currentUsername porque ya filtramos arriba
  const usernameToUse = currentUsername; 
  const colorToUse = 0x00ff00; // Siempre verde (o el color que quieras para usuarios logueados)

  window.startGame({
    username: usernameToUse,
    color: colorToUse,
    roomCode
  });
}


function returnToLanding() {
  if (window.game) {
    window.game.destroy(true);
    window.game = null;
  }
  const gameContainer = document.getElementById("game-container");
  gameContainer.style.display = "none";
  gameContainer.innerHTML = "";

  document.querySelector(".hero").style.display = "flex";
  document.querySelector(".main-header").style.display = "flex";

  document.getElementById("chat-container").classList.add("hidden");
  document.getElementById("exit-game-btn").classList.add("hidden");
}

window.addEventListener("popstate", () => { returnToLanding(); });

/* =========================
   CHAT
========================= */
function openChat() {
  if (!currentUsername) {
    alert("Has d'iniciar sessió");
    return;
  }
  document.getElementById("chat-container").style.display = "flex";
}
function closeChat() { document.getElementById("chat-container").style.display = "none"; }
function toggleChatSize() { document.getElementById("chat-container").classList.toggle("expanded"); }

function sendChatMessage() {
  const input = document.getElementById("chat-text");
  const message = input.value.trim();

  if (!message || !currentUsername) return;

  console.log("📤 Enviant missatge:", message);

  socket.emit("chatMessage", {
    username: currentUsername,
    message
  });

  input.value = "";
}



socket.on("chatMessage", data => {
  const box = document.getElementById("chat-messages");
  const msg = document.createElement("div");
msg.className = "chat-message";

msg.innerHTML = `
  <span class="chat-user">${data.username}</span>
  <span class="chat-text">${data.message}</span>
`;

  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
});

function openJoinRoomModal() {
  document.getElementById("join-room-modal").classList.remove("hidden");
}

function closeJoinRoomModal() {
  document.getElementById("join-room-modal").classList.add("hidden");
}

async function submitJoinRoom() {
  const code = document.getElementById("join-room-code").value.trim().toUpperCase();
  const user = localStorage.getItem("junglixUser");

  if (!code) return alert("Introdueix un codi");

  const res = await fetch("/rooms/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, username: user })
  });

  const data = await res.json();

  if (data.status !== "ok") {
    alert(data.error);
    return;
  }

  // Socket.IO → entrar a la sala real
  socket.emit("joinRoom", {
    roomCode: code,
    userData: { username: user }
  });

  // Guardamos sala actual
  localStorage.setItem("junglixRoom", code);

  // Entramos al juego
  openMap();
}


/* =========================
   AMICS
========================= */
function openAddFriend() { document.getElementById("add-friend-modal").classList.remove("hidden"); }
function closeAddFriend() { document.getElementById("add-friend-modal").classList.add("hidden"); }
async function sendFriendRequest() {
  const toUsername = document.getElementById("friend-username").value.trim();
  if (!toUsername) return alert("Introdueix un nom d'usuari");
  
  const res = await fetch("/friends/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromUsername: currentUsername, toUsername })
  });
  const data = await res.json();
  if (data.status !== "ok") return alert(data.error);
  alert("Amic afegit correctament!");
  closeAddFriend();
}

currentUsername = userData.username;
window.currentUserRole = userData.role;

localStorage.setItem("junglixUser", currentUsername);
localStorage.setItem("junglixRole", window.currentUserRole);
localStorage.setItem("junglixUserId", userData._id);

checkAdminAccess();


document.addEventListener("DOMContentLoaded", () => {

  socket.on("chatMessage", data => {
    const box = document.getElementById("chat-messages");

    if (!box) {
      console.error("❌ chat-messages NO existeix");
      return;
    }

    const msg = document.createElement("div");
    msg.className = "chat-message";

    msg.innerHTML = `
      <span class="chat-user">${data.username}</span>
      <span class="chat-text">${data.message}</span>
    `;

    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  });

});


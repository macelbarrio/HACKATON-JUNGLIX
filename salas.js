/* ==========================================
   GESTIÓN DE SALAS (LOGICA LOCALSTORAGE)
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    checkSecurity(); // 1. Verificamos si es admin
    loadRooms();     // 2. Cargamos las salas
});

// --- SEGURIDAD ---
function checkSecurity() {
    const role = localStorage.getItem('junglixRole');
    const user = localStorage.getItem('junglixUser');

    // Si no es moderador ni admin, lo expulsamos al menú
    if (role !== 'moderator' && role !== 'admin') {
        alert("Accés denegat. Has de ser moderador.");
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre del admin en el header
    if(user) {
        const display = document.getElementById('admin-user-display');
        if(display) display.innerText = "👤 " + user;
    }
}

// --- ABRIR / CERRAR MODAL ---
function openCreateModal() {
    const modal = document.getElementById("create-room-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeCreateModal() {
    const modal = document.getElementById("create-room-modal");
    if (modal) {
        modal.classList.add("hidden");
        // Limpiamos los campos al cerrar
        document.getElementById("new-room-name").value = "";
        document.getElementById("new-room-desc").value = "";
        document.getElementById("new-room-capacity").value = "10";
    }
}

// --- CREAR SALA (CORE) ---
async function submitCreateRoom() {
    const name = document.getElementById("new-room-name").value.trim();
    const description = document.getElementById("new-room-desc").value.trim();
    const capacity = parseInt(document.getElementById("new-room-capacity").value);
    const userId = localStorage.getItem("junglixUserId");
  
    if (!name) {
      alert("⚠️ El nom de la sala és obligatori");
      return;
    }
  
    if (!userId) {
      alert("❌ No s'ha detectat l'usuari admin");
      return;
    }
  
    const res = await fetch("/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, capacity, userId })
    });
  
    const data = await res.json();
  
    if (data.status !== "ok") {
      alert(data.error);
      return;
    }
  
    alert("✅ Sala creada correctament!");
    closeCreateModal();
    loadRooms();
  }
  

// --- CARGAR LISTA DE SALAS ---
async function loadRooms() {
    const container = document.getElementById("rooms-list");
    container.innerHTML = "Carregant sales...";
  
    const res = await fetch("/rooms");
    const data = await res.json();
  
    if (data.status !== "ok") {
      container.innerHTML = "❌ Error carregant sales";
      return;
    }
  
    container.innerHTML = "";
  
    if (data.rooms.length === 0) {
      container.innerHTML = "<p>No hi ha sales creades.</p>";
      return;
    }
  
    data.rooms.forEach(room => {
      const card = document.createElement("div");
      card.className = "room-card";
      card.innerHTML = `
      <div class="room-card-header">
        <h3 class="room-title">${room.name}</h3>
        <span class="room-badge">
          ${room.players}/${room.capacity} jugadors
        </span>
      </div>
    
      <p class="room-desc">${room.description ? room.description : "Sense descripció"}</p>
    
      <div class="room-card-footer">
        <span class="room-capacity">
          <strong>Capacitat:</strong> ${room.capacity}
        </span>
    
        <button class="btn-action btn-delete" onclick="deleteRoom('${room._id}')">Esborrar</button>
      </div>
    `;
    

      container.appendChild(card);
    });
  }
  

// --- BORRAR SALA ---
async function deleteRoom(id) {
    if (!confirm("Segur que vols esborrar aquesta sala?")) return;
  
    const res = await fetch(`/rooms/${id}`, { method: "DELETE" });
    const data = await res.json();
  
    if (data.status !== "ok") {
      alert(data.error);
      return;
    }
  
    loadRooms();
  }
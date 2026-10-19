
const STORAGE_KEY = "dota-balance-players";

const form = document.getElementById("player-form");
const nameInput = document.getElementById("player-name");
const medalInput = document.getElementById("player-medal");
const playerList = document.getElementById("player-list");
const playerCount = document.getElementById("player-count");
const balanceButton = document.getElementById("balance-button");
const teamsContainer = document.getElementById("teams");

let players = loadPlayers();

function loadPlayers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function renderPlayers() {
  playerList.replaceChildren();

  playerCount.textContent =
    `${players.length} ${players.length === 1 ? "jugador" : "jugadores"}`;

  if (players.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay jugadores registrados.";
    playerList.appendChild(empty);
    return;
  }

  players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-card";

    const info = document.createElement("div");
    const name = document.createElement("strong");
    const medal = document.createElement("small");

    name.textContent = player.name;
    medal.textContent = player.medal;

    info.append(name, document.createElement("br"), medal);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Eliminar";

    removeButton.addEventListener("click", () => {
      players = players.filter((item) => item.id !== player.id);
      savePlayers();
      renderPlayers();
    });

    card.append(info, removeButton);
    playerList.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const medal = medalInput.value;

  if (!name) {
    nameInput.focus();
    return;
  }

  const duplicate = players.some(
    (player) => player.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    alert("Ese jugador ya está registrado.");
    nameInput.focus();
    return;
  }

  players.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    medal
  });

  savePlayers();
  renderPlayers();

  nameInput.value = "";
  nameInput.focus();
});

balanceButton.addEventListener("click", () => {
  if (players.length < 10) {
    alert(`Necesitas registrar al menos 10 jugadores. Actualmente tienes ${players.length}.`);
    return;
  }

  alert("¡Ya tenemos suficientes jugadores! En el siguiente paso añadiremos el balance automático de equipos.");
});

renderPlayers();

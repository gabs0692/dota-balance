
const STORAGE_KEY = "dota-balance-players";

const form = document.getElementById("player-form");
const nameInput = document.getElementById("player-name");
const medalInput = document.getElementById("player-medal");
const playerList = document.getElementById("player-list");
const playerCount = document.getElementById("player-count");
const balanceButton = document.getElementById("balance-button");
const teamsContainer = document.getElementById("teams");

const medalRank = {
  Herald: 1,
  Guardian: 2,
  Crusader: 3,
  Archon: 4,
  Legend: 5,
  Ancient: 6,
  Divine: 7,
  Immortal: 8
};

let players = loadPlayers();
let selectedIds = [];
let currentTeams = null;

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

  if (!players.length) {
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

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.flexWrap = "wrap";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "remove-button";
    selectButton.textContent = selectedIds.includes(player.id)
      ? "Seleccionado"
      : "Elegir";

    selectButton.addEventListener("click", () => {
      if (selectedIds.includes(player.id)) {
        selectedIds = selectedIds.filter((id) => id !== player.id);
      } else {
        if (selectedIds.length >= 10) {
          alert("Puedes seleccionar un máximo de 10 jugadores.");
          return;
        }
        selectedIds.push(player.id);
      }

      currentTeams = null;
      renderPlayers();
      renderTeams();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Eliminar";

    removeButton.addEventListener("click", () => {
      players = players.filter((item) => item.id !== player.id);
      selectedIds = selectedIds.filter((id) => id !== player.id);
      savePlayers();
      currentTeams = null;
      renderPlayers();
      renderTeams();
    });

    actions.append(selectButton, removeButton);
    card.append(info, actions);
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

  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Ese jugador ya está registrado.");
    return;
  }

  players.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    medal
  });

  savePlayers();
  currentTeams = null;
  renderPlayers();
  renderTeams();
  nameInput.value = "";
  nameInput.focus();
});

function teamScore(team) {
  return team.reduce((sum, player) => sum + medalRank[player.medal], 0);
}

function generateBalancedTeams(list) {
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  shuffled.sort(
    (a, b) => medalRank[b.medal] - medalRank[a.medal]
  );

  let bestTeams = null;
  let bestDifference = Infinity;

  for (let attempt = 0; attempt < 500; attempt++) {
    const teamA = [];
    const teamB = [];

    const randomized = [...shuffled].sort(() => Math.random() - 0.5);
    randomized.sort(
      (a, b) => medalRank[b.medal] - medalRank[a.medal]
    );

    randomized.forEach((player) => {
      if (teamA.length >= 5) {
        teamB.push(player);
      } else if (teamB.length >= 5) {
        teamA.push(player);
      } else if (teamScore(teamA) <= teamScore(teamB)) {
        teamA.push(player);
      } else {
        teamB.push(player);
      }
    });

    const difference = Math.abs(teamScore(teamA) - teamScore(teamB));

    if (teamA.length === 5 && teamB.length === 5 &&
        difference < bestDifference) {
      bestDifference = difference;
      bestTeams = { teamA, teamB };
    }

    if (bestDifference === 0) break;
  }

  return bestTeams;
}

function renderTeams() {
  teamsContainer.replaceChildren();

  if (!currentTeams) return;

  const teamNames = [
    { key: "teamA", label: "Equipo A" },
    { key: "teamB", label: "Equipo B" }
  ];

  teamNames.forEach(({ key, label }) => {
    const card = document.createElement("div");
    card.className = "team-card";

    const heading = document.createElement("h3");
    heading.textContent = `${label} · ${teamScore(currentTeams[key])} puntos`;
    card.appendChild(heading);

    currentTeams[key].forEach((player) => {
      const row = document.createElement("p");
      row.textContent = `${player.name} — ${player.medal} `;

      const moveButton = document.createElement("button");
      moveButton.type = "button";
      moveButton.className = "remove-button";
      moveButton.textContent = "Cambiar";

      moveButton.addEventListener("click", () => {
        const otherKey = key === "teamA" ? "teamB" : "teamA";
        const otherTeam = currentTeams[otherKey];

        const ownTeam = currentTeams[key];
        const playerIndex = ownTeam.findIndex((p) => p.id === player.id);

        if (playerIndex < 0 || otherTeam.length >= 5) return;

        ownTeam.splice(playerIndex, 1);
        otherTeam.push(player);
        renderTeams();
      });

      row.appendChild(moveButton);
      card.appendChild(row);
    });

    teamsContainer.appendChild(card);
  });

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "primary-button";
  shareButton.textContent = "Copiar equipos";

  shareButton.addEventListener("click", async () => {
    const message = ["DOTA BALANCE", ""]
      .concat(
        ["Equipo A", ...currentTeams.teamA.map((p) => `${p.name} (${p.medal})`), "",
         "Equipo B", ...currentTeams.teamB.map((p) => `${p.name} (${p.medal})`)]
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(message);
      alert("Equipos copiados. Ya puedes pegarlos en WhatsApp.");
    } catch {
      prompt("Copia tus equipos desde aquí:", message);
    }
  });

  teamsContainer.appendChild(shareButton);
}

balanceButton.addEventListener("click", () => {
  if (selectedIds.length !== 10) {
    alert(`Selecciona exactamente 10 jugadores. Has seleccionado ${selectedIds.length}.`);
    return;
  }

  const selectedPlayers = players.filter((p) => selectedIds.includes(p.id));
  currentTeams = generateBalancedTeams(selectedPlayers);

  if (!currentTeams) {
    alert("No se pudieron generar los equipos. Inténtalo de nuevo.");
    return;
  }

  renderTeams();
});

renderPlayers();
renderTeams();

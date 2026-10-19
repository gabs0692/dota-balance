
const STORAGE_KEY = "dota-balance-players";
const SUPABASE_URL = "https://rluyrtwszkqalnklsnky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xC5ZqWkWU_XTe8X805nX9w_nku-Aoyq";

const db = window.supabase.createClient(

  SUPABASE_URL,

  SUPABASE_ANON_KEY

);

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

let players = [];

let selectedIds = [];

let currentTeams = null;

let lobbyChannel = null;

function isValidSharedTeams(teams) {
  return (
    teams &&
    Array.isArray(teams.teamA) &&
    Array.isArray(teams.teamB) &&
    teams.teamA.length === 5 &&
    teams.teamB.length === 5
  );
}

async function loadSharedLobby() {
  const { data, error } = await db
    .from("lobby_state")
    .select("teams")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    showError(error);
    return;
  }

  const teams = data?.teams;

  if (isValidSharedTeams(teams)) {
    currentTeams = teams;

    selectedIds = [
      ...teams.teamA,
      ...teams.teamB
    ].map((player) => player.id);

    renderPlayers();
    renderTeams();
  }
}

async function saveSharedLobby() {
  if (!isValidSharedTeams(currentTeams)) return;

  const { error } = await db
    .from("lobby_state")
    .upsert(
      {
        id: 1,
        teams: currentTeams,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

  if (error) {
    showError(error);
  }
}

function setupLobbyRealtime() {
  if (lobbyChannel) return;

  lobbyChannel = db
    .channel("dota-balance-lobby")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lobby_state"
      },
      (payload) => {
        const teams = payload.new?.teams;

        if (!isValidSharedTeams(teams)) return;

        currentTeams = teams;

        selectedIds = [
          ...teams.teamA,
          ...teams.teamB
        ].map((player) => player.id);

        renderPlayers();
        renderTeams();
      }
    )
    .subscribe((status) => {
      console.log("Lobby Realtime:", status);
    });
}


function showError(error) {

  console.error(error);

  alert("Error de Supabase: " + (error.message || error));

}

function teamScore(team) {

  return team.reduce(

    (sum, player) => sum + (medalRank[player.medal] || 0),

    0

  );

}

// Campos para calificar las cinco posiciones

const roleFields = document.createElement("div");

roleFields.style.marginTop = "12px";

const roleTitle = document.createElement("p");

roleTitle.textContent = "Dominio de posiciones (1 = bajo, 5 = alto)";

roleFields.appendChild(roleTitle);

for (let position = 1; position <= 5; position++) {

  const label = document.createElement("label");

  label.textContent = `Posición ${position}`;

  label.htmlFor = `position-${position}`;

  const select = document.createElement("select");

  select.id = `position-${position}`;

  for (let rating = 1; rating <= 5; rating++) {

    const option = document.createElement("option");

    option.value = rating;

    option.textContent = rating;

    option.selected = rating === 3;

    select.appendChild(option);

  }

  roleFields.append(label, select);

}

const submitButton = form.querySelector('button[type="submit"]');

form.insertBefore(roleFields, submitButton);

async function loadPlayers() {

  const { data, error } = await db

    .from("players")

    .select("*")

    .order("created_at", { ascending: true });

  if (error) {

    showError(error);

    return;

  }

  players = data || [];

  selectedIds = selectedIds.filter((id) =>

    players.some((player) => player.id === id)

  );

  currentTeams = null;

  renderPlayers();

  renderTeams();

}

function renderPlayers() {
  playerList.replaceChildren();

  playerCount.textContent =
    `${players.length} jugadores · ${selectedIds.length}/10 elegidos`;

  if (!players.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay jugadores registrados.";
    playerList.appendChild(empty);
    return;
  }

  players.forEach((player) => {
    const selected = selectedIds.includes(player.id);

    const card = document.createElement("div");
    card.className = `player-card${selected ? " selected" : ""}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", String(selected));

    const info = document.createElement("div");
    info.className = "player-info";

    const name = document.createElement("strong");
    name.textContent = player.name;

    const details = document.createElement("small");
    details.textContent =
      `${player.medal} · Posiciones: ` +
      [1, 2, 3, 4, 5]
        .map((n) => player[`position_${n}`] ?? 3)
        .join("/");

    info.append(name, details);

    const check = document.createElement("span");
    check.className = "selection-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = selected ? "✓" : "";

    function toggleSelection() {
      if (selectedIds.includes(player.id)) {
        selectedIds = selectedIds.filter((id) => id !== player.id);
      } else {
        if (selectedIds.length >= 10) {
          alert("Solo puedes elegir 10 jugadores.");
          return;
        }

        selectedIds.push(player.id);
      }

      renderPlayers();
    }

    card.addEventListener("click", (event) => {
      if (event.target.closest(".delete-player-button")) return;
      toggleSelection();
    });

    card.addEventListener("keydown", (event) => {
      if (event.target !== card) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSelection();
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-player-button";
deleteButton.innerHTML = `
  <svg viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 10v6M14 10v6"/>
  </svg>
`;
    deleteButton.setAttribute("aria-label", `Eliminar a ${player.name}`);

    deleteButton.onclick = async (event) => {
      event.stopPropagation();

      if (!confirm(
        `¿Eliminar definitivamente a ${player.name} del pool de jugadores?`
      )) return;

      const { error } = await db
        .from("players")
        .delete()
        .eq("id", player.id);

      if (error) {
        showError(error);
        return;
      }

      selectedIds = selectedIds.filter((id) => id !== player.id);
      await loadPlayers();
    };

    card.append(info, deleteButton, check);
playerList.appendChild(card);
  });
}

form.addEventListener("submit", async (event) => {

  event.preventDefault();

  const name = nameInput.value.trim();

  if (!name) return;

  const { data: existing, error: checkError } = await db

    .from("players")

    .select("name");

  if (checkError) {

    showError(checkError);

    return;

  }

  if (existing.some(

    (p) => p.name.toLowerCase() === name.toLowerCase()

  )) {

    alert("Ese jugador ya está registrado.");

    return;

  }

  const newPlayer = {

    name,

    medal: medalInput.value

  };

  for (let n = 1; n <= 5; n++) {

    newPlayer[`position_${n}`] =

      Number(document.getElementById(`position-${n}`).value);

  }

  submitButton.disabled = true;

  try {

    const { error } = await db

      .from("players")

      .insert(newPlayer);

    if (error) {

      showError(error);

      return;

    }

    form.reset();

    await loadPlayers();

    alert("Jugador guardado en Supabase.");

  } finally {

    submitButton.disabled = false;

  }

});

// Encuentra el reparto con menor diferencia de medallas


function getBestRoleAssignment(team) {
  const roles = [1, 2, 3, 4, 5];
  let bestScore = -Infinity;
  let bestAssignment = [];

  function search(index, remaining, assignment, score) {
    if (index === team.length) {
      if (score > bestScore) {
        bestScore = score;
        bestAssignment = [...assignment];
      }
      return;
    }

    const player = team[index];

    for (const role of remaining) {
      const rating = Number(player[`position_${role}`] ?? 3);

      search(
        index + 1,
        remaining.filter((r) => r !== role),
        [...assignment, { ...player, suggestedRole: role }],
        score + rating
      );
    }
  }

  search(0, roles, [], 0);

  return {
    players: bestAssignment,
    score: bestScore
  };
}

function generateBalancedTeams(list) {
  let bestDifference = Infinity;
  const bestOptions = [];

  for (let mask = 0; mask < 1024; mask++) {
    const rawA = [];
    const rawB = [];

    list.forEach((player, index) => {
      if (mask & (1 << index)) {
        rawA.push(player);
      } else {
        rawB.push(player);
      }
    });

    if (rawA.length !== 5) continue;

    const resultA = getBestRoleAssignment(rawA);
    const resultB = getBestRoleAssignment(rawB);

    const medalDifference = Math.abs(
      teamScore(rawA) - teamScore(rawB)
    );

    const roleDifference = Math.abs(
      resultA.score - resultB.score
    );

    const totalRoleScore = resultA.score + resultB.score;

    // Equilibrio: 50 % medallas y 50 % roles.
    const medalPenalty = medalDifference / 35;

    const rolePenalty =
      0.7 * (roleDifference / 40) +
      0.3 * ((50 - totalRoleScore) / 40);

    const difference =
      0.5 * medalPenalty +
      0.5 * rolePenalty;

    if (difference < bestDifference - 0.000001) {
      bestDifference = difference;
      bestOptions.length = 0;
    }

    if (Math.abs(difference - bestDifference) < 0.000001) {
      bestOptions.push({
        teamA: resultA.players,
        teamB: resultB.players
      });
    }
  }

  return bestOptions[
    Math.floor(Math.random() * bestOptions.length)
  ];
}


function renderTeams() {
  teamsContainer.replaceChildren();

  if (!currentTeams) return;

  const roleNames = {
    1: "Carry",
    2: "Mid",
    3: "Offlane",
    4: "Support",
    5: "Hard Support"
  };

  [
    { key: "teamA", label: "Equipo A" },
    { key: "teamB", label: "Equipo B" }
  ].forEach(({ key, label }) => {
    const card = document.createElement("div");
    card.className = "team-card";

    const title = document.createElement("h3");
    title.textContent =
      `${label} · ${teamScore(currentTeams[key])} puntos`;

    card.appendChild(title);

    [...currentTeams[key]]
  .sort((a, b) => (a.suggestedRole || 99) - (b.suggestedRole || 99))
  .forEach((player) => {
      const row = document.createElement("p");

      const role = player.suggestedRole;
      const roleText = role
        ? `${role} · ${roleNames[role]}`
        : "Rol por asignar";

      const playerText = document.createElement("span");
      playerText.textContent =
        `${player.name} (${player.medal}) — ${roleText} `;

      row.appendChild(playerText);

      const swapButton = document.createElement("button");
      swapButton.type = "button";
      swapButton.className = "remove-button";
      swapButton.textContent = "Intercambiar";

      swapButton.onclick = async () => {
        const otherKey =
          key === "teamA" ? "teamB" : "teamA";

        const otherTeam = currentTeams[otherKey];

        const options = otherTeam
          .map((p, i) => `${i + 1}. ${p.name}`)
          .join("\n");

        const answer = prompt(
          `Intercambiar a ${player.name} con:\n${options}\n\nEscribe un número del 1 al 5:`
        );

        if (answer === null) return;

        const chosen = Number(answer);

        if (
          !Number.isInteger(chosen) ||
          chosen < 1 ||
          chosen > 5
        ) {
          alert("Elige un número entre 1 y 5.");
          return;
        }

        const otherIndex = chosen - 1;
        const replacement = otherTeam[otherIndex];
     
currentTeams[key][index] = replacement;
otherTeam[otherIndex] = player;

renderTeams();
await saveSharedLobby();

      };

      row.appendChild(swapButton);
      card.appendChild(row);
    });

    teamsContainer.appendChild(card);
  });

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "primary-button";
  shareButton.textContent = "Copiar equipos";

  shareButton.onclick = async () => {
    const message = [
      "DOTA BALANCE",
      "",
      "EQUIPO A",
      ...currentTeams.teamA.map(
        (p) =>
          `${p.name} (${p.medal}) — ${
            p.suggestedRole
              ? `${p.suggestedRole} · ${roleNames[p.suggestedRole]}`
              : "Rol por asignar"
          }`
      ),
      "",
      "EQUIPO B",
      ...currentTeams.teamB.map(
        (p) =>
          `${p.name} (${p.medal}) — ${
            p.suggestedRole
              ? `${p.suggestedRole} · ${roleNames[p.suggestedRole]}`
              : "Rol por asignar"
          }`
      )
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      alert("Equipos copiados para WhatsApp.");
    } catch {
      prompt("Copia los equipos:", message);
    }
  };

  teamsContainer.appendChild(shareButton);
}

balanceButton.onclick = async () => {

  if (selectedIds.length !== 10) {

    alert(

      `Debes elegir 10 jugadores. Tienes ${selectedIds.length}.`

    );

    return;

  }

  const selectedPlayers = selectedIds.map((id) =>

    players.find((player) => player.id === id)

  );

currentTeams = generateBalancedTeams(selectedPlayers);

renderTeams();
await saveSharedLobby();

};

setupLobbyRealtime();

loadPlayers().then(loadSharedLobby);

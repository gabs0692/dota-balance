
const STORAGE_KEY = "dota-balance-players";
const SUPABASE_URL = "https://rluyrtwszkqalnklsnky.supabase.co/rest/v1/";
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

    const card = document.createElement("div");

    card.className = "player-card";

    const info = document.createElement("div");

    const name = document.createElement("strong");

    name.textContent = player.name;

    const details = document.createElement("small");

    details.textContent =

      `${player.medal} · Posiciones: ` +

      [1, 2, 3, 4, 5]

        .map((n) => player[`position_${n}`])

        .join("/");

    info.append(name, details);

    const actions = document.createElement("div");

    actions.style.display = "flex";

    actions.style.gap = "6px";

    actions.style.flexWrap = "wrap";

    const selectButton = document.createElement("button");

    selectButton.type = "button";

    selectButton.className = "remove-button";

    selectButton.textContent = selectedIds.includes(player.id)

      ? "Quitar"

      : "Elegir";

    selectButton.onclick = () => {

      if (selectedIds.includes(player.id)) {

        selectedIds = selectedIds.filter((id) => id !== player.id);

      } else {

        if (selectedIds.length >= 10) {

          alert("Solo puedes elegir 10 jugadores.");

          return;

        }

        selectedIds.push(player.id);

      }

      currentTeams = null;

      renderPlayers();

      renderTeams();

    };

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className = "remove-button";

    deleteButton.textContent = "Eliminar";

    deleteButton.onclick = async () => {

      if (!confirm(`¿Eliminar a ${player.name}?`)) return;

      const { error } = await db

        .from("players")

        .delete()

        .eq("id", player.id);

      if (error) {

        showError(error);

        return;

      }

      await loadPlayers();

    };

    actions.append(selectButton, deleteButton);

    card.append(info, actions);

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

function generateBalancedTeams(list) {

  let bestDifference = Infinity;

  const bestOptions = [];

  // 10 jugadores: 252 combinaciones de 5

  for (let mask = 0; mask < 1024; mask++) {

    const teamA = [];

    const teamB = [];

    list.forEach((player, index) => {

      if (mask & (1 << index)) {

        teamA.push(player);

      } else {

        teamB.push(player);

      }

    });

    if (teamA.length !== 5) continue;

    const difference = Math.abs(

      teamScore(teamA) - teamScore(teamB)

    );

    if (difference < bestDifference) {

      bestDifference = difference;

      bestOptions.length = 0;

    }

    if (difference === bestDifference) {

      bestOptions.push({ teamA, teamB });

    }

  }

  return bestOptions[

    Math.floor(Math.random() * bestOptions.length)

  ];

}

function renderTeams() {

  teamsContainer.replaceChildren();

  if (!currentTeams) return;

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

    currentTeams[key].forEach((player, index) => {

      const row = document.createElement("p");

      row.textContent = `${player.name} (${player.medal}) `;

      const swapButton = document.createElement("button");

      swapButton.type = "button";

      swapButton.className = "remove-button";

      swapButton.textContent = "Intercambiar";

      swapButton.onclick = () => {

        const otherKey = key === "teamA" ? "teamB" : "teamA";

        const otherTeam = currentTeams[otherKey];

        const options = otherTeam

          .map((p, i) => `${i + 1}. ${p.name}`)

          .join("\n");

        const answer = prompt(

          `Intercambiar a ${player.name} con:\n${options}\n\nEscribe un número del 1 al 5:`

        );

        if (answer === null) return;

        const chosen = Number(answer);

        if (!Number.isInteger(chosen) ||

            chosen < 1 || chosen > 5) {

          alert("Elige un número entre 1 y 5.");

          return;

        }

        const otherIndex = chosen - 1;

        const replacement = otherTeam[otherIndex];

        currentTeams[key][index] = replacement;

        otherTeam[otherIndex] = player;

        renderTeams();

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

        (p) => `${p.name} (${p.medal})`

      ),

      "",

      "EQUIPO B",

      ...currentTeams.teamB.map(

        (p) => `${p.name} (${p.medal})`

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

balanceButton.onclick = () => {

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

};

// Carga los jugadores desde Supabase al abrir la web

loadPlayers()

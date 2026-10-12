export const SCHEMA_VERSION = 3;

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const SAMPLE_VOTES = {
  "poll-song": [132, 98, 74, 41],
  "poll-group": [210, 188, 95, 60],
  "poll-stage": [320, 270, 150],
};

function atHour(timestamp, hour) {
  const date = new Date(timestamp);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function pseudoRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function buildSampleVotes(poll, options, counts) {
  const random = pseudoRandom(poll.id.length * 7919);
  const end = Math.min(poll.closesAt, Date.now());
  const span = Math.max(end - poll.opensAt, HOUR_MS);
  const votes = [];
  options.forEach((option, index) => {
    for (let n = 0; n < counts[index]; n += 1) {
      votes.push({
        id: `vote-${poll.id}-${option.id}-${n}`,
        pollId: poll.id,
        optionId: option.id,
        voterId: `sample-${poll.id}-${index}-${n}`,
        castAt: Math.round(poll.opensAt + random() * span),
        voided: false,
        voidReason: "",
      });
    }
  });
  return votes;
}

function buildOptions(pollId, names, details) {
  return names.map((name, index) => ({
    id: `${pollId}-option-${index + 1}`,
    pollId,
    name,
    description: "",
    detail: details[index],
    order: index + 1,
  }));
}

export function buildSeed(now) {
  const edition = {
    id: "edition-60",
    year: 2027,
    name: "60 Festival de la Leyenda Vallenata",
    startsOn: "2027-04-28",
    endsOn: "2027-05-01",
    current: true,
  };

  const categories = [
    { id: "cat-music", editionId: edition.id, name: "Música", description: "Canciones y agrupaciones de la edición.", order: 1, active: true },
    { id: "cat-dance", editionId: edition.id, name: "Piloneras y vestuario", description: "Presentaciones de baile y su vestuario.", order: 2, active: true },
    { id: "cat-stage", editionId: edition.id, name: "Presentaciones", description: "Momentos destacados de las tarimas.", order: 3, active: true },
  ];

  const polls = [
    {
      id: "poll-song",
      categoryId: "cat-music",
      title: "Canción favorita del público",
      description: "Escoge la canción que más te gustó de las presentadas en tarima.",
      opensAt: atHour(now - 2 * DAY_MS, 8),
      closesAt: atHour(now + 9 * DAY_MS, 20),
      published: true,
      closedEarly: false,
      rule: { votesPerVoter: 1, period: "total", resultsVisibility: "afterClose", requiresRegistration: true },
    },
    {
      id: "poll-group",
      categoryId: "cat-music",
      title: "Agrupación favorita del público",
      description: "Escoge la agrupación que más disfrutaste durante el Festival.",
      opensAt: atHour(now - 1 * DAY_MS, 8),
      closesAt: atHour(now + 6 * DAY_MS, 20),
      published: true,
      closedEarly: false,
      rule: { votesPerVoter: 3, period: "day", resultsVisibility: "live", requiresRegistration: true },
    },
    {
      id: "poll-wardrobe",
      categoryId: "cat-dance",
      title: "Vestuario más destacado",
      description: "Escoge el vestuario que más te llamó la atención en el Desfile de Piloneras.",
      opensAt: atHour(now + 4 * DAY_MS, 8),
      closesAt: atHour(now + 12 * DAY_MS, 20),
      published: true,
      closedEarly: false,
      rule: { votesPerVoter: 1, period: "total", resultsVisibility: "afterClose", requiresRegistration: true },
    },
    {
      id: "poll-stage",
      categoryId: "cat-stage",
      title: "Presentación más recordada",
      description: "Escoge la presentación que más recuerdas de esta edición.",
      opensAt: atHour(now - 12 * DAY_MS, 8),
      closesAt: atHour(now - 1 * DAY_MS, 20),
      published: true,
      closedEarly: false,
      rule: { votesPerVoter: 1, period: "total", resultsVisibility: "afterClose", requiresRegistration: true },
    },
  ];

  const options = [
    ...buildOptions("poll-song", ["Canción A", "Canción B", "Canción C", "Canción D"], ["Aire: paseo", "Aire: merengue", "Aire: son", "Aire: puya"]),
    ...buildOptions("poll-group", ["Conjunto A", "Conjunto B", "Conjunto C", "Conjunto D"], ["Categoría profesional", "Categoría aficionado", "Categoría juvenil", "Categoría infantil"]),
    ...buildOptions("poll-wardrobe", ["Vestuario A", "Vestuario B", "Vestuario C"], ["Piloneras mayores", "Piloneras juveniles", "Piloneras infantiles"]),
    ...buildOptions("poll-stage", ["Presentación A", "Presentación B", "Presentación C"], ["Tarima Francisco el Hombre", "Parque de la Leyenda Vallenata", "Plaza Alfonso López"]),
  ];

  const votes = polls
    .filter((poll) => SAMPLE_VOTES[poll.id])
    .flatMap((poll) =>
      buildSampleVotes(poll, options.filter((option) => option.pollId === poll.id), SAMPLE_VOTES[poll.id]),
    );

  const users = [
    {
      id: "user-voter",
      name: "Votante de ejemplo",
      email: "votante@ejemplo.co",
      passwordSalt: "fvl-voter-7c21",
      passwordHash: "57d30e48ac40720eb64fda68e5a867cf38d286e8b8c7bfe94767bd2a59bd219d",
      role: "voter",
      active: true,
      createdAt: now - 20 * DAY_MS,
      privacyAcceptedAt: now - 20 * DAY_MS,
    },
    {
      id: "user-admin",
      name: "Administración de ejemplo",
      email: "admin@ejemplo.co",
      passwordSalt: "fvl-admin-3e94",
      passwordHash: "6f09bad439b4adf7c709e720c4e4743f42a05a68c6ec622142614b87a723bdd6",
      role: "admin",
      active: true,
      createdAt: now - 30 * DAY_MS,
      privacyAcceptedAt: now - 30 * DAY_MS,
    },
  ];

  const audit = [
    { id: "audit-1", at: now - 12 * DAY_MS, actor: "Administración de ejemplo", action: "Creó la votación", target: "Presentación más recordada" },
    { id: "audit-2", at: now - 2 * DAY_MS, actor: "Administración de ejemplo", action: "Publicó la votación", target: "Canción favorita del público" },
    { id: "audit-3", at: now - 1 * DAY_MS, actor: "Administración de ejemplo", action: "Publicó la votación", target: "Agrupación favorita del público" },
  ];

  return {
    version: SCHEMA_VERSION,
    seededAt: now,
    editions: [edition],
    categories,
    polls,
    options,
    votes,
    users,
    audit,
  };
}

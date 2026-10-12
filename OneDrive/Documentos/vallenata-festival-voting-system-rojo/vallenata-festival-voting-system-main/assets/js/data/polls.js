import { getState, persist, newId, newReceiptCode, getGuestId, logAudit } from "./storage.js";

export const POLL_STATUS = { draft: "draft", upcoming: "upcoming", open: "open", closed: "closed" };

export const STATUS_LABEL = {
  draft: "Borrador",
  upcoming: "Próxima",
  open: "Abierta",
  closed: "Cerrada",
};

export const PERIOD_LABEL = { total: "en total", day: "por día" };

export const VISIBILITY_LABEL = {
  hidden: "Solo la organización",
  afterClose: "Al cierre de la votación",
  live: "En vivo",
};

export const VOTE_REFUSAL = {
  closed: "Esta votación ya cerró.",
  "not-open": "Esta votación todavía no abre.",
  limit: "Ya usaste todos los votos que permite esta votación.",
  login: "Para votar en esta votación necesitas ingresar con tu cuenta.",
  option: "La opción elegida ya no está disponible. Elige otra opción.",
};

const DAY_MS = 24 * 3600 * 1000;

export function pollStatus(poll, now = Date.now()) {
  if (!poll.published) return POLL_STATUS.draft;
  if (poll.closedEarly || now >= poll.closesAt) return POLL_STATUS.closed;
  if (now < poll.opensAt) return POLL_STATUS.upcoming;
  return POLL_STATUS.open;
}

export function currentEdition() {
  const { editions } = getState();
  return editions.find((edition) => edition.current) ?? editions[0] ?? null;
}

export function listCategories({ activeOnly = false } = {}) {
  const edition = currentEdition();
  return getState()
    .categories.filter((category) => category.editionId === edition?.id && (!activeOnly || category.active))
    .sort((a, b) => a.order - b.order);
}

export function getCategory(categoryId) {
  return getState().categories.find((category) => category.id === categoryId) ?? null;
}

const STATUS_PRIORITY = { open: 0, upcoming: 1, draft: 2, closed: 3 };

function comparePolls(first, second) {
  const firstStatus = pollStatus(first);
  const secondStatus = pollStatus(second);
  if (firstStatus !== secondStatus) return STATUS_PRIORITY[firstStatus] - STATUS_PRIORITY[secondStatus];
  if (firstStatus === POLL_STATUS.upcoming) return first.opensAt - second.opensAt;
  if (firstStatus === POLL_STATUS.closed) return second.closesAt - first.closesAt;
  return first.closesAt - second.closesAt;
}

export function listPolls({ categoryId, status, includeDrafts = false } = {}) {
  const now = Date.now();
  const categoryIds = new Set(listCategories({ activeOnly: !includeDrafts }).map((category) => category.id));
  return getState()
    .polls.filter((poll) => categoryIds.has(poll.categoryId))
    .filter((poll) => !categoryId || poll.categoryId === categoryId)
    .filter((poll) => includeDrafts || poll.published)
    .filter((poll) => !status || pollStatus(poll, now) === status)
    .sort(comparePolls);
}

export function getPoll(pollId) {
  return getState().polls.find((poll) => poll.id === pollId) ?? null;
}

export function listOptions(pollId) {
  return getState()
    .options.filter((option) => option.pollId === pollId)
    .sort((a, b) => a.order - b.order);
}

export function listVotes(pollId) {
  return getState().votes.filter((vote) => vote.pollId === pollId);
}

export function tally(pollId) {
  const options = listOptions(pollId);
  const votes = listVotes(pollId);
  const valid = votes.filter((vote) => !vote.voided);
  const rows = options.map((option) => {
    const count = valid.filter((vote) => vote.optionId === option.id).length;
    return { option, count, share: valid.length ? (count / valid.length) * 100 : 0 };
  });
  const topCount = Math.max(0, ...rows.map((row) => row.count));
  return {
    total: valid.length,
    voided: votes.length - valid.length,
    rows: rows.map((row) => ({ ...row, leading: topCount > 0 && row.count === topCount })),
  };
}

export function canViewResults(poll, user) {
  if (user?.role === "admin") return true;
  const status = pollStatus(poll);
  if (status === POLL_STATUS.draft || status === POLL_STATUS.upcoming) return false;
  const { resultsVisibility } = poll.rule;
  if (resultsVisibility === "live") return true;
  if (resultsVisibility === "afterClose") return status === POLL_STATUS.closed;
  return false;
}

export function voterIdentity(poll, user) {
  if (user) return user.id;
  return poll.rule.requiresRegistration ? null : getGuestId();
}

function isSameDay(first, second) {
  return new Date(first).toDateString() === new Date(second).toDateString();
}

export function voteAllowance(poll, voterId, now = Date.now()) {
  const { votesPerVoter, period } = poll.rule;
  const used = listVotes(poll.id).filter(
    (vote) => vote.voterId === voterId && !vote.voided && (period === "total" || isSameDay(vote.castAt, now)),
  ).length;
  return { used, remaining: Math.max(votesPerVoter - used, 0), max: votesPerVoter };
}

export function nextVoteWindow(poll, now = Date.now()) {
  if (poll.rule.period !== "day") return null;
  const tomorrow = new Date(now + DAY_MS);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() < poll.closesAt ? tomorrow.getTime() : null;
}

export function refusalMessage(poll, reason) {
  const message = VOTE_REFUSAL[reason];
  return reason === "limit" && nextVoteWindow(poll) ? `${message} Podrás votar de nuevo mañana.` : message;
}

export function evaluateVote(poll, optionId, user) {
  const status = pollStatus(poll);
  if (status === POLL_STATUS.closed) return { ok: false, reason: "closed" };
  if (status !== POLL_STATUS.open) return { ok: false, reason: "not-open" };
  const voterId = voterIdentity(poll, user);
  if (!voterId) return { ok: false, reason: "login" };
  if (optionId && !listOptions(poll.id).some((option) => option.id === optionId)) return { ok: false, reason: "option" };
  if (voteAllowance(poll, voterId).remaining === 0) return { ok: false, reason: "limit" };
  return { ok: true, voterId };
}

export function castVote({ pollId, optionId, user }) {
  const poll = getPoll(pollId);
  if (!poll) return { ok: false, reason: "closed" };
  const evaluation = evaluateVote(poll, optionId, user);
  if (!evaluation.ok) return evaluation;

  const vote = {
    id: newId("vote"),
    receipt: newReceiptCode(),
    pollId,
    optionId,
    voterId: evaluation.voterId,
    castAt: Date.now(),
    voided: false,
    voidReason: "",
  };
  getState().votes.push(vote);
  persist();
  return { ok: true, vote };
}

export function findVote(voteId) {
  return getState().votes.find((vote) => vote.id === voteId) ?? null;
}

export function voidVote(voteId, reason, actor) {
  const vote = findVote(voteId);
  if (!vote || vote.voided) return false;
  vote.voided = true;
  vote.voidReason = reason;
  const poll = getPoll(vote.pollId);
  logAudit(actor.name, `Anuló un voto (${reason})`, poll?.title ?? "Votación");
  persist();
  return true;
}

export function summary() {
  const state = getState();
  const polls = listPolls({ includeDrafts: true });
  const statuses = polls.map((poll) => pollStatus(poll));
  return {
    openPolls: statuses.filter((status) => status === POLL_STATUS.open).length,
    upcomingPolls: statuses.filter((status) => status === POLL_STATUS.upcoming).length,
    totalVotes: state.votes.filter((vote) => !vote.voided).length,
    voters: state.users.filter((user) => user.role === "voter").length,
  };
}

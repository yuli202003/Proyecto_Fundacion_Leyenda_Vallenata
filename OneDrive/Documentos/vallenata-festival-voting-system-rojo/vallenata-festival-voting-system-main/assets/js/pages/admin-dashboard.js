import { boot } from "../ui/chrome.js";
import { el, mount } from "../ui/dom.js";
import { formatCount, formatDateTime } from "../ui/format.js";
import { statusBadge } from "../ui/poll-views.js";
import { adminHeading, dataTable } from "../ui/tables.js";
import { getState } from "../data/storage.js";
import { getCategory, listPolls, listVotes, pollStatus, summary } from "../data/polls.js";

const context = boot({ requires: "admin" });
const RECENT_ACTIVITY_LIMIT = 6;

function renderStats() {
  const figures = summary();
  const items = [
    ["Votaciones abiertas", figures.openPolls],
    ["Votaciones próximas", figures.upcomingPolls],
    ["Votos válidos", figures.totalVotes],
    ["Votantes registrados", figures.voters],
  ];
  return el(
    "dl",
    { class: "stat-row" },
    items.map(([label, value]) => el("div", { class: "stat" }, el("dt", {}, label), el("dd", {}, formatCount(value)))),
  );
}

function renderPolls() {
  const polls = listPolls({ includeDrafts: true });
  if (polls.length === 0) {
    return el(
      "div",
      { class: "empty-state" },
      el("h3", {}, "Todavía no hay votaciones"),
      el("p", {}, "Crea la primera votación para empezar a recibir votos."),
      el("a", { class: "button", href: "polls.html?new=1" }, "Crear votación"),
    );
  }
  return dataTable({
    caption: "Votaciones de la edición vigente",
    headers: ["Votación", "Categoría", "Estado", "Votos", "Cierre", "Acciones"],
    rows: polls.map((poll) => [
      el("strong", {}, poll.title),
      getCategory(poll.categoryId)?.name ?? "Sin categoría",
      statusBadge(pollStatus(poll)),
      formatCount(listVotes(poll.id).filter((vote) => !vote.voided).length),
      el("span", { class: "nowrap" }, formatDateTime(poll.closesAt)),
      el("a", { class: "button button--outline button--small", href: `results.html?poll=${poll.id}` }, "Ver resultados"),
    ]),
  });
}

function renderActivity() {
  const entries = getState().audit.slice(0, RECENT_ACTIVITY_LIMIT);
  return el(
    "ul",
    { class: "activity-list" },
    entries.map((entry) =>
      el(
        "li",
        { class: "activity-list__item" },
        el("span", { class: "activity-list__time" }, formatDateTime(entry.at)),
        el("span", {}, el("strong", {}, entry.actor), ` ${entry.action.toLowerCase()}: ${entry.target}`),
      ),
    ),
  );
}

if (context) {
  mount(
    document.querySelector("#admin-content"),
    adminHeading(
      "Panel de administración",
      null,
      el("a", { class: "button", href: "polls.html?new=1" }, "Crear votación"),
    ),
    renderStats(),
    el("section", { class: "admin-section", "aria-labelledby": "polls-title" }, el("h2", { id: "polls-title", class: "section-heading" }, "Votaciones"), renderPolls()),
    el("section", { class: "admin-section", "aria-labelledby": "activity-title" }, el("h2", { id: "activity-title", class: "section-heading" }, "Actividad reciente"), renderActivity()),
  );
}

import { boot } from "../ui/chrome.js";
import { el, mount, showToast, notice } from "../ui/dom.js";
import { confirmDialog, formDialog, pageParams } from "../ui/forms.js";
import { formatCount, formatDateTime, fromInputValue, toInputValue } from "../ui/format.js";
import { statusBadge } from "../ui/poll-views.js";
import { adminHeading, dataTable } from "../ui/tables.js";
import {
  getCategory, listCategories, listOptions, listPolls, listVotes, pollStatus, PERIOD_LABEL, VISIBILITY_LABEL, POLL_STATUS,
} from "../data/polls.js";
import { savePoll, closePoll, deletePoll } from "../data/admin.js";

const context = boot({ requires: "admin" });
const actor = context?.user;
const DEFAULT_DURATION_MS = 7 * 24 * 3600 * 1000;

function selectOptions(labels) {
  return Object.entries(labels).map(([value, label]) => ({ value, label: label.charAt(0).toUpperCase() + label.slice(1) }));
}

function pollFields(poll) {
  const now = Date.now();
  const rule = poll?.rule ?? { votesPerVoter: 1, period: "total", resultsVisibility: "afterClose", requiresRegistration: true };
  return [
    { id: "poll-title", name: "title", label: "Título", value: poll?.title ?? "" },
    {
      id: "poll-category", name: "categoryId", label: "Categoría", type: "select", value: poll?.categoryId ?? "",
      options: [{ value: "", label: "Elige una categoría" }, ...listCategories().map((category) => ({ value: category.id, label: category.name }))],
    },
    { id: "poll-description", name: "description", label: "Descripción", type: "textarea", required: false, value: poll?.description ?? "", hint: "Explica en una o dos frases sobre qué se vota." },
    { id: "poll-opens", name: "opensAt", label: "Apertura", type: "datetime-local", value: toInputValue(poll?.opensAt ?? now) },
    { id: "poll-closes", name: "closesAt", label: "Cierre", type: "datetime-local", value: toInputValue(poll?.closesAt ?? now + DEFAULT_DURATION_MS) },
    { id: "poll-votes", name: "votesPerVoter", label: "Votos por persona", type: "number", min: 1, max: 10, value: rule.votesPerVoter, hint: "Regla de ejemplo, pendiente de validación con el cliente (PREG-04)." },
    { id: "poll-period", name: "period", label: "Periodicidad", type: "select", value: rule.period, options: selectOptions(PERIOD_LABEL) },
    { id: "poll-visibility", name: "resultsVisibility", label: "Resultados visibles", type: "select", value: rule.resultsVisibility, options: selectOptions(VISIBILITY_LABEL), hint: "Pendiente de validación (PREG-06)." },
    { id: "poll-registration", name: "requiresRegistration", label: "Exigir cuenta para votar", type: "checkbox", value: rule.requiresRegistration, hint: "Pendiente de validación (PREG-03)." },
    { id: "poll-published", name: "published", label: "Publicar para el público", type: "checkbox", value: poll?.published ?? false, hint: "Para publicar la votación necesita al menos dos opciones." },
  ];
}

function toPollInput(values, poll) {
  return {
    id: poll?.id,
    title: values.title,
    categoryId: values.categoryId,
    description: values.description,
    opensAt: fromInputValue(values.opensAt),
    closesAt: fromInputValue(values.closesAt),
    published: values.published,
    rule: {
      votesPerVoter: values.votesPerVoter,
      period: values.period,
      resultsVisibility: values.resultsVisibility,
      requiresRegistration: values.requiresRegistration,
    },
  };
}

async function openPollForm(poll) {
  const saved = await formDialog({
    title: poll ? "Editar votación" : "Nueva votación",
    description: "Las reglas que configuras aquí son de ejemplo y se ajustarán cuando el cliente las valide.",
    fields: pollFields(poll),
    onSubmit: (values) => savePoll(toPollInput(values, poll), actor),
  });
  if (saved) {
    showToast(poll ? "Votación actualizada." : "Votación creada.");
    render();
  }
}

async function removePoll(poll) {
  const confirmed = await confirmDialog({
    title: "Eliminar votación",
    message: `Vas a eliminar "${poll.title}" y sus opciones. Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar votación",
    danger: true,
  });
  if (!confirmed) return;
  const result = deletePoll(poll.id, actor);
  showToast(result.ok ? "Votación eliminada." : result.error, result.ok ? "default" : "danger");
  render();
}

async function endPoll(poll) {
  const confirmed = await confirmDialog({
    title: "Cerrar votación",
    message: `Vas a cerrar "${poll.title}" antes de su fecha de cierre. Nadie podrá votar después.`,
    confirmLabel: "Cerrar votación",
    danger: true,
  });
  if (!confirmed) return;
  closePoll(poll.id, actor);
  showToast("Votación cerrada.");
  render();
}

function pollActions(poll) {
  const status = pollStatus(poll);
  return el(
    "div",
    { class: "data-table__actions" },
    el("button", { class: "button button--outline button--small", type: "button", onclick: () => openPollForm(poll) }, "Editar"),
    el("a", { class: "button button--outline button--small", href: `options.html?poll=${poll.id}` }, "Opciones"),
    status === POLL_STATUS.open
      ? el("button", { class: "button button--outline button--small", type: "button", onclick: () => endPoll(poll) }, "Cerrar")
      : null,
    el("button", { class: "button button--danger button--small", type: "button", "aria-label": `Eliminar ${poll.title}`, onclick: () => removePoll(poll) }, "Eliminar"),
  );
}

function pollTable() {
  const polls = listPolls({ includeDrafts: true });
  if (polls.length === 0) {
    return el(
      "div",
      { class: "empty-state" },
      el("h2", {}, "Todavía no hay votaciones"),
      el("p", {}, "Crea una votación, agrégale opciones y publícala."),
      el("button", { class: "button", type: "button", onclick: () => openPollForm(null) }, "Crear votación"),
    );
  }
  return dataTable({
    caption: "Votaciones de la edición vigente",
    headers: ["Votación", "Estado", "Opciones", "Votos", "Apertura y cierre", "Acciones"],
    rows: polls.map((poll) => [
      el("div", {}, el("strong", {}, poll.title), el("br"), el("span", { class: "field__hint" }, getCategory(poll.categoryId)?.name ?? "Sin categoría")),
      statusBadge(pollStatus(poll)),
      String(listOptions(poll.id).length),
      formatCount(listVotes(poll.id).filter((vote) => !vote.voided).length),
      el("div", {}, el("span", { class: "nowrap" }, formatDateTime(poll.opensAt)), el("br"), el("span", { class: "nowrap" }, formatDateTime(poll.closesAt))),
      pollActions(poll),
    ]),
  });
}

function render() {
  const hasCategories = listCategories().length > 0;
  mount(
    document.querySelector("#admin-content"),
    adminHeading(
      "Votaciones",
      null,
      hasCategories
        ? el("button", { class: "button", type: "button", onclick: () => openPollForm(null) }, "Nueva votación")
        : null,
    ),
    hasCategories ? null : notice("warning", el("p", {}, "Primero necesitas una categoría. "), el("a", { href: "categories.html" }, "Crear una categoría")),
    pollTable(),
  );
}

if (context) {
  render();
  if (pageParams().get("new") === "1" && listCategories().length > 0) openPollForm(null);
}

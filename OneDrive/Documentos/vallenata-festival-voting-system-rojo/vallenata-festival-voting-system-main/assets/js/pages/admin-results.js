import { boot } from "../ui/chrome.js";
import { el, mount, showToast } from "../ui/dom.js";
import { formDialog, pageParams } from "../ui/forms.js";
import { formatCount, formatDateTime, formatPercent } from "../ui/format.js";
import { statusBadge } from "../ui/poll-views.js";
import { renderResults } from "../ui/results-view.js";
import { adminHeading, dataTable, pollSelector } from "../ui/tables.js";
import { getState } from "../data/storage.js";
import { getPoll, listOptions, listPolls, listVotes, pollStatus, tally, voidVote } from "../data/polls.js";

const context = boot({ requires: "admin" });
const actor = context?.user;
const VOTE_LOG_LIMIT = 12;
const MIN_REASON_LENGTH = 5;
const EXCEL_BOM = String.fromCharCode(0xfeff);

let selectedPollId = pageParams().get("poll") ?? listPolls({ includeDrafts: true })[0]?.id ?? null;

function voterLabel(voterId) {
  if (voterId.startsWith("sample-")) return "Cuenta de ejemplo";
  if (voterId.startsWith("guest-")) return "Invitado";
  return getState().users.find((user) => user.id === voterId)?.name ?? "Cuenta eliminada";
}

function exportCsv(poll) {
  const { rows, total } = tally(poll.id);
  const lines = [["Opcion", "Votos", "Porcentaje"], ...rows.map((row) => [row.option.name, row.count, row.share.toFixed(2)])];
  lines.push(["Total de votos validos", total, ""]);
  const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const link = el("a", {
    href: URL.createObjectURL(new Blob([EXCEL_BOM + csv], { type: "text/csv;charset=utf-8" })),
    download: `resultados-${poll.id}.csv`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  showToast("Archivo de resultados descargado.");
}

async function openVoidForm(vote, poll) {
  const saved = await formDialog({
    title: "Anular voto",
    description: "El voto queda anulado y deja de contar, pero su registro se conserva en la bitácora. Función pendiente de validación (PREG-14).",
    submitLabel: "Anular voto",
    fields: [{ id: "void-reason", name: "reason", label: "Motivo de la anulación", type: "textarea", rows: 3, hint: "Describe por qué el voto es sospechoso." }],
    onSubmit: ({ reason }) => {
      if (reason.trim().length < MIN_REASON_LENGTH) return { ok: false, errors: { reason: `Escribe un motivo de al menos ${MIN_REASON_LENGTH} caracteres.` } };
      voidVote(vote.id, reason.trim(), actor);
      return { ok: true, value: true };
    },
  });
  if (saved) {
    showToast(`Voto anulado en "${poll.title}".`);
    render();
  }
}

function voteLog(poll) {
  const options = listOptions(poll.id);
  const votes = listVotes(poll.id).sort((a, b) => b.castAt - a.castAt).slice(0, VOTE_LOG_LIMIT);
  if (votes.length === 0) {
    return el("div", { class: "empty-state" }, el("h3", {}, "Todavía no hay votos"), el("p", {}, "Cuando alguien vote, aparecerá en este registro."));
  }
  return dataTable({
    caption: "Últimos votos registrados",
    headers: ["Fecha y hora", "Opción", "Votante", "Estado", "Acción"],
    rows: votes.map((vote) => {
      const index = options.findIndex((option) => option.id === vote.optionId);
      return [
        el("span", { class: "nowrap" }, formatDateTime(vote.castAt)),
        options[index]?.name ?? "",
        voterLabel(vote.voterId),
        vote.voided ? el("span", { class: "status status--draft" }, "Anulado") : el("span", { class: "status status--open" }, "Válido"),
        vote.voided
          ? el("span", { class: "field__hint" }, vote.voidReason)
          : el("button", { class: "button button--danger button--small", type: "button", onclick: () => openVoidForm(vote, poll) }, "Anular"),
      ];
    }),
  });
}

function render() {
  const polls = listPolls({ includeDrafts: true });
  const target = document.querySelector("#admin-content");
  if (polls.length === 0) {
    mount(
      target,
      adminHeading("Resultados"),
      el("div", { class: "empty-state" }, el("h2", {}, "Todavía no hay votaciones"), el("p", {}, "Crea y publica una votación para ver sus resultados."), el("a", { class: "button", href: "polls.html?new=1" }, "Crear votación")),
    );
    return;
  }
  const poll = getPoll(selectedPollId) ?? polls[0];
  selectedPollId = poll.id;
  const { total, voided } = tally(poll.id);

  mount(
    target,
    adminHeading("Resultados"),
    el(
      "div",
      { class: "toolbar" },
      pollSelector({
        polls,
        selectedId: poll.id,
        onChange: (value) => {
          selectedPollId = value;
          render();
        },
      }),
      el("button", { class: "button button--outline", type: "button", onclick: () => exportCsv(poll) }, "Exportar resultados (CSV)"),
    ),
    el("p", { class: "tag-pending" }, "Anulación y exportación: funciones pendientes de validación"),
    el(
      "dl",
      { class: "stat-row stat-row--spaced" },
      el("div", { class: "stat" }, el("dt", {}, "Votos válidos"), el("dd", {}, formatCount(total))),
      el("div", { class: "stat" }, el("dt", {}, "Votos anulados"), el("dd", {}, formatCount(voided))),
      el("div", { class: "stat" }, el("dt", {}, "Estado"), el("dd", {}, statusBadge(pollStatus(poll)))),
      el("div", { class: "stat" }, el("dt", {}, "Opción líder"), leaderFigure(poll)),
    ),
    el("section", { class: "admin-section stack", "aria-labelledby": "totals-title" }, el("h2", { id: "totals-title" }, "Totales por opción"), renderResults(poll.id)),
    el("section", { class: "admin-section stack", "aria-labelledby": "log-title" }, el("h2", { id: "log-title" }, "Últimos votos"), voteLog(poll)),
  );
}

function leaderFigure(poll) {
  const leader = tally(poll.id).rows.find((row) => row.leading);
  if (!leader) return el("dd", { class: "stat__text" }, "Sin votos");
  return el("dd", { class: "stat__text" }, leader.option.name, el("span", { class: "stat__note" }, formatPercent(leader.share)));
}

if (context) render();

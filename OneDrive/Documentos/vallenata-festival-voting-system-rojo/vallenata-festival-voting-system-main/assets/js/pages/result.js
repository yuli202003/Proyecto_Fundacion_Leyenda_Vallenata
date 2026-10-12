import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount, notice } from "../ui/dom.js";
import { pageParams } from "../ui/forms.js";
import { formatDateTime } from "../ui/format.js";
import { flowBanner, pollTrail, statusBadge, windowSummary } from "../ui/poll-views.js";
import { renderResults } from "../ui/results-view.js";
import {
  getPoll, getCategory, listOptions, findVote, canViewResults, pollStatus, voterIdentity, voteAllowance,
  PERIOD_LABEL, POLL_STATUS,
} from "../data/polls.js";

const context = boot();
const params = pageParams();
const poll = getPoll(params.get("id"));

function ownReceipt(user) {
  const vote = findVote(params.get("receipt"));
  if (!vote || !poll || vote.pollId !== poll.id || vote.voterId !== voterIdentity(poll, user)) return null;
  return vote;
}

function receiptPanel(vote) {
  const options = listOptions(poll.id);
  const index = options.findIndex((option) => option.id === vote.optionId);
  const { remaining } = voteAllowance(poll, vote.voterId);
  const canVoteAgain = remaining > 0 && pollStatus(poll) === POLL_STATUS.open;
  return el(
    "section",
    { class: "stack", "aria-labelledby": "receipt-title" },
    el(
      "div",
      { class: "receipt stack" },
      el("h2", { id: "receipt-title" }, "Voto registrado"),
      el("p", { class: "receipt__code" }, vote.receipt),
      el("p", { class: "field__hint" }, "Código de confirmación. Guárdalo si necesitas consultarlo después."),
      el(
        "dl",
        { class: "facts facts--ruled" },
        el("div", { class: "facts__item" }, el("dt", {}, "Tu voto"), el("dd", {}, options[index]?.name ?? "")),
        el("div", { class: "facts__item" }, el("dt", {}, "Fecha y hora"), el("dd", {}, formatDateTime(vote.castAt))),
        el(
          "div",
          { class: "facts__item" },
          el("dt", {}, "Votos restantes"),
          el("dd", {}, `${remaining} ${PERIOD_LABEL[poll.rule.period]}`),
        ),
      ),
    ),
    canVoteAgain ? el("a", { class: "button button--outline", href: `options.html?id=${poll.id}` }, "Votar otra vez") : null,
  );
}

function resultsSection(user) {
  const status = pollStatus(poll);
  let body;
  if (canViewResults(poll, user)) {
    body = renderResults(poll.id);
  } else if (status === POLL_STATUS.upcoming) {
    body = notice("info", el("p", {}, "La votación todavía no abre, por eso no hay resultados."));
  } else if (poll.rule.resultsVisibility === "hidden") {
    body = notice("info", el("p", {}, "Los resultados de esta votación los conoce solo la organización."));
  } else {
    body = notice("info", el("p", {}, `Los resultados se publicarán al cierre: ${formatDateTime(poll.closesAt)}`));
  }
  return el("section", { class: "stack", "aria-labelledby": "results-title" }, el("h2", { id: "results-title" }, "Resultados"), body);
}

function renderPage(user) {
  const status = pollStatus(poll);
  const vote = ownReceipt(user);
  const category = getCategory(poll.categoryId);
  document.title = `${vote ? "Voto registrado" : "Resultados"} | ${poll.title}`;

  mount(
    document.querySelector("#flow-banner"),
    vote
      ? flowBanner(poll, { step: 3 })
      : el(
          "div",
          { class: "container" },
          el("h1", { class: "page-banner__title" }, poll.title),
          el("div", { class: "page-banner__meta" }, statusBadge(status), el("span", { class: "meta-item" }, category?.name ?? ""), el("span", { class: "meta-item" }, windowSummary(poll))),
        ),
  );

  renderBreadcrumb(pollTrail(poll, { label: poll.title, href: `poll.html?id=${poll.id}` }, { label: vote ? "Voto registrado" : "Resultados" }));

  mount(
    document.querySelector("#result-content"),
    el(
      "div",
      { class: "container container--narrow poll-layout" },
      vote ? receiptPanel(vote) : null,
      resultsSection(user),
      el("div", { class: "form-actions" }, el("a", { class: "button button--outline", href: "polls.html?status=open" }, "Ver más votaciones abiertas")),
    ),
  );
}

if (context) {
  if (!poll || !poll.published) location.replace("polls.html");
  else renderPage(context.user);
}

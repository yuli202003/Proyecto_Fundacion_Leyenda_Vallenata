import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount, notice } from "../ui/dom.js";
import { pageParams } from "../ui/forms.js";
import { formatDateTime } from "../ui/format.js";
import { optionThumbnail, pollTrail, statusBadge, windowSummary } from "../ui/poll-views.js";
import {
  getPoll, getCategory, listOptions, pollStatus, canViewResults, voterIdentity, voteAllowance, nextVoteWindow,
  PERIOD_LABEL, VISIBILITY_LABEL, POLL_STATUS,
} from "../data/polls.js";

const context = boot();

function renderMissing() {
  document.title = "Votación no encontrada | Festival de la Leyenda Vallenata";
  mount(
    document.querySelector("#poll-content"),
    el(
      "div",
      { class: "container container--narrow section" },
      el(
        "div",
        { class: "empty-state" },
        el("h1", {}, "No encontramos esta votación"),
        el("p", {}, "Es posible que el enlace esté incompleto o que la votación ya no esté publicada."),
        el("a", { class: "button", href: "polls.html" }, "Ver todas las votaciones"),
      ),
    ),
  );
}

function renderBanner(poll, status) {
  const category = getCategory(poll.categoryId);
  mount(
    document.querySelector("#poll-banner"),
    el(
      "div",
      { class: "container" },
      el("h1", { class: "page-banner__title" }, poll.title),
      poll.description ? el("p", { class: "page-banner__lead" }, poll.description) : null,
      el(
        "div",
        { class: "page-banner__meta" },
        statusBadge(status),
        el("span", { class: "meta-item" }, category?.name ?? ""),
        el("span", { class: "meta-item" }, windowSummary(poll)),
      ),
    ),
  );
}

function ruleList(poll) {
  const { votesPerVoter, period, resultsVisibility, requiresRegistration } = poll.rule;
  const votesText = votesPerVoter === 1 ? "1 voto" : `${votesPerVoter} votos`;
  const entries = [
    ["Votos por persona", `${votesText} ${PERIOD_LABEL[period]}`],
    ["Identificación", requiresRegistration ? "Con cuenta" : "Sin cuenta"],
    ["Resultados visibles", VISIBILITY_LABEL[resultsVisibility]],
    ["Apertura", formatDateTime(poll.opensAt)],
    ["Cierre", formatDateTime(poll.closesAt)],
  ];
  return el(
    "dl",
    { class: "rule-list" },
    entries.map(([term, detail]) => el("div", { class: "rule-list__item" }, el("dt", {}, term), el("dd", {}, detail))),
  );
}

function ctaBlock(poll, status, user) {
  const optionsUrl = `options.html?id=${poll.id}`;
  const resultsUrl = `result.html?id=${poll.id}`;

  if (status === POLL_STATUS.closed) {
    return el("a", { class: "button", href: resultsUrl }, "Ver resultados");
  }
  if (status === POLL_STATUS.upcoming) {
    return el("button", { class: "button button--block", type: "button", disabled: true }, windowSummary(poll));
  }
  if (status !== POLL_STATUS.open) {
    return notice("info", "Esta votación todavía es un borrador y no está publicada.");
  }

  const voterId = voterIdentity(poll, user);
  if (!voterId) {
    const next = encodeURIComponent(optionsUrl);
    return el(
      "div",
      { class: "stack" },
      el("a", { class: "button button--block", href: `sign-in.html?next=${next}` }, "Ingresar para votar"),
      el("a", { class: "button button--outline button--block", href: `sign-up.html?next=${next}` }, "Crear cuenta"),
    );
  }

  const { remaining, used, max } = voteAllowance(poll, voterId);
  if (remaining === 0) {
    const nextWindow = nextVoteWindow(poll);
    return el(
      "div",
      { class: "stack" },
      notice("success", el("p", {}, el("strong", {}, "Ya usaste tus votos."), ` Votaste ${used} de ${max} ${PERIOD_LABEL[poll.rule.period]}.`), nextWindow ? el("p", {}, "Podrás votar de nuevo mañana.") : null),
      canViewResults(poll, user) ? el("a", { class: "button button--outline button--block", href: resultsUrl }, "Ver resultados") : null,
    );
  }
  return el(
    "div",
    { class: "stack" },
    el("a", { class: "button button--block", href: optionsUrl }, "Ver opciones y votar"),
    max > 1 ? el("p", { class: "field__hint" }, `Te quedan ${remaining} de ${max} votos ${PERIOD_LABEL[poll.rule.period]}.`) : null,
  );
}

function renderPoll(poll, user) {
  const status = pollStatus(poll);
  const options = listOptions(poll.id);
  document.title = `${poll.title} | Festival de la Leyenda Vallenata`;
  renderBanner(poll, status);
  renderBreadcrumb(pollTrail(poll, { label: poll.title }));

  mount(
    document.querySelector("#poll-content"),
    el(
      "div",
      { class: "container poll-layout poll-layout--split" },
      el(
        "section",
        { class: "stack", "aria-labelledby": "options-title" },
        el("h2", { id: "options-title" }, `Opciones (${options.length})`),
        el(
          "ul",
          { class: "row-list" },
          options.map((option) =>
            el(
              "li",
              { class: "row-list__item" },
              el(
                "div",
                { class: "option-summary" },
                optionThumbnail(option),
                el("div", { class: "stack stack--tight" }, el("p", { class: "row-list__title" }, option.name), option.detail ? el("p", { class: "field__hint" }, option.detail) : null),
              ),
            ),
          ),
        ),
      ),
      el(
        "aside",
        { class: "stack stack--roomy", "aria-label": "Votar y reglas" },
        ctaBlock(poll, status, user),
        el("section", { class: "stack", "aria-labelledby": "rules-title" }, el("h2", { id: "rules-title" }, "Reglas"), ruleList(poll)),
      ),
    ),
  );
}

if (context) {
  const poll = getPoll(pageParams().get("id"));
  if (!poll || (!poll.published && context.user?.role !== "admin")) renderMissing();
  else renderPoll(poll, context.user);
}

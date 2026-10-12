import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount, notice } from "../ui/dom.js";
import { pageParams } from "../ui/forms.js";
import { flowBanner, optionThumbnail, pollTrail } from "../ui/poll-views.js";
import {
  getPoll, listOptions, evaluateVote, voteAllowance, refusalMessage,
} from "../data/polls.js";

const context = boot();
const params = pageParams();
const poll = getPoll(params.get("id"));

function renderRefusal(reason) {
  const next = encodeURIComponent(`options.html?id=${poll.id}`);
  const action =
    reason === "login"
      ? el("a", { class: "button", href: `sign-in.html?next=${next}` }, "Ingresar para votar")
      : el("a", { class: "button button--outline", href: `poll.html?id=${poll.id}` }, "Volver a la votación");
  mount(
    document.querySelector("#options-content"),
    el("div", { class: "container container--narrow section stack" }, notice("warning", el("p", {}, refusalMessage(poll, reason))), action),
  );
}

function choice(option, index, checked) {
  return el(
    "label",
    { class: "choice" },
    el("input", { class: "choice__input", type: "radio", name: "option", value: option.id, checked }),
    el(
      "span",
      { class: "choice__body" },
      optionThumbnail(option),
      el(
        "span",
        { class: "choice__text" },
        el("span", { class: "choice__name" }, option.name),
        option.detail ? el("span", { class: "choice__detail" }, option.detail) : null,
        option.description ? el("span", { class: "choice__description" }, option.description) : null,
      ),
      el("span", { class: "choice__mark", "aria-hidden": "true" }),
    ),
  );
}

function renderChoices(user) {
  const options = listOptions(poll.id);
  const preselected = params.get("option");
  const voterId = user?.id ?? null;
  const remaining = voterId ? voteAllowance(poll, voterId).remaining : poll.rule.votesPerVoter;
  const summary = el("p", { class: "action-bar__summary", id: "selection-summary", "aria-live": "polite" }, "Elige una opción para continuar.");
  const submit = el("button", { class: "button", type: "submit", form: "options-form", disabled: true }, "Continuar a la confirmación");

  const form = el(
    "form",
    { class: "container container--narrow poll-layout", id: "options-form", novalidate: true },
    el(
      "fieldset",
      { class: "stack" },
      el("legend", { class: "legend-title" }, "Elige una opción"),
      remaining > 1 ? el("p", { class: "field__hint" }, `Tienes ${remaining} votos disponibles.`) : null,
      el("div", { class: "choice-list" }, options.map((option, index) => choice(option, index, option.id === preselected))),
    ),
  );

  const bar = el("div", { class: "action-bar" }, el("div", { class: "container container--narrow action-bar__inner" }, summary, submit));
  const wrapper = el("div", {}, form, bar);
  wrapper.addEventListener("change", () => refresh());
  wrapper.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = form.querySelector("input[name='option']:checked");
    if (selected) location.assign(`confirm.html?id=${poll.id}&option=${selected.value}`);
  });

  function refresh() {
    const selected = form.querySelector("input[name='option']:checked");
    submit.disabled = !selected;
    if (!selected) {
      summary.textContent = "Elige una opción para continuar.";
      return;
    }
    const chosen = options.find((option) => option.id === selected.value);
    mount(summary, el("strong", {}, chosen.name), "Aún no se registra el voto.");
  }

  mount(document.querySelector("#options-content"), wrapper);
  refresh();
}

if (context) {
  if (!poll || !poll.published) {
    location.replace("polls.html");
  } else {
    document.title = `Elegir opción | ${poll.title}`;
    mount(
      document.querySelector("#flow-banner"),
      flowBanner(poll, { step: 1 }),
    );
    renderBreadcrumb(pollTrail(poll, { label: poll.title, href: `poll.html?id=${poll.id}` }, { label: "Elegir opción" }));
    const evaluation = evaluateVote(poll, null, context.user);
    if (evaluation.ok) renderChoices(context.user);
    else renderRefusal(evaluation.reason);
  }
}

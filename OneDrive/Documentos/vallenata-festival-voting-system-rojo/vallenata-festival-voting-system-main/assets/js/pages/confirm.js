import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount, notice } from "../ui/dom.js";
import { pageParams } from "../ui/forms.js";
import { flowBanner, pollTrail } from "../ui/poll-views.js";
import {
  getPoll, listOptions, evaluateVote, castVote, voteAllowance, refusalMessage, PERIOD_LABEL,
} from "../data/polls.js";

const SIMULATED_LATENCY_MS = 600;

const context = boot();
const params = pageParams();
const poll = getPoll(params.get("id"));
const options = poll ? listOptions(poll.id) : [];
const optionIndex = options.findIndex((option) => option.id === params.get("option"));
const option = options[optionIndex];

function renderRefusal(reason) {
  const next = encodeURIComponent(`options.html?id=${poll.id}`);
  const action =
    reason === "login"
      ? el("a", { class: "button", href: `sign-in.html?next=${next}` }, "Ingresar para votar")
      : el("a", { class: "button button--outline", href: `poll.html?id=${poll.id}` }, "Volver a la votación");
  mount(
    document.querySelector("#confirm-content"),
    el("div", { class: "container container--narrow section stack" }, notice("danger", el("p", {}, refusalMessage(poll, reason))), action),
  );
}

function renderConfirmation(user) {
  const voterId = user?.id ?? null;
  const remainingAfter = voterId ? voteAllowance(poll, voterId).remaining - 1 : poll.rule.votesPerVoter - 1;
  const alertSlot = el("div", { "aria-live": "assertive" });
  const confirmButton = el("button", { class: "button", type: "button" }, "Confirmar voto");

  confirmButton.addEventListener("click", () => {
    confirmButton.classList.add("is-busy");
    confirmButton.disabled = true;
    setTimeout(() => {
      const result = castVote({ pollId: poll.id, optionId: option.id, user });
      if (result.ok) {
        location.assign(`result.html?id=${poll.id}&receipt=${result.vote.id}`);
        return;
      }
      confirmButton.classList.remove("is-busy");
      confirmButton.disabled = false;
      mount(alertSlot, notice("danger", el("p", {}, refusalMessage(poll, result.reason))));
    }, SIMULATED_LATENCY_MS);
  });

  mount(
    document.querySelector("#confirm-content"),
    el(
      "div",
      { class: "container container--narrow poll-layout" },
      el(
        "section",
        { class: "confirm-panel stack", "aria-labelledby": "confirm-title" },
        el("h2", { id: "confirm-title", class: "field__label" }, "Vas a votar por"),
        el("p", { class: "confirm-panel__choice" }, option.name),
      ),
      notice(
        "warning",
        el("p", {}, el("strong", {}, "Un voto confirmado no se puede cambiar.")),
        remainingAfter > 0 ? el("p", {}, `Después de este voto te quedarán ${remainingAfter} ${PERIOD_LABEL[poll.rule.period]}.`) : null,
      ),
      alertSlot,
      el(
        "div",
        { class: "form-actions" },
        confirmButton,
        el("a", { class: "button button--outline", href: `options.html?id=${poll.id}&option=${option.id}` }, "Cambiar opción"),
      ),
    ),
  );
}

if (context) {
  if (!poll || !poll.published || !option) {
    location.replace(poll ? `options.html?id=${poll.id}` : "polls.html");
  } else {
    document.title = `Confirmar voto | ${poll.title}`;
    mount(
      document.querySelector("#flow-banner"),
      flowBanner(poll, { step: 2 }),
    );
    renderBreadcrumb(pollTrail(poll, { label: poll.title, href: `poll.html?id=${poll.id}` }, { label: "Confirmar voto" }));
    const evaluation = evaluateVote(poll, option.id, context.user);
    if (evaluation.ok) renderConfirmation(context.user);
    else renderRefusal(evaluation.reason);
  }
}

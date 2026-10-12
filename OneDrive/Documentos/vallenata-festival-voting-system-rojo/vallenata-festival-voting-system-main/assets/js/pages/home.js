import { boot } from "../ui/chrome.js";
import { el, mount } from "../ui/dom.js";
import { formatIsoRange } from "../ui/format.js";
import { categoryRow, pollRow } from "../ui/poll-views.js";
import { currentEdition, listCategories, listPolls, POLL_STATUS } from "../data/polls.js";

const context = boot();

function renderEdition() {
  const edition = currentEdition();
  if (!edition) return;
  mount(
    document.querySelector("#edition-line"),
    el("strong", {}, edition.name),
    el("span", {}, `Valledupar, ${formatIsoRange(edition.startsOn, edition.endsOn)}`),
  );
}

function renderOpenPolls() {
  const target = document.querySelector("#open-polls");
  const openPolls = listPolls({ status: POLL_STATUS.open });
  if (openPolls.length === 0) {
    mount(
      target,
      el(
        "li",
        {},
        el(
          "div",
          { class: "empty-state" },
          el("h3", {}, "No hay votaciones abiertas en este momento"),
          el("p", {}, "Revisa las votaciones próximas para saber cuándo abren."),
          el("a", { class: "button button--outline", href: "polls.html?status=upcoming" }, "Ver votaciones próximas"),
        ),
      ),
    );
    return;
  }
  mount(target, openPolls.map((poll) => pollRow(poll)));
}

if (context) {
  renderEdition();
  renderOpenPolls();
  mount(document.querySelector("#category-index"), listCategories({ activeOnly: true }).map(categoryRow));
  if (context.user) document.querySelectorAll("[data-guest-only]").forEach((node) => node.remove());
}

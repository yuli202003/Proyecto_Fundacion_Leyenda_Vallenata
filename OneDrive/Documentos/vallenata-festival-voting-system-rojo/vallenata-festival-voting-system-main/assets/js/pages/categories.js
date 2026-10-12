import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount } from "../ui/dom.js";
import { categoryRow } from "../ui/poll-views.js";
import { listCategories } from "../data/polls.js";

const context = boot();

function renderCategories() {
  const categories = listCategories({ activeOnly: true });
  const target = document.querySelector("#category-index");
  if (categories.length === 0) {
    mount(
      target,
      el(
        "li",
        {},
        el("div", { class: "empty-state" }, el("h2", {}, "Todavía no hay categorías"), el("p", {}, "Cuando la organización las publique, aparecerán aquí.")),
      ),
    );
    return;
  }
  mount(target, categories.map(categoryRow));
}

if (context) {
  renderBreadcrumb([{ label: "Inicio", href: "index.html" }, { label: "Categorías" }]);
  renderCategories();
}

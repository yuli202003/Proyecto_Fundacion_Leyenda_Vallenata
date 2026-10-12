import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { el, mount } from "../ui/dom.js";
import { pageParams } from "../ui/forms.js";
import { pollRow } from "../ui/poll-views.js";
import { listCategories, listPolls, getCategory } from "../data/polls.js";

const context = boot();

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "upcoming", label: "Próximas" },
  { value: "closed", label: "Cerradas" },
];

function filtersFromUrl() {
  const params = pageParams();
  return { status: params.get("status") ?? "", categoryId: params.get("category") ?? "" };
}

function buildHref({ status, categoryId }) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (categoryId) params.set("category", categoryId);
  const query = params.toString();
  return query ? `polls.html?${query}` : "polls.html";
}

function renderFilters(filters) {
  const statusNav = el(
    "nav",
    { "aria-label": "Filtrar por estado" },
    el(
      "div",
      { class: "segmented" },
      STATUS_FILTERS.map((item) =>
        el(
          "a",
          {
            class: "segmented__item",
            href: buildHref({ ...filters, status: item.value }),
            "aria-current": item.value === filters.status ? "true" : undefined,
          },
          item.label,
        ),
      ),
    ),
  );

  const select = el(
    "select",
    {
      class: "input",
      id: "category-filter",
      onchange: (event) => location.assign(buildHref({ ...filters, categoryId: event.target.value })),
    },
    el("option", { value: "" }, "Todas las categorías"),
    listCategories({ activeOnly: true }).map((category) =>
      el("option", { value: category.id, selected: category.id === filters.categoryId }, category.name),
    ),
  );

  mount(
    document.querySelector("#poll-filters"),
    statusNav,
    el("div", { class: "field" }, el("label", { class: "field__label", for: "category-filter" }, "Categoría"), select),
  );
}

function renderList(filters) {
  const polls = listPolls({ status: filters.status || undefined, categoryId: filters.categoryId || undefined });
  const target = document.querySelector("#poll-list");
  const heading = document.querySelector("#poll-count");
  heading.textContent = polls.length === 1 ? "1 votación" : `${polls.length} votaciones`;

  if (polls.length === 0) {
    mount(
      target,
      el(
        "li",
        {},
        el(
          "div",
          { class: "empty-state" },
          el("h3", {}, "No hay votaciones con estos filtros"),
          el("p", {}, "Prueba con otro estado o con todas las categorías."),
          el("a", { class: "button button--outline", href: "polls.html" }, "Quitar filtros"),
        ),
      ),
    );
    return;
  }
  mount(target, polls.map((poll) => pollRow(poll)));
}

if (context) {
  const filters = filtersFromUrl();
  const category = filters.categoryId ? getCategory(filters.categoryId) : null;
  if (category) {
    const lead = document.querySelector("#page-lead");
    lead.textContent = `Categoría: ${category.name}`;
    lead.hidden = false;
  }
  renderBreadcrumb([
    { label: "Inicio", href: "index.html" },
    { label: "Votaciones", href: "polls.html" },
    ...(category ? [{ label: category.name }] : []),
  ]);
  renderFilters(filters);
  renderList(filters);
}

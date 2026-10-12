import { el } from "./dom.js";

export function dataTable({ caption, headers, rows }) {
  return el(
    "div",
    { class: "table-scroll" },
    el(
      "table",
      { class: "data-table data-table--stacked" },
      el("caption", { class: "visually-hidden" }, caption),
      el("thead", {}, el("tr", {}, headers.map((header) => el("th", { scope: "col" }, header)))),
      el(
        "tbody",
        {},
        rows.map((cells) => el("tr", {}, cells.map((cell, index) => el("td", { "data-label": headers[index] }, cell)))),
      ),
    ),
  );
}

export function adminHeading(title, lead, ...actions) {
  return el(
    "div",
    { class: "page-heading" },
    el("h1", {}, title),
    lead ? el("p", {}, lead) : null,
    actions.length ? el("div", { class: "cluster" }, actions) : null,
  );
}

export function pollSelector({ polls, selectedId, onChange, id = "poll-select" }) {
  const select = el(
    "select",
    { class: "input", id, onchange: (event) => onChange(event.target.value) },
    polls.map((poll) => el("option", { value: poll.id, selected: poll.id === selectedId }, poll.title)),
  );
  return el("div", { class: "field" }, el("label", { class: "field__label", for: id }, "Votación"), select);
}

import { el } from "./dom.js";
import { formatDateTime, relativeTime } from "./format.js";
import { STATUS_LABEL, pollStatus, getCategory, listOptions, listPolls, POLL_STATUS } from "../data/polls.js";

export function categoryRow(category) {
  const polls = listPolls({ categoryId: category.id });
  const open = polls.filter((poll) => pollStatus(poll) === POLL_STATUS.open).length;
  const total = polls.length === 1 ? "1 votación" : `${polls.length} votaciones`;
  const summary = open ? `${total}, ${open} ${open === 1 ? "abierta" : "abiertas"}` : total;
  return el(
    "li",
    {},
    el(
      "a",
      { class: "category-index__link", href: `polls.html?category=${category.id}` },
      el("span", { class: "category-index__name" }, category.name),
      el("span", { class: "category-index__summary" }, category.description),
      el("span", { class: "category-index__count" }, summary),
    ),
  );
}

const FLOW_STEPS = ["Elegir opción", "Confirmar", "Listo"];

export function pollTrail(poll, ...tail) {
  const category = getCategory(poll.categoryId);
  return [
    { label: "Inicio", href: "index.html" },
    { label: "Votaciones", href: "polls.html" },
    { label: category?.name ?? "Votación", href: `polls.html?category=${poll.categoryId}` },
    ...tail,
  ];
}

export function flowBanner(poll, { step }) {
  return el(
    "div",
    { class: "container" },
    el("h1", { class: "page-banner__title" }, poll.title),
    el(
      "ol",
      { class: "flow-progress", "aria-label": "Pasos para votar" },
      FLOW_STEPS.map((label, index) =>
        el("li", { class: "flow-progress__item", "aria-current": index + 1 === step ? "step" : undefined }, label),
      ),
    ),
  );
}

export function optionThumbnail(option) {
  if (!option.image) return null;
  return el("img", { class: "option-thumb", src: option.image, alt: `Imagen de ${option.name}`, width: "72", height: "72", loading: "lazy" });
}

export function statusBadge(status) {
  return el("span", { class: `status status--${status}` }, STATUS_LABEL[status]);
}

export function windowSummary(poll, now = Date.now()) {
  const status = pollStatus(poll, now);
  if (status === POLL_STATUS.open) return `Cierra ${relativeTime(poll.closesAt, now)}`;
  if (status === POLL_STATUS.upcoming) return `Abre ${relativeTime(poll.opensAt, now)}`;
  if (status === POLL_STATUS.closed) return `Cerró el ${formatDateTime(poll.closesAt)}`;
  return "Sin publicar";
}

export function pollRow(poll, { root = "./" } = {}) {
  const status = pollStatus(poll);
  const category = getCategory(poll.categoryId);
  const optionCount = listOptions(poll.id).length;
  const actionLabel = { open: "Votar", upcoming: "Ver detalle", closed: "Ver resultados", draft: "Ver detalle" }[status];
  const target = status === POLL_STATUS.closed ? `${root}result.html?id=${poll.id}` : `${root}poll.html?id=${poll.id}`;

  return el(
    "li",
    { class: "row-list__item" },
    el(
      "div",
      { class: "stack stack--tight" },
      el("h3", { class: "row-list__title" }, el("a", { href: `${root}poll.html?id=${poll.id}` }, poll.title)),
      el(
        "div",
        { class: "row-list__meta" },
        statusBadge(status),
        el("span", { class: "meta-item" }, category?.name ?? "Sin categoría"),
        el("span", { class: "meta-item" }, windowSummary(poll)),
        el("span", { class: "meta-item" }, `${optionCount} opciones`),
      ),
    ),
    el(
      "a",
      {
        class: status === POLL_STATUS.open ? "button row-list__action" : "button button--outline row-list__action",
        href: target,
      },
      actionLabel,
      el("span", { class: "visually-hidden" }, `: ${poll.title}`),
    ),
  );
}

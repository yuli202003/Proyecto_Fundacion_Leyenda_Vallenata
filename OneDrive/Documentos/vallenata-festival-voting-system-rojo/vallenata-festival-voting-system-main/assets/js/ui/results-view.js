import { el } from "./dom.js";
import { formatCount, formatPercent, votesLabel } from "./format.js";
import { tally } from "../data/polls.js";

export function renderResults(pollId) {
  const { total, voided, rows } = tally(pollId);
  const list = el(
    "ol",
    { class: "result-list" },
    rows.map((row) =>
      el(
        "li",
        { class: "result-list__row" },
        el(
          "div",
          { class: "result-list__head" },
          el("span", { class: "result-list__name" }, row.option.name),
          el("span", { class: "result-list__figure" }, `${votesLabel(row.count)} (${formatPercent(row.share)})`),
        ),
        el(
          "div",
          {
            class: row.leading ? "result-bar result-bar--leading" : "result-bar",
            role: "img",
            "aria-label": `${row.option.name}: ${formatPercent(row.share)} de los votos`,
          },
          el("div", { class: "result-bar__fill", style: "--value: 0", "data-value": row.share.toFixed(2) }),
        ),
      ),
    ),
  );

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      list.querySelectorAll(".result-bar__fill").forEach((fill) => {
        fill.style.setProperty("--value", fill.dataset.value);
      });
    }),
  );

  const footer = el(
    "p",
    { class: "field__hint" },
    `${formatCount(total)} votos válidos`,
    voided > 0 ? `, ${formatCount(voided)} anulados` : "",
    ".",
  );
  return el("div", { class: "stack" }, list, footer);
}

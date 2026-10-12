import { boot } from "../ui/chrome.js";
import { el, mount, showToast, notice } from "../ui/dom.js";
import { confirmDialog, formDialog } from "../ui/forms.js";
import { formatIsoRange } from "../ui/format.js";
import { adminHeading } from "../ui/tables.js";
import { getState } from "../data/storage.js";
import { currentEdition, listCategories, listPolls, pollStatus, POLL_STATUS } from "../data/polls.js";
import {
  saveEdition, setCurrentEdition, saveCategory, toggleCategory, moveCategory, deleteCategory,
} from "../data/admin.js";

const context = boot({ requires: "admin" });
const actor = context?.user;

function editionFields(edition) {
  return [
    { id: "edition-year", name: "year", label: "Año", type: "number", value: edition?.year ?? new Date().getFullYear() + 1, min: 2000, max: 2100 },
    { id: "edition-name", name: "name", label: "Nombre de la edición", value: edition?.name ?? "", hint: "Por ejemplo, 61 Festival de la Leyenda Vallenata." },
    { id: "edition-start", name: "startsOn", label: "Fecha de inicio", type: "date", value: edition?.startsOn ?? "" },
    { id: "edition-end", name: "endsOn", label: "Fecha de fin", type: "date", value: edition?.endsOn ?? "" },
    { id: "edition-current", name: "current", label: "Definir como edición vigente", type: "checkbox", value: edition?.current ?? false },
  ];
}

async function openEditionForm(edition) {
  const saved = await formDialog({
    title: edition ? "Editar edición" : "Nueva edición",
    fields: editionFields(edition),
    onSubmit: (values) => saveEdition({ ...values, id: edition?.id }, actor),
  });
  if (saved) {
    showToast(edition ? "Edición actualizada." : "Edición creada.");
    render();
  }
}

async function openCategoryForm(category) {
  const saved = await formDialog({
    title: category ? "Editar categoría" : "Nueva categoría",
    fields: [
      { id: "category-name", name: "name", label: "Nombre", value: category?.name ?? "" },
      { id: "category-description", name: "description", label: "Descripción", type: "textarea", required: false, value: category?.description ?? "", hint: "Una frase que ayude al votante a entender el tema." },
    ],
    onSubmit: (values) => saveCategory({ ...values, id: category?.id }, actor),
  });
  if (saved) {
    showToast(category ? "Categoría actualizada." : "Categoría creada.");
    render();
  }
}

async function switchCategory(category) {
  const openPolls = listPolls({ categoryId: category.id, includeDrafts: true }).filter((poll) => pollStatus(poll) === POLL_STATUS.open);
  if (category.active && openPolls.length > 0) {
    const confirmed = await confirmDialog({
      title: "Desactivar categoría",
      message: `La categoría "${category.name}" tiene ${openPolls.length === 1 ? "1 votación abierta" : `${openPolls.length} votaciones abiertas`}. Si la desactivas, dejará de mostrarse al público y nadie podrá votar en ella hasta que la vuelvas a activar.`,
      confirmLabel: "Desactivar categoría",
      danger: true,
    });
    if (!confirmed) return;
  }
  toggleCategory(category.id, actor);
  showToast(category.active ? "Categoría activada." : "Categoría desactivada.");
  render();
}

async function removeCategory(category) {
  const confirmed = await confirmDialog({
    title: "Eliminar categoría",
    message: `Vas a eliminar la categoría "${category.name}". Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar categoría",
    danger: true,
  });
  if (!confirmed) return;
  const result = deleteCategory(category.id, actor);
  showToast(result.ok ? "Categoría eliminada." : result.error, result.ok ? "default" : "danger");
  render();
}

function editionSection() {
  const current = currentEdition();
  const others = getState().editions.filter((edition) => edition.id !== current?.id);
  return el(
    "section",
    { class: "admin-section stack", "aria-labelledby": "edition-title" },
    el("h2", { id: "edition-title" }, "Edición vigente"),
    current
      ? el(
          "div",
          { class: "stack" },
          el("p", { class: "row-list__title" }, current.name),
          el("p", { class: "field__hint" }, `Valledupar, ${formatIsoRange(current.startsOn, current.endsOn)}`),
          el(
            "div",
            { class: "cluster" },
            el("button", { class: "button button--outline button--small", type: "button", onclick: () => openEditionForm(current) }, "Editar edición"),
            el("button", { class: "button button--outline button--small", type: "button", onclick: () => openEditionForm(null) }, "Nueva edición"),
          ),
        )
      : notice("warning", "No hay una edición vigente. Crea una para publicar categorías y votaciones."),
    others.length
      ? el(
          "ul",
          { class: "row-list" },
          others.map((edition) =>
            el(
              "li",
              { class: "row-list__item" },
              el("div", {}, el("p", { class: "row-list__title" }, edition.name), el("p", { class: "field__hint" }, formatIsoRange(edition.startsOn, edition.endsOn))),
              el(
                "div",
                { class: "cluster" },
                el("button", { class: "button button--outline button--small", type: "button", onclick: () => openEditionForm(edition) }, "Editar"),
                el(
                  "button",
                  {
                    class: "button button--outline button--small",
                    type: "button",
                    onclick: () => {
                      setCurrentEdition(edition.id, actor);
                      showToast("Edición vigente actualizada.");
                      render();
                    },
                  },
                  "Definir como vigente",
                ),
              ),
            ),
          ),
        )
      : null,
  );
}

function categoryRow(category, index, total) {
  const pollCount = listPolls({ categoryId: category.id, includeDrafts: true }).length;
  return el(
    "li",
    { class: "options-admin-list__item" },
    el(
      "div",
      { class: "stack stack--tight" },
      el("p", { class: "options-admin-list__name" }, category.name),
      el("p", { class: "options-admin-list__description" }, category.description || "Sin descripción."),
      el(
        "div",
        { class: "row-list__meta" },
        el("span", { class: category.active ? "status status--open" : "status status--draft" }, category.active ? "Activa" : "Inactiva"),
        el("span", {}, pollCount === 1 ? "1 votación" : `${pollCount} votaciones`),
      ),
    ),
    el(
      "div",
      { class: "data-table__actions" },
      el("button", { class: "button button--outline button--small", type: "button", disabled: index === 0, "aria-label": `Subir ${category.name}`, onclick: () => { moveCategory(category.id, -1); render(); } }, "Subir"),
      el("button", { class: "button button--outline button--small", type: "button", disabled: index === total - 1, "aria-label": `Bajar ${category.name}`, onclick: () => { moveCategory(category.id, 1); render(); } }, "Bajar"),
      el("button", { class: "button button--outline button--small", type: "button", onclick: () => openCategoryForm(category) }, "Editar"),
      el("button", { class: "button button--outline button--small", type: "button", onclick: () => switchCategory(category) }, category.active ? "Desactivar" : "Activar"),
      el("button", { class: "button button--danger button--small", type: "button", "aria-label": `Eliminar ${category.name}`, onclick: () => removeCategory(category) }, "Eliminar"),
    ),
  );
}

function categorySection() {
  const edition = currentEdition();
  const categories = listCategories();
  return el(
    "section",
    { class: "admin-section stack", "aria-labelledby": "categories-title" },
    el(
      "div",
      { class: "section-heading" },
      el("h2", { id: "categories-title" }, edition ? "Categorías de la edición vigente" : "Categorías"),
      edition ? el("button", { class: "button button--small", type: "button", onclick: () => openCategoryForm(null) }, "Nueva categoría") : null,
    ),
    categories.length
      ? el("ul", { class: "options-admin-list" }, categories.map((category, index) => categoryRow(category, index, categories.length)))
      : el(
          "div",
          { class: "empty-state" },
          el("h3", {}, "Esta edición no tiene categorías"),
          el("p", {}, "Crea una categoría para agrupar las votaciones por tema."),
        ),
  );
}

function render() {
  mount(
    document.querySelector("#admin-content"),
    adminHeading("Ediciones y categorías"),
    editionSection(),
    categorySection(),
  );
}

if (context) render();

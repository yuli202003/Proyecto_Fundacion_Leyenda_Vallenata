import { boot } from "../ui/chrome.js";
import { el, mount, showToast, notice } from "../ui/dom.js";
import { confirmDialog, formDialog, pageParams } from "../ui/forms.js";
import { IMAGE_ACCEPT, prepareOptionImage } from "../ui/images.js";
import { optionThumbnail, statusBadge } from "../ui/poll-views.js";
import { adminHeading, pollSelector } from "../ui/tables.js";
import { getPoll, listOptions, listPolls, pollStatus } from "../data/polls.js";
import { saveOption, deleteOption, moveOption, pollHasVotes } from "../data/admin.js";

const context = boot({ requires: "admin" });
const actor = context?.user;
const MIN_OPTIONS_TO_PUBLISH = 2;

let selectedPollId = pageParams().get("poll") ?? listPolls({ includeDrafts: true })[0]?.id ?? null;

async function openOptionForm(poll, option) {
  const hasVotes = Boolean(option) && pollHasVotes(poll.id);
  const saved = await formDialog({
    title: option ? "Editar opción" : "Nueva opción",
    description: hasVotes ? "Esta votación ya tiene votos. El nombre queda bloqueado para no cambiar lo que votaron las personas." : undefined,
    fields: [
      { id: "option-name", name: "name", label: "Nombre", value: option?.name ?? "" },
      { id: "option-detail", name: "detail", label: "Dato corto", required: false, value: option?.detail ?? "", hint: "Por ejemplo, el aire musical o la agrupación." },
      { id: "option-description", name: "description", label: "Descripción", type: "textarea", required: false, value: option?.description ?? "" },
      {
        id: "option-image",
        name: "image",
        label: "Imagen (opcional)",
        type: "file",
        accept: IMAGE_ACCEPT,
        required: false,
        hint: option?.image ? "JPG, PNG o WebP de hasta 2 MB. Si no eliges otra, se conserva la actual." : "JPG, PNG o WebP de hasta 2 MB.",
      },
      option?.image ? { id: "option-remove-image", name: "removeImage", label: "Quitar la imagen actual", type: "checkbox", value: false } : null,
    ].filter(Boolean),
    onSubmit: async (values) => {
      let image = "";
      if (values.image) {
        const prepared = await prepareOptionImage(values.image);
        if (!prepared.ok) return { ok: false, errors: { image: prepared.error } };
        image = prepared.dataUrl;
      }
      return saveOption({ ...values, image, id: option?.id, pollId: poll.id }, actor);
    },
  });
  if (saved) {
    showToast(option ? "Opción actualizada." : "Opción agregada.");
    render();
  }
}

async function removeOption(option) {
  const confirmed = await confirmDialog({
    title: "Retirar opción",
    message: `Vas a retirar "${option.name}" de la votación.`,
    confirmLabel: "Retirar opción",
    danger: true,
  });
  if (!confirmed) return;
  const result = deleteOption(option.id, actor);
  showToast(result.ok ? "Opción retirada." : result.error, result.ok ? "default" : "danger");
  render();
}

function optionRow(poll, option, index, total) {
  return el(
    "li",
    { class: "options-admin-list__item" },
    el(
      "div",
      { class: "options-admin-list__lead" },
      optionThumbnail(option),
      el(
        "div",
        { class: "stack stack--tight" },
        el("p", { class: "options-admin-list__name" }, option.name),
        el("p", { class: "options-admin-list__description" }, [option.detail, option.description].filter(Boolean).join(". ")),
      ),
    ),
    el(
      "div",
      { class: "data-table__actions" },
      el("button", { class: "button button--outline button--small", type: "button", disabled: index === 0, "aria-label": `Subir ${option.name}`, onclick: () => { moveOption(option.id, -1); render(); } }, "Subir"),
      el("button", { class: "button button--outline button--small", type: "button", disabled: index === total - 1, "aria-label": `Bajar ${option.name}`, onclick: () => { moveOption(option.id, 1); render(); } }, "Bajar"),
      el("button", { class: "button button--outline button--small", type: "button", onclick: () => openOptionForm(poll, option) }, "Editar"),
      el("button", { class: "button button--danger button--small", type: "button", "aria-label": `Retirar ${option.name}`, onclick: () => removeOption(option) }, "Retirar"),
    ),
  );
}

function render() {
  const polls = listPolls({ includeDrafts: true });
  const target = document.querySelector("#admin-content");
  if (polls.length === 0) {
    mount(
      target,
      adminHeading("Opciones"),
      el("div", { class: "empty-state" }, el("h2", {}, "Primero crea una votación"), el("p", {}, "Cada opción pertenece a una votación."), el("a", { class: "button", href: "polls.html?new=1" }, "Crear votación")),
    );
    return;
  }
  const poll = getPoll(selectedPollId) ?? polls[0];
  selectedPollId = poll.id;
  const options = listOptions(poll.id);
  const missing = Math.max(MIN_OPTIONS_TO_PUBLISH - options.length, 0);

  mount(
    target,
    adminHeading("Opciones"),
    el(
      "div",
      { class: "toolbar" },
      pollSelector({
        polls,
        selectedId: poll.id,
        onChange: (value) => {
          selectedPollId = value;
          render();
        },
      }),
      el("button", { class: "button", type: "button", onclick: () => openOptionForm(poll, null) }, "Agregar opción"),
    ),
    el("div", { class: "status-line" }, statusBadge(pollStatus(poll)), el("span", { class: "field__hint" }, options.length === 1 ? "1 opción" : `${options.length} opciones`)),
    pollHasVotes(poll.id) ? notice("info", el("p", {}, "Esta votación ya tiene votos. Las opciones con votos no se pueden retirar ni cambiar de nombre.")) : null,
    missing > 0 ? notice("warning", el("p", {}, `Faltan ${missing} ${missing === 1 ? "opción" : "opciones"} para poder publicar esta votación.`)) : null,
    options.length
      ? el("ol", { class: "options-admin-list" }, options.map((option, index) => optionRow(poll, option, index, options.length)))
      : el("div", { class: "empty-state" }, el("h2", {}, "Esta votación no tiene opciones"), el("p", {}, "Agrega al menos dos opciones para poder publicarla.")),
  );
}

if (context) render();

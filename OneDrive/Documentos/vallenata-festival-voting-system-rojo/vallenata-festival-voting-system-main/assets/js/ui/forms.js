import { el } from "./dom.js";

function describedBy(id, hasHint) {
  return hasHint ? `${id}-hint ${id}-error` : `${id}-error`;
}

function buildControl(definition) {
  const { id, name, type = "text", value = "", options, required = true, autocomplete, rows, min, max, step, disabled, accept } = definition;
  const base = { id, name, "aria-describedby": describedBy(id, Boolean(definition.hint)) };

  if (type === "select") {
    return el(
      "select",
      { ...base, class: "input", required, disabled },
      options.map((option) => el("option", { value: option.value, selected: String(option.value) === String(value) }, option.label)),
    );
  }
  if (type === "textarea") {
    return el("textarea", { ...base, class: "input", rows: rows ?? 3, required, disabled }, value);
  }
  if (type === "file") {
    const fileName = el("span", { class: "file-picker__name" }, "Ningún archivo elegido");
    const input = el("input", {
      ...base,
      class: "file-picker__input visually-hidden",
      type,
      accept,
      required,
      disabled,
      onchange: () => {
        fileName.textContent = input.files[0]?.name ?? "Ningún archivo elegido";
      },
    });
    return el(
      "div",
      { class: "file-picker" },
      input,
      el("label", { class: "button button--outline button--small file-picker__button", for: id }, "Elegir archivo"),
      fileName,
    );
  }
  return el("input", { ...base, class: "input", type, value, required, autocomplete, min, max, step, disabled });
}

export function buildField(definition) {
  const { id, label, hint, type } = definition;
  const error = el("p", { class: "field__error", id: `${id}-error`, hidden: true });

  if (type === "checkbox") {
    return el(
      "div",
      { class: "field", "data-field": definition.name },
      el(
        "label",
        { class: "check", for: id },
        el("input", {
          id,
          name: definition.name,
          type: "checkbox",
          checked: Boolean(definition.value),
          "aria-describedby": describedBy(id, Boolean(hint)),
        }),
        el("span", {}, label),
      ),
      hint ? el("p", { class: "field__hint", id: `${id}-hint` }, hint) : null,
      error,
    );
  }

  return el(
    "div",
    { class: "field", "data-field": definition.name },
    el("label", { class: "field__label", for: id }, label),
    buildControl(definition),
    hint ? el("p", { class: "field__hint", id: `${id}-hint` }, hint) : null,
    error,
  );
}

export function readForm(form) {
  const values = {};
  for (const control of form.elements) {
    if (!control.name) continue;
    if (control.type === "checkbox") values[control.name] = control.checked;
    else if (control.type === "file") values[control.name] = control.files[0] ?? null;
    else values[control.name] = control.value;
  }
  return values;
}

export function clearErrors(form) {
  form.querySelectorAll("[aria-invalid]").forEach((control) => control.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field__error").forEach((message) => {
    message.hidden = true;
    message.textContent = "";
  });
}

export function showErrors(form, errors) {
  let firstInvalid = null;
  for (const [name, message] of Object.entries(errors)) {
    const wrapper = form.querySelector(`[data-field="${name}"]`);
    if (!wrapper) continue;
    const control = wrapper.querySelector("input, select, textarea");
    const target = wrapper.querySelector(".field__error");
    control?.setAttribute("aria-invalid", "true");
    target.textContent = message;
    target.hidden = false;
    firstInvalid ??= control;
  }
  firstInvalid?.focus();
}

export function formDialog({ title, description, submitLabel = "Guardar", fields, onSubmit }) {
  return new Promise((resolve) => {
    const titleId = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
    let saved = null;
    const dialog = el("dialog", { class: "dialog", "aria-labelledby": titleId });
    const form = el(
      "form",
      { class: "dialog__body", novalidate: true },
      el("h2", { id: titleId }, title),
      description ? el("p", { class: "field__hint" }, description) : null,
      fields.map(buildField),
      el(
        "div",
        { class: "form-actions" },
        el("button", { class: "button", type: "submit" }, submitLabel),
        el("button", { class: "button button--outline", type: "button", onclick: () => dialog.close() }, "Cancelar"),
      ),
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);
      const result = await onSubmit(readForm(form));
      if (result.ok) {
        saved = result.value ?? true;
        dialog.close();
        return;
      }
      showErrors(form, result.errors);
    });

    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(saved);
    });

    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function confirmDialog({ title, message, confirmLabel = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    const titleId = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
    let confirmed = false;
    const dialog = el("dialog", { class: "dialog", "aria-labelledby": titleId });
    dialog.append(
      el(
        "div",
        { class: "dialog__body" },
        el("h2", { id: titleId }, title),
        el("p", {}, message),
        el(
          "div",
          { class: "form-actions" },
          el(
            "button",
            {
              class: danger ? "button button--danger" : "button",
              type: "button",
              onclick: () => {
                confirmed = true;
                dialog.close();
              },
            },
            confirmLabel,
          ),
          el("button", { class: "button button--outline", type: "button", onclick: () => dialog.close() }, "Cancelar"),
        ),
      ),
    );
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(confirmed);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function pageParams() {
  return new URLSearchParams(location.search);
}

export function safeNextPath(candidate) {
  return /^(admin\/)?[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(candidate ?? "") ? candidate : null;
}

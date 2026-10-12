const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_PATHS = {
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
};

export function icon(name, extraClass = "") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `icon ${extraClass}`.trim());
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const definition of ICON_PATHS[name] ?? []) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", definition);
    svg.append(path);
  }
  return svg;
}

export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === "class") node.className = value;
    else if (name.startsWith("on") && typeof value === "function") node.addEventListener(name.slice(2), value);
    else if (value === true) node.setAttribute(name, "");
    else node.setAttribute(name, value);
  }
  node.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

export function mount(target, ...children) {
  target.replaceChildren(...children.flat().filter(Boolean));
}

const TOAST_DURATION_MS = 4500;

function toastRegion() {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = el("div", { class: "toast-region", role: "status", "aria-live": "polite" });
    document.body.append(region);
  }
  return region;
}

export function showToast(message, tone = "default") {
  const toast = el("div", { class: tone === "danger" ? "toast toast--danger" : "toast" }, message);
  toastRegion().append(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}

export function notice(tone, ...content) {
  return el(
    "div",
    { class: tone === "info" ? "notice" : `notice notice--${tone}`, role: tone === "danger" ? "alert" : undefined },
    ...content,
  );
}

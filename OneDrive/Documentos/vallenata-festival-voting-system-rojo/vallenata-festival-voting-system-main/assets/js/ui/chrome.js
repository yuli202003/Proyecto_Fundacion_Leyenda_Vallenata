import { el, icon } from "./dom.js";
import { currentUser, signOut } from "../data/auth.js";
import { resetDemoData } from "../data/storage.js";

const PUBLIC_LINKS = [
  { key: "home", label: "Inicio", href: "index.html" },
  { key: "categories", label: "Categorías", href: "categories.html" },
  { key: "polls", label: "Votaciones", href: "polls.html" },
];

const ADMIN_LINKS = [
  { key: "dashboard", label: "Panel", href: "dashboard.html" },
  { key: "categories", label: "Ediciones y categorías", href: "categories.html" },
  { key: "polls", label: "Votaciones", href: "polls.html" },
  { key: "options", label: "Opciones", href: "options.html" },
  { key: "results", label: "Resultados", href: "results.html" },
];

function navLink(link, root, activeKey) {
  return el(
    "li",
    {},
    el(
      "a",
      { class: "site-nav__link", href: `${root}${link.href}`, "aria-current": link.key === activeKey ? "page" : undefined },
      link.label,
    ),
  );
}

function accountItems(user, root) {
  if (user) {
    const items = [];
    if (user.role === "admin") {
      items.push(el("li", {}, el("a", { class: "site-nav__link", href: `${root}admin/dashboard.html` }, "Administración")));
    }
    items.push(
      el(
        "li",
        {},
        el(
          "button",
          {
            class: "site-nav__button",
            type: "button",
            onclick: () => {
              signOut();
              location.assign(`${root}index.html`);
            },
          },
          `Salir (${user.name.split(" ")[0]})`,
        ),
      ),
    );
    return items;
  }
  return [
    el("li", {}, el("a", { class: "site-nav__link", href: `${root}sign-in.html` }, "Ingresar")),
    el("li", {}, el("a", { class: "site-nav__link", href: `${root}sign-up.html` }, "Crear cuenta")),
  ];
}

function buildHeader({ user, root, page }) {
  const navId = "site-nav";
  const nav = el(
    "nav",
    { class: "site-nav", id: navId, "aria-label": "Principal", "data-open": "false" },
    el(
      "ul",
      { class: "site-nav__list container" },
      PUBLIC_LINKS.map((link) => navLink(link, root, page)),
      accountItems(user, root),
    ),
  );
  const toggle = el(
    "button",
    { class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": navId },
    icon("menu"),
    el("span", { class: "visually-hidden" }, "Abrir menú"),
  );
  toggle.addEventListener("click", () => {
    const isOpen = nav.dataset.open === "true";
    nav.dataset.open = String(!isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.dataset.open === "true") {
      nav.dataset.open = "false";
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  return el(
    "div",
    {},
    el("a", { class: "skip-link", href: "#main" }, "Saltar al contenido"),
    el(
      "aside",
      { class: "prototype-ribbon", "aria-label": "Aviso sobre el prototipo" },
      el(
        "div",
        { class: "container" },
        el("strong", {}, "Proyecto académico en equipo"),
        " del curso Desarrollo Web, Areandina. Datos de ejemplo.",
      ),
    ),
    el(
      "header",
      { class: "site-header" },
      el(
        "div",
        { class: "container site-header__bar" },
        el(
          "a",
          { class: "brand", href: `${root}index.html` },
          el("img", {
            class: "brand__logo",
            src: `${root}assets/img/brand/logo-on-dark.svg`,
            width: "371",
            height: "62",
            alt: "Leyenda Vallenata, votaciones del público. Ir al inicio",
          }),
        ),
        toggle,
        nav,
      ),
    ),
  );
}

function buildConsole({ user, root, page }) {
  const sidebarId = "console-sidebar";
  const logo = () =>
    el("img", {
      src: `${root}assets/img/brand/logo-on-dark.svg`,
      width: "371",
      height: "62",
      alt: "Leyenda Vallenata, votaciones del público",
    });

  const sidebar = el(
    "aside",
    { class: "console-sidebar", id: sidebarId, "data-open": "false", "aria-label": "Administración" },
    el("a", { class: "console-brand", href: `${root}admin/dashboard.html` }, logo()),
    el(
      "nav",
      { "aria-label": "Secciones de administración" },
      el(
        "ul",
        { class: "console-nav" },
        ADMIN_LINKS.map((link) =>
          el(
            "li",
            {},
            el("a", { class: "console-nav__link", href: link.href, "aria-current": link.key === page ? "page" : undefined }, link.label),
          ),
        ),
      ),
    ),
    el(
      "div",
      { class: "console-account" },
      el("p", { class: "console-account__name" }, user.name),
      el("p", { class: "console-account__role" }, "Administrador"),
      el("a", { class: "console-link", href: `${root}index.html` }, "Ver sitio público"),
      el(
        "button",
        {
          class: "console-link",
          type: "button",
          onclick: () => {
            signOut();
            location.assign(`${root}index.html`);
          },
        },
        "Cerrar sesión",
      ),
      el("p", { class: "console-note" }, "Proyecto académico en equipo, Desarrollo Web, Areandina. Datos de ejemplo."),
    ),
  );

  const scrim = el("div", { class: "console-scrim", hidden: true });
  const toggle = el(
    "button",
    { class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": sidebarId },
    icon("menu"),
    el("span", { class: "visually-hidden" }, "Abrir menú"),
  );

  const setOpen = (isOpen) => {
    sidebar.dataset.open = String(isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    scrim.hidden = !isOpen;
  };
  toggle.addEventListener("click", () => setOpen(sidebar.dataset.open !== "true"));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.dataset.open === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  return el(
    "div",
    {},
    el("a", { class: "skip-link", href: "#main" }, "Saltar al contenido"),
    el("header", { class: "console-topbar" }, logo(), toggle),
    scrim,
    sidebar,
  );
}

function buildFooter(root) {
  const column = (title, ...content) => el("div", {}, el("h2", { class: "site-footer__heading" }, title), ...content);
  return el(
    "footer",
    { class: "site-footer" },
    el(
      "div",
      { class: "container site-footer__grid" },
      column(
        "Votaciones del Festival",
        el("p", {}, "Prototipo de la Entrega 1 de Desarrollo Web, Fundación Universitaria del Área Andina."),
        el("p", {}, el("a", { href: "https://festivalvallenato.com", rel: "noopener" }, "Ir al sitio oficial del Festival")),
      ),
      el(
        "nav",
        { "aria-label": "Secundaria" },
        el("h2", { class: "site-footer__heading" }, "Navegación"),
        el(
          "ul",
          { class: "site-footer__links" },
          PUBLIC_LINKS.map((link) => el("li", {}, el("a", { href: `${root}${link.href}` }, link.label))),
        ),
      ),
      column(
        "Probar el prototipo",
        el(
          "div",
          { class: "site-footer__links" },
          el("a", { href: `${root}sign-in.html` }, "Cuentas de demostración"),
          el("a", { href: `${root}admin/dashboard.html` }, "Administración"),
          el(
            "button",
            {
              type: "button",
              onclick: () => {
                resetDemoData();
                location.assign(`${root}index.html`);
              },
            },
            "Restablecer datos de ejemplo",
          ),
        ),
      ),
    ),
    el(
      "div",
      { class: "site-footer__bottom" },
      el("div", { class: "container" }, "2026. Proyecto académico en equipo, grupo ", el("span", { class: "nowrap" }, "202660-6A-62"), "."),
    ),
  );
}

export function renderBreadcrumb(items) {
  const anchor = document.querySelector("main > .page-banner, main > .hero");
  if (!anchor) return;
  document.querySelector(".breadcrumb-band")?.remove();
  anchor.after(
    el(
      "nav",
      { class: "breadcrumb-band", "aria-label": "Ruta de navegación" },
      el(
        "ol",
        { class: "container breadcrumb" },
        items.map((item, index) =>
          el(
            "li",
            {},
            item.href && index < items.length - 1
              ? el("a", { href: item.href }, item.label)
              : el("span", { "aria-current": "page" }, item.label),
          ),
        ),
      ),
    ),
  );
}

function redirectToSignIn(root, area, reason) {
  const file = location.pathname.split("/").pop() || "index.html";
  const next = `${area === "admin" ? "admin/" : ""}${file}${location.search}`;
  const query = new URLSearchParams({ next });
  if (reason) query.set("reason", reason);
  location.replace(`${root}sign-in.html?${query}`);
}

export function boot({ requires } = {}) {
  const { root = "./", area = "public", page = "" } = document.body.dataset;
  const user = currentUser();
  if (requires === "user" && !user) {
    redirectToSignIn(root, area);
    return null;
  }
  if (requires === "admin" && user?.role !== "admin") {
    redirectToSignIn(root, area, user ? "admin" : undefined);
    return null;
  }
  if (area === "admin") {
    document.querySelector("[data-slot='header']")?.replaceWith(buildConsole({ user, root, page }));
  } else {
    document.querySelector("[data-slot='header']")?.replaceWith(buildHeader({ user, root, page }));
    document.querySelector("[data-slot='footer']")?.replaceWith(buildFooter(root));
  }
  return { user, root };
}

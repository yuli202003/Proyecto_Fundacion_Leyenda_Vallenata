import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { clearErrors, readForm, showErrors, safeNextPath, pageParams } from "../ui/forms.js";
import { mount, notice } from "../ui/dom.js";
import { signIn } from "../data/auth.js";

const context = boot();
if (context) renderBreadcrumb([{ label: "Inicio", href: "index.html" }, { label: "Ingresar" }]);
const params = pageParams();
const next = safeNextPath(params.get("next"));

if (context?.user && params.get("reason") !== "admin") {
  location.replace(next ?? "categories.html");
}

const form = document.querySelector("#sign-in-form");
const alertSlot = document.querySelector("#form-alert");

if (params.get("reason") === "admin") {
  mount(alertSlot, notice("warning", "Esta sección es solo para administración. Ingresa con una cuenta de administración para continuar."));
}

if (params.get("registered")) {
  form.elements.email.value = params.get("registered");
  mount(alertSlot, notice("success", "Cuenta creada. Ingresa con tu correo y tu contraseña para votar."));
}

function enter(user) {
  const isAdmin = user.role === "admin";
  const fallback = isAdmin ? "admin/dashboard.html" : "categories.html";
  const canFollowNext = next && (isAdmin || !next.startsWith("admin/"));
  location.assign(canFollowNext ? next : fallback);
}

document.querySelectorAll("[data-demo-account]").forEach((button) => {
  button.addEventListener("click", async () => {
    const result = await signIn(button.dataset.email, button.dataset.password);
    if (result.ok) enter(result.user);
    else mount(alertSlot, notice("danger", result.error));
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors(form);
  const { email, password } = readForm(form);
  const errors = {};
  if (!email.trim()) errors.email = "Escribe tu correo.";
  if (!password) errors.password = "Escribe tu contraseña.";
  if (Object.keys(errors).length > 0) {
    showErrors(form, errors);
    return;
  }
  const result = await signIn(email, password);
  if (!result.ok) {
    mount(alertSlot, notice("danger", result.error));
    return;
  }
  enter(result.user);
});

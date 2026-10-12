import { boot, renderBreadcrumb } from "../ui/chrome.js";
import { clearErrors, readForm, showErrors, safeNextPath, pageParams } from "../ui/forms.js";
import { registerUser } from "../data/auth.js";

const context = boot();
if (context) renderBreadcrumb([{ label: "Inicio", href: "index.html" }, { label: "Crear cuenta" }]);

if (context?.user) {
  location.replace("categories.html");
}

const form = document.querySelector("#sign-up-form");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors(form);
  const result = await registerUser(readForm(form));
  if (!result.ok) {
    showErrors(form, result.errors);
    return;
  }
  const query = new URLSearchParams({ registered: result.user.email });
  const next = safeNextPath(pageParams().get("next"));
  if (next) query.set("next", next);
  location.assign(`sign-in.html?${query}`);
});

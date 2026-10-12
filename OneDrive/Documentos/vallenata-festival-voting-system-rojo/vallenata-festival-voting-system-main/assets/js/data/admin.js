import { getState, persist, newId, logAudit } from "./storage.js";
import { currentEdition, getPoll, listOptions, listVotes, pollStatus, POLL_STATUS } from "./polls.js";

const MIN_OPTIONS_TO_PUBLISH = 2;
const MAX_VOTES_PER_VOTER = 10;

function failure(errors) {
  return { ok: false, errors };
}

function success(value) {
  return { ok: true, value };
}

export function saveEdition(input, actor) {
  const errors = {};
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.year = "Escribe un año entre 2000 y 2100.";
  if (input.name.trim().length < 3) errors.name = "Escribe el nombre de la edición, con al menos 3 caracteres.";
  if (!input.startsOn) errors.startsOn = "Elige la fecha de inicio.";
  if (!input.endsOn) errors.endsOn = "Elige la fecha de fin.";
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) errors.endsOn = "La fecha de fin no puede ser anterior a la de inicio.";
  if (Object.keys(errors).length > 0) return failure(errors);

  const state = getState();
  const isNew = !input.id;
  const edition = isNew ? { id: newId("edition"), current: false } : state.editions.find((item) => item.id === input.id);
  Object.assign(edition, { year, name: input.name.trim(), startsOn: input.startsOn, endsOn: input.endsOn });
  if (isNew) state.editions.push(edition);
  if (input.current) setCurrentEdition(edition.id, actor, false);
  logAudit(actor.name, isNew ? "Creó la edición" : "Editó la edición", edition.name);
  persist();
  return success(edition);
}

export function setCurrentEdition(editionId, actor, shouldLog = true) {
  const { editions } = getState();
  editions.forEach((edition) => {
    edition.current = edition.id === editionId;
  });
  if (shouldLog) {
    const edition = editions.find((item) => item.id === editionId);
    logAudit(actor.name, "Definió la edición vigente", edition?.name ?? "");
    persist();
  }
}

export function saveCategory(input, actor) {
  const errors = {};
  const name = input.name.trim();
  const edition = currentEdition();
  const { categories } = getState();
  if (name.length < 2) errors.name = "Escribe el nombre de la categoría, con al menos 2 caracteres.";
  const duplicated = categories.some(
    (category) => category.editionId === edition.id && category.id !== input.id && category.name.toLowerCase() === name.toLowerCase(),
  );
  if (!errors.name && duplicated) errors.name = "Ya existe una categoría con este nombre en la edición.";
  if (Object.keys(errors).length > 0) return failure(errors);

  const isNew = !input.id;
  const category = isNew
    ? { id: newId("cat"), editionId: edition.id, order: categories.filter((item) => item.editionId === edition.id).length + 1, active: true }
    : categories.find((item) => item.id === input.id);
  Object.assign(category, { name, description: input.description.trim() });
  if (isNew) categories.push(category);
  logAudit(actor.name, isNew ? "Creó la categoría" : "Editó la categoría", category.name);
  persist();
  return success(category);
}

export function toggleCategory(categoryId, actor) {
  const category = getState().categories.find((item) => item.id === categoryId);
  if (!category) return;
  category.active = !category.active;
  logAudit(actor.name, category.active ? "Activó la categoría" : "Desactivó la categoría", category.name);
  persist();
}

export function moveCategory(categoryId, direction) {
  const { categories } = getState();
  const edition = currentEdition();
  const siblings = categories.filter((item) => item.editionId === edition.id).sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((item) => item.id === categoryId);
  const target = siblings[index + direction];
  if (index < 0 || !target) return;
  [siblings[index].order, target.order] = [target.order, siblings[index].order];
  persist();
}

export function deleteCategory(categoryId, actor) {
  const { categories, polls } = getState();
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { ok: false, error: "La categoría no existe." };
  if (polls.some((poll) => poll.categoryId === categoryId)) {
    return { ok: false, error: "Esta categoría tiene votaciones. Desactívala en lugar de eliminarla." };
  }
  categories.splice(categories.indexOf(category), 1);
  logAudit(actor.name, "Eliminó la categoría", category.name);
  persist();
  return { ok: true };
}

function validatePoll(input) {
  const errors = {};
  if (input.title.trim().length < 3) errors.title = "Escribe el título de la votación, con al menos 3 caracteres.";
  if (!input.categoryId) errors.categoryId = "Elige la categoría de la votación.";
  if (!Number.isFinite(input.opensAt)) errors.opensAt = "Elige la fecha y hora de apertura.";
  if (!Number.isFinite(input.closesAt)) errors.closesAt = "Elige la fecha y hora de cierre.";
  if (!errors.opensAt && !errors.closesAt && input.closesAt <= input.opensAt) errors.closesAt = "El cierre debe ser posterior a la apertura.";
  const votes = Number(input.rule.votesPerVoter);
  if (!Number.isInteger(votes) || votes < 1 || votes > MAX_VOTES_PER_VOTER) {
    errors.votesPerVoter = `Escribe un número de votos entre 1 y ${MAX_VOTES_PER_VOTER}.`;
  }
  return errors;
}

export function savePoll(input, actor) {
  const errors = validatePoll(input);
  const existing = input.id ? getPoll(input.id) : null;
  const optionCount = existing ? listOptions(existing.id).length : 0;
  if (input.published && optionCount < MIN_OPTIONS_TO_PUBLISH) {
    errors.published = `Para publicar necesitas al menos ${MIN_OPTIONS_TO_PUBLISH} opciones. Agrégalas en la sección Opciones y vuelve a publicar.`;
  }
  if (Object.keys(errors).length > 0) return failure(errors);

  const { polls } = getState();
  const poll = existing ?? { id: newId("poll"), closedEarly: false };
  Object.assign(poll, {
    categoryId: input.categoryId,
    title: input.title.trim(),
    description: input.description.trim(),
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    published: input.published,
    rule: {
      votesPerVoter: Number(input.rule.votesPerVoter),
      period: input.rule.period,
      resultsVisibility: input.rule.resultsVisibility,
      requiresRegistration: input.rule.requiresRegistration,
    },
  });
  if (!existing) polls.push(poll);
  logAudit(actor.name, existing ? "Editó la votación" : "Creó la votación", poll.title);
  persist();
  return success(poll);
}

export function closePoll(pollId, actor) {
  const poll = getPoll(pollId);
  if (!poll || pollStatus(poll) !== POLL_STATUS.open) return false;
  poll.closedEarly = true;
  logAudit(actor.name, "Cerró la votación de forma anticipada", poll.title);
  persist();
  return true;
}

export function deletePoll(pollId, actor) {
  const { polls, options } = getState();
  const poll = getPoll(pollId);
  if (!poll) return { ok: false, error: "La votación no existe." };
  if (listVotes(pollId).length > 0) {
    return { ok: false, error: "Esta votación ya tiene votos y no se puede eliminar. Ciérrala para conservar sus resultados." };
  }
  polls.splice(polls.indexOf(poll), 1);
  options.splice(0, options.length, ...options.filter((option) => option.pollId !== pollId));
  logAudit(actor.name, "Eliminó la votación", poll.title);
  persist();
  return { ok: true };
}

export function pollHasVotes(pollId) {
  return listVotes(pollId).length > 0;
}

export function saveOption(input, actor) {
  const errors = {};
  const name = input.name.trim();
  const { options, votes } = getState();
  const siblings = options.filter((option) => option.pollId === input.pollId);
  const existing = input.id ? options.find((option) => option.id === input.id) : null;
  if (name.length < 2) errors.name = "Escribe el nombre de la opción, con al menos 2 caracteres.";
  if (!errors.name && siblings.some((option) => option.id !== input.id && option.name.toLowerCase() === name.toLowerCase())) {
    errors.name = "Ya existe una opción con este nombre en la votación.";
  }
  const hasVotes = existing && votes.some((vote) => vote.optionId === existing.id);
  if (hasVotes && name !== existing.name) {
    errors.name = "Esta opción ya tiene votos. Solo puedes editar su descripción.";
  }
  if (Object.keys(errors).length > 0) return failure(errors);

  const option = existing ?? { id: newId("option"), pollId: input.pollId, order: siblings.length + 1 };
  Object.assign(option, { name, description: input.description.trim(), detail: input.detail.trim() });
  if (input.image) option.image = input.image;
  else if (input.removeImage) option.image = "";
  if (!existing) options.push(option);
  const poll = getPoll(input.pollId);
  logAudit(actor.name, existing ? "Editó una opción de" : "Agregó una opción a", poll?.title ?? "Votación");
  persist();
  return success(option);
}

export function deleteOption(optionId, actor) {
  const { options, votes } = getState();
  const option = options.find((item) => item.id === optionId);
  if (!option) return { ok: false, error: "La opción no existe." };
  if (votes.some((vote) => vote.optionId === optionId)) {
    return { ok: false, error: "Esta opción ya tiene votos y no se puede retirar." };
  }
  options.splice(options.indexOf(option), 1);
  listOptions(option.pollId).forEach((item, index) => {
    item.order = index + 1;
  });
  logAudit(actor.name, "Retiró una opción de", getPoll(option.pollId)?.title ?? "Votación");
  persist();
  return { ok: true };
}

export function moveOption(optionId, direction) {
  const option = getState().options.find((item) => item.id === optionId);
  if (!option) return;
  const siblings = listOptions(option.pollId);
  const index = siblings.findIndex((item) => item.id === optionId);
  const target = siblings[index + direction];
  if (!target) return;
  [siblings[index].order, target.order] = [target.order, siblings[index].order];
  persist();
}

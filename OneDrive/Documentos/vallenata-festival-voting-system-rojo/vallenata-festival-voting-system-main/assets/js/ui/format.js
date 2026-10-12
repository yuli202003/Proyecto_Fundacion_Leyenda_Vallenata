const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" });
const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const NO_BREAK_SPACE = String.fromCharCode(160);
const MINUTE_MS = 60000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatDateTime(timestamp) {
  return dateTimeFormat.format(timestamp).replace(/\s([ap])\.\s?m\./g, `${NO_BREAK_SPACE}$1.${NO_BREAK_SPACE}m.`);
}

export function formatIsoRange(startIso, endIso) {
  const [startYear, startMonth, startDay] = startIso.split("-").map(Number);
  const [endYear, endMonth, endDay] = endIso.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  if (startYear !== endYear) return `del ${dateFormat.format(start)} al ${dateFormat.format(end)}`;
  const startText = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" }).format(start);
  return `del ${startText} al ${dateFormat.format(end)}`;
}

export function formatPercent(value) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

export function formatCount(value) {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function relativeTime(target, now = Date.now()) {
  const difference = target - now;
  const distance = Math.abs(difference);
  if (distance >= DAY_MS) return relativeFormat.format(Math.round(difference / DAY_MS), "day");
  if (distance >= HOUR_MS) return relativeFormat.format(Math.round(difference / HOUR_MS), "hour");
  return relativeFormat.format(Math.round(difference / MINUTE_MS), "minute");
}

export function toInputValue(timestamp) {
  const date = new Date(timestamp);
  const offsetMs = date.getTimezoneOffset() * MINUTE_MS;
  return new Date(timestamp - offsetMs).toISOString().slice(0, 16);
}

export function fromInputValue(value) {
  return value ? new Date(value).getTime() : Number.NaN;
}

export function votesLabel(count) {
  return count === 1 ? "1 voto" : `${formatCount(count)} votos`;
}

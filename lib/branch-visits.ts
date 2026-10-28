import { createHash } from "node:crypto";

export const CONTACT_VISIT_EVENT = "contact.visiting_branch";
export const CONTACT_VISIT_STATUS = "visiting_branch";

type JsonRecord = Record<string, unknown>;

export type ContactBranchVisit = {
  event: typeof CONTACT_VISIT_EVENT;
  status: typeof CONTACT_VISIT_STATUS;
  contact: { id: string; name: string; mobile: string; city: string };
  branch: { id: string; name: string; area: string; city: string; address: string };
  visit: { date: string; time: string; timezone: string; atUtc: Date };
  eventKey: string;
};

function object(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function required(value: unknown, label: string, max: number) {
  const cleaned = text(value, max);
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function localPartsAt(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

export function localVisitToUtc(dateValue: string, timeValue: string, timezone: string) {
  const date = validDate(dateValue);
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(timeValue);
  if (!date) throw new Error("visit.date must be a valid YYYY-MM-DD date.");
  if (!time) throw new Error("visit.time must be a valid 24-hour HH:mm time.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("visit.timezone must be a valid IANA timezone, such as Asia/Kolkata.");
  }

  const [hour, minute] = timeValue.split(":").map(Number);
  const desired = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  let candidate = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = localPartsAt(candidate, timezone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    candidate += desired - represented;
  }
  const actual = localPartsAt(candidate, timezone);
  if (actual.year !== date.year || actual.month !== date.month || actual.day !== date.day || actual.hour !== hour || actual.minute !== minute) {
    throw new Error("The requested visit time does not exist in the supplied timezone.");
  }
  return new Date(candidate);
}

export function parseContactBranchVisit(payload: unknown): ContactBranchVisit {
  const root = object(payload);
  const contact = object(root.contact);
  const branch = object(root.branch);
  const visit = object(root.visit);
  const event = required(root.event, "event", 100);
  const status = required(root.status, "status", 100);
  if (event !== CONTACT_VISIT_EVENT) throw new Error(`event must be ${CONTACT_VISIT_EVENT}.`);
  if (status !== CONTACT_VISIT_STATUS) throw new Error(`status must be ${CONTACT_VISIT_STATUS}.`);

  const mobile = required(contact.mobile, "contact.mobile", 20).replace(/[^0-9+]/g, "");
  if (!/^\+?\d{7,15}$/.test(mobile)) throw new Error("contact.mobile must be a valid phone number.");
  const parsed = {
    event,
    status,
    contact: {
      id: required(contact.id, "contact.id", 100),
      name: required(contact.name, "contact.name", 190),
      mobile,
      city: text(contact.city, 120),
    },
    branch: {
      id: required(branch.id, "branch.id", 100).toUpperCase(),
      name: required(branch.name, "branch.name", 190),
      area: text(branch.area, 190),
      city: text(branch.city, 120),
      address: text(branch.address, 500),
    },
    visit: {
      date: required(visit.date, "visit.date", 10),
      time: required(visit.time, "visit.time", 5),
      timezone: required(visit.timezone, "visit.timezone", 100),
      atUtc: new Date(0),
    },
  };
  parsed.visit.atUtc = localVisitToUtc(parsed.visit.date, parsed.visit.time, parsed.visit.timezone);
  const eventKey = createHash("sha256").update(JSON.stringify({
    event: parsed.event,
    status: parsed.status,
    contactId: parsed.contact.id,
    branchId: parsed.branch.id,
    visitAt: parsed.visit.atUtc.toISOString(),
  })).digest("hex");
  return { ...parsed, eventKey } as ContactBranchVisit;
}

export function mysqlUtc(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

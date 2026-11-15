import Papa from "papaparse";

// ── Roster CSV ──

export type RosterRow = { name: string; rosterId: string };

/** Accepts exports from Google Classroom, PowerSchool, or a hand-made sheet: any column that looks like a name. */
export function parseRoster(text: string): { rows: RosterRow[]; skipped: number } {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const data = parsed.data.slice(0, 501);
  if (data.length === 0) return { rows: [], skipped: 0 };
  const header = data[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.some((h) => /name|student|first|last|id/.test(h));
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  const first = hasHeader ? find(/^(first|given|preferred)/) : -1;
  const last = hasHeader ? find(/^(last|family|surname)/) : -1;
  const full = hasHeader ? find(/^(name|student name|full name|student)$/) : -1;
  const idCol = hasHeader ? find(/(^id$|student.?id|sis|number)/) : -1;
  const rows: RosterRow[] = [];
  let skipped = 0;
  for (const r of hasHeader ? data.slice(1) : data) {
    let name = "";
    if (first >= 0) name = `${r[first] ?? ""} ${last >= 0 && r[last] ? (r[last].trim()[0] ?? "") + "." : ""}`;
    else if (full >= 0) name = r[full] ?? "";
    else name = r[0] ?? "";
    name = name.replace(/\s+/g, " ").trim().slice(0, 40);
    // Keep only letters, marks, spaces, apostrophes, dots and dashes (no formulas, no HTML).
    if (!name || !/^[\p{L}\p{M}' .-]+$/u.test(name)) {
      skipped++;
      continue;
    }
    rows.push({ name, rosterId: idCol >= 0 ? String(r[idCol] ?? "").trim().slice(0, 40) : "" });
  }
  return { rows: rows.slice(0, 500), skipped };
}


/* =====================================================================
   EXCEL IMPORT/EXPORT — bulk-create owners from a spreadsheet, and a
   downloadable sample template so the column format is never guessed.
   Uses exceljs (not the more common `xlsx`/SheetJS package — that one
   has two unpatched high-severity advisories, prototype pollution and
   ReDoS, both directly reachable through parsing an untrusted uploaded
   file, which is exactly what this module does).
   ===================================================================== */
import ExcelJS from 'exceljs';
import { SAMPLE_DRAFT } from './intake.js';
import { FULL_FORM_FIELDS, COMPLAINT_FIELDS } from '../constants/intakeFields.js';
import { PROJECTS } from '../constants/projects.js';
import { OCC, COMM } from '../constants/seedData.js';

const SHEET_NAME = 'Owners';
const TEMPLATE_FILENAME = 'owner-import-template.xlsx';

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function sampleRows() {
  const first = {
    ...SAMPLE_DRAFT(),
    email: 'rahul.verma@example.com', salutation: 'Mr.',
    dob: '1985-06-14', spouseDob: '1990-11-02',
    coApplicant: 'Priya Verma', coRelation: 'Spouse', coOnAgreement: 'Yes',
    kycDate: '2021-04-02', corrAddr: 'B-42, Vivekanand Colony, Gwalior', city: 'Gwalior',
    occupation: OCC[0].k, community: COMM[0], source: 'Direct walk-in',
    consentWhatsapp: 'Yes', consentSms: 'Yes', consentEmail: 'No', consentMarketing: 'Yes', consentChildren: 'No',
    consentPurpose: 'Portfolio statements, launch invitations, service updates',
  };

  const p2 = PROJECTS[1] || PROJECTS[0];
  const rt = 2200, sa = 1450, dc = 20000;
  const second = {
    name: 'Another Sample Owner', pan: 'PQRSX5678M', mobile: '+91 9876543210',
    email: '', salutation: 'Mrs.',
    dob: '1978-02-28', spouseDob: '',
    coApplicant: '', coRelation: '', coOnAgreement: 'No',
    kycDate: '2022-01-15', corrAddr: '', city: 'Morar',
    occupation: OCC[3].k, community: COMM[2], source: 'Digital lead',
    consentWhatsapp: 'Yes', consentSms: 'No', consentEmail: 'No', consentMarketing: 'No', consentChildren: 'No',
    consentPurpose: 'Service and documentation only',
    project: p2.name, unit: 'RG-B-101', saleable: sa, rate: rt, discount: dc,
    consideration: rt * sa - dc, bookDate: '2022-01-15', paid: rt * sa - dc - 150000,
  };
  return [first, second];
}

/* 1-based column index -> Excel column letter (23 -> 'W', etc.) —
   computed from FULL_FORM_FIELDS' own order rather than hardcoded, so
   adding/reordering a field there can't silently point validation at
   the wrong column. */
function colLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const VALIDATION_ROWS = 200;

/* real Excel dropdown validation (not just a text instruction) for the
   columns that must match a fixed list — Occupation/Community feed
   the Capacity score via OCC/COMM (see validateProfilePatch), and a
   typo there fails silently different from a typo in a free-text
   field: the row is held with "choose a value from the list", not
   obviously wrong until import. */
function applyListValidation(sheet, key, formula) {
  const idx = FULL_FORM_FIELDS.findIndex(([k]) => k === key);
  if (idx === -1) return;
  const letter = colLetter(idx + 1);
  for (let r = 2; r <= VALIDATION_ROWS; r++) {
    sheet.getCell(`${letter}${r}`).dataValidation = {
      type: 'list', allowBlank: true, formulae: [formula],
      showErrorMessage: true, errorTitle: 'Invalid value', error: 'Choose a value from the dropdown list.',
    };
  }
}

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* downloads a template with the exact columns Intake expects, pre-filled
   with two realistic sample rows — never real owner data. */
export async function downloadSampleTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.columns = FULL_FORM_FIELDS.map(([key, label]) => ({ header: label, key, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sampleRows().forEach((row) => sheet.addRow(row));

  /* a hidden sheet backs the dropdown lists — Excel data validation
     can reference another sheet's range but not an inline list long
     enough to hold occupation's full text, so this is the option that
     actually works rather than one that only fits the short lists. */
  const lists = workbook.addWorksheet('Lists');
  lists.state = 'hidden';
  lists.getColumn(1).values = ['Project', ...PROJECTS.map((p) => p.name)];
  lists.getColumn(2).values = ['Occupation', ...OCC.map((o) => o.k)];
  lists.getColumn(3).values = ['Community', ...COMM];
  lists.getColumn(4).values = ['YesNo', 'Yes', 'No'];

  applyListValidation(sheet, 'project', `=Lists!$A$2:$A$${PROJECTS.length + 1}`);
  applyListValidation(sheet, 'occupation', `=Lists!$B$2:$B$${OCC.length + 1}`);
  applyListValidation(sheet, 'community', `=Lists!$C$2:$C$${COMM.length + 1}`);
  ['coOnAgreement', 'consentWhatsapp', 'consentSms', 'consentEmail', 'consentMarketing', 'consentChildren']
    .forEach((k) => applyListValidation(sheet, k, '=Lists!$D$2:$D$3'));

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, TEMPLATE_FILENAME);
}

/* exports the given (already filtered/sorted) owner rows to an .xlsx
   file — same in-memory Workbook + downloadBlob pattern as the sample
   template above, no new dependency. Callers must pass the full
   filtered array, not a UI-truncated slice (Owner Base caps its own
   table render at ROW_LIMIT for display performance; an export must
   not silently inherit that cap). */
export async function exportOwnerBase(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Owner base');
  sheet.columns = [
    { header: 'Customer ID', key: 'id', width: 14 },
    { header: 'Owner', key: 'name', width: 26 },
    { header: 'Project', key: 'project', width: 18 },
    { header: 'Unit', key: 'unit', width: 12 },
    { header: 'Booked', key: 'booked', width: 14 },
    { header: 'Held (yrs)', key: 'held', width: 10 },
    { header: 'Rate paid', key: 'rate', width: 12 },
    { header: 'Value today', key: 'value', width: 14 },
    { header: 'Unrealised gain', key: 'gain', width: 16 },
    { header: 'Paid %', key: 'paidPct', width: 10 },
    { header: 'Confidence %', key: 'conf', width: 12 },
    { header: 'Score', key: 'score', width: 8 },
    { header: 'Segment', key: 'segment', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((c) => sheet.addRow({
    id: c.id, name: c.name, project: c._project, unit: c._unit,
    booked: c._book ? new Date(c._book) : '',
    held: Number(c._held.toFixed(1)), rate: c._rate, value: c._vrate, gain: c._gain,
    paidPct: Number(c._paidPct.toFixed(0)), conf: c._conf, score: c._total, segment: c._seg,
  }));
  sheet.getColumn('booked').numFmt = 'dd-mmm-yyyy';

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, `owner-base-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* the fields buildCustomer/validateDraft cannot proceed without — if
   the header row doesn't map to one of these at all (not "mapped but
   blank" — genuinely not found in any column), every single row will
   fail on that field with the same generic message, which reads like
   241 rows of bad data rather than what it actually is: a header the
   parser never recognised. Caught explicitly below instead of letting
   that confusing pile-up happen. */
const REQUIRED_KEYS = ['name', 'pan', 'mobile', 'project', 'unit', 'saleable', 'rate', 'consideration', 'bookDate', 'paid'];
const COMPLAINT_REQUIRED_KEYS = ['id', 't', 'raised', 'owner', 'ncr'];

function cellValue(cell) {
  let value = cell.value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object' && 'text' in value) value = value.text;
  else if (value && typeof value === 'object' && 'result' in value) value = value.result;
  return value == null ? '' : String(value).trim();
}

/* shared by parseImportFile/parseComplaintsFile below — reads a
   workbook's first sheet into [{ rowNumber, draft }], matching header
   cells to `fields`' keys case/spacing-insensitively, by either the
   on-screen label ("Full name") or the raw field key ("name"), so
   column order and exact wording don't matter. Unrecognised columns
   are ignored; missing OPTIONAL columns just come through empty and
   whichever validator runs next rejects them same as a blank field in
   the manual form — reject, don't guess. A missing REQUIRED column is
   a different problem and is reported once, up front, rather than
   letting every row fail on it with the same confusing message. */
async function parseSheetFile(file, fields, requiredKeys) {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const labelToKey = new Map();
  fields.forEach(([key, label]) => {
    labelToKey.set(norm(label), key);
    labelToKey.set(norm(key), key);
  });

  const colKeyByIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = labelToKey.get(norm(cell.value));
    if (key) colKeyByIndex[colNumber] = key;
  });

  const foundKeys = new Set(Object.values(colKeyByIndex));
  const missingRequired = requiredKeys.filter((k) => !foundKeys.has(k));
  if (missingRequired.length) {
    const labels = missingRequired.map((k) => fields.find(([fk]) => fk === k)?.[1] || k);
    throw new Error(
      `Could not find a column for: ${labels.join(', ')}. The header row's wording doesn't match the ` +
      `template's — download a fresh copy and use its exact column headers.`
    );
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const draft = {};
    let hasAnyValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = colKeyByIndex[colNumber];
      if (!key) return;
      const value = cellValue(cell);
      if (value !== '') hasAnyValue = true;
      draft[key] = value;
    });
    if (hasAnyValue) rows.push({ rowNumber, draft });
  });
  return rows;
}

export async function parseImportFile(file) {
  return parseSheetFile(file, FULL_FORM_FIELDS, REQUIRED_KEYS);
}

/* downloads a template for bulk-logging complaints against EXISTING
   owners — matched by Customer ID, never mobile (two owners can share
   a mobile, e.g. family, and a complaint logged against the wrong
   person closes the wrong owner's contact gate). */
export async function downloadComplaintsTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Complaints');
  sheet.columns = COMPLAINT_FIELDS.map(([key, label]) => ({ header: label, key, width: 26 }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({ id: 'NEO-C-12', t: 'Seepage — master bathroom wall', raised: '2026-08-01', owner: 'AGM CRM', ncr: 'NCR-2026-0142' });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, 'complaints-import-template.xlsx');
}

/* reads an uploaded workbook of complaint rows — one row per
   complaint, matched to an existing customer by Customer ID by the
   caller (this just parses; it doesn't look customers up). */
export async function parseComplaintsFile(file) {
  return parseSheetFile(file, COMPLAINT_FIELDS, COMPLAINT_REQUIRED_KEYS);
}

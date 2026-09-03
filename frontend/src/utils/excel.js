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
import { FULL_FORM_FIELDS } from '../constants/intakeFields.js';
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

/* the fields buildCustomer/validateDraft cannot proceed without — if
   the header row doesn't map to one of these at all (not "mapped but
   blank" — genuinely not found in any column), every single row will
   fail on that field with the same generic message, which reads like
   241 rows of bad data rather than what it actually is: a header the
   parser never recognised. Caught explicitly below instead of letting
   that confusing pile-up happen. */
const REQUIRED_KEYS = ['name', 'pan', 'mobile', 'project', 'unit', 'saleable', 'rate', 'consideration', 'bookDate', 'paid'];

/* reads an uploaded workbook's first sheet and returns
   [{ rowNumber, draft }] — draft keyed exactly like FORM_FIELDS/
   validateDraft/addCustomer expect. Header matching is case- and
   spacing-insensitive, and accepts either the on-screen label
   ("Full name") or the raw field key ("name"), so column order and
   exact wording don't matter. Unrecognised columns are ignored;
   missing OPTIONAL columns just come through empty, and validateDraft
   /the server rejects them same as a blank field in the manual form —
   reject, don't guess. A missing REQUIRED column is a different kind
   of problem (see REQUIRED_KEYS) and is reported once, up front. */
export async function parseImportFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const labelToKey = new Map();
  FULL_FORM_FIELDS.forEach(([key, label]) => {
    labelToKey.set(norm(label), key);
    labelToKey.set(norm(key), key);
  });

  const colKeyByIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = labelToKey.get(norm(cell.value));
    if (key) colKeyByIndex[colNumber] = key;
  });

  const foundKeys = new Set(Object.values(colKeyByIndex));
  const missingRequired = REQUIRED_KEYS.filter((k) => !foundKeys.has(k));
  if (missingRequired.length) {
    const labels = missingRequired.map((k) => FULL_FORM_FIELDS.find(([fk]) => fk === k)?.[1] || k);
    throw new Error(
      `Could not find a column for: ${labels.join(', ')}. The header row's wording doesn't match the ` +
      `template's — download a fresh copy ("Download sample template") and use its exact column headers.`
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
      let value = cell.value;
      if (value instanceof Date) value = value.toISOString().slice(0, 10);
      else if (value && typeof value === 'object' && 'text' in value) value = value.text;
      else if (value && typeof value === 'object' && 'result' in value) value = value.result;
      if (value != null && value !== '') hasAnyValue = true;
      draft[key] = value == null ? '' : String(value).trim();
    });
    if (hasAnyValue) rows.push({ rowNumber, draft });
  });
  return rows;
}

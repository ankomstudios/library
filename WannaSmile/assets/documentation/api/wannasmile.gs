/**
 * WannaSmile4Evr — unified Apps Script backend
 * =============================================
 * BUILD MARKER: WS-GIFPACKS-VERIFY-01 — search for this exact string after
 * pasting into the Apps Script editor. If it's missing, the paste didn't
 * take (wrong tab, stale clipboard, etc.) — this file, on disk, right now,
 * has it, along with _gifPacksGet() and the "gifpacks" route below.
 *
 * ONE Apps Script project, ONE doGet(), ONE doPost(), routed by a
 * ?type= query parameter.
 *
 * WHY THIS FILE EXISTS
 * Apps Script does not namespace functions per .gs file — every file
 * in a project shares one global scope. Four separate files each
 * declaring their own doGet()/doPost() means only ONE ever wins
 * project-wide (whichever the editor loaded last), regardless of
 * which specific /exec URL you actually call. That's why the quote
 * system kept getting asset/theme/sync data back instead of quotes:
 * every deployment URL from this project runs the SAME active doGet,
 * not a different one per URL.
 *
 * This file merges all four into one dispatcher so there is only ever
 * one doGet/doPost in the whole project — collision impossible by
 * construction, not by convention.
 *
 * ROUTING
 *   ?type=quotes       -> QuoteSystemWS  (main quote list, column A)
 *   ?type=searchQuotes -> QuoteSystemWS  (search placeholder quotes, column B)
 *   ?type=themes   -> ThemifyWS          (theme rows)
 *   ?type=gifpacks -> GifPacksWS         (gif-pack rows — name, id, and one
 *                                         "w|h|pixelated" cell per gif state)
 *   ?type=sync     -> SystemDataSyncWS   (site/version data, canonical owner)
 *   ?type=widgets  -> WidgetsWS          (widget list — id, name, icon, url,
 *                                         colors, description)
 *   ?type=assets   -> AssetBuilderWS     (asset feed — also the default,
 *                                         so existing calls with no ?type=
 *                                         at all keep working unchanged)
 *   ?type=devbuild -> DevBuildWS         (identical feed/CRUD to
 *                                         AssetBuilderWS above — same code
 *                                         path, just pointed at a separate
 *                                         "DevBuildWS" tab, for testing
 *                                         asset changes without touching
 *                                         the live sheet)
 *
 * doPost() routes the same way, reading "type" from the JSON body
 * (falls back to the query string, then to "assets").
 *
 * DEPLOY
 * Deploy -> New deployment -> Web app -> Execute as: Me,
 * Who has access: Anyone. Copy the ONE /exec URL this gives you —
 * that's the single URL every part of the site now shares, just with
 * a different ?type= suffix per feature.
 *
 * Every time you edit this script, you must create a NEW deployment
 * version (Manage deployments -> Edit -> New version) for the change
 * to actually reach the existing /exec URL — saving alone does not
 * update what's already live.
 */

function doGet(e) {
  const type = _key((e && e.parameter && e.parameter.type) || "assets");

  switch (type) {
    case "quotes":       return _quotesGet();
    case "searchquotes": return _searchQuotesGet();
    case "themes":       return _themesGet();
    case "gifpacks":     return _gifPacksGet();
    case "sync":         return _syncGet();
    case "widgets":      return _widgetsGet();
    case "devbuild":     return _devBuildGet(e);
    case "assets":
    default:             return _assetsGet(e);
  }
}

function doPost(e) {
  const body = _readBody(e);
  const type = _key(body.type || (e && e.parameter && e.parameter.type) || "assets");

  switch (type) {
    case "sync":     return _syncPost(e);
    case "devbuild": return _devBuildPost(e);
    case "assets":
    default:         return _assetsPost(e);
  }
}

// ---------- shared helpers ----------

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _key(v) {
  return String(v || "").trim().toLowerCase();
}

function _readBody(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
  }
  return (e && e.parameter) || {};
}

// ==================== QUOTES (QuoteSystemWS) ====================

function _quotesGet() {
  return _quotesColumnGet(1); // column A — main quote-box quotes
}

function _searchQuotesGet() {
  return _quotesColumnGet(2); // column B — search placeholder quotes
}

// Shared by both feeds: column 1 header cell (row 1) becomes the single
// JSON key, and every non-empty cell below it (row 2 downward) becomes
// that key's array of quotes. Same column-1-header/column-2-data shape
// as every other feed in this file, just parameterized on which column.
function _quotesColumnGet(col) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("QuoteSystemWS");

  const header = String(sheet.getRange(1, col).getValue()).trim();
  const lastRow = sheet.getLastRow();

  const values = lastRow >= 2
    ? sheet.getRange(2, col, lastRow - 1, 1)
        .getValues()
        .flat()
        .filter(value => value !== "" && value !== null)
        .map(value => String(value))
    : [];

  const response = {
    [header]: values
  };

  return _json(response);
}


// ==================== ASSETS (AssetBuilderWS) ====================


const ASSET_SHEET_NAME = "AssetBuilderWS";
const ASSET_HEADERS = [
	"title",
	"author",
	"link",
	"image",
	"category",
	"sub-category",
	"status",
	"page",
	"type",
	"animated",
	"description",
];

function _assetSheet() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const byName = ss.getSheetByName(ASSET_SHEET_NAME);
	if (byName) return byName;
	const sheets = ss.getSheets();
	return sheets.length ? sheets[0] : null;
}

function _assetKey(value) {
	return String(value || "").trim().toLowerCase();
}

function _assetReadBody(e) {
	if (!e) return {};
	if (e.postData && e.postData.contents) {
		try {
			return JSON.parse(e.postData.contents);
		} catch (err) {
			return {};
		}
	}
	return e.parameter || {};
}

function _assetHeaderMap(sheet) {
	const range = sheet.getRange(1, 1, 1, ASSET_HEADERS.length).getValues()[0];
	const map = {};
	ASSET_HEADERS.forEach((header, index) => {
		const sheetHeader = _assetKey(range[index]) || header;
		map[header] = { index, sheetHeader };
	});
	return map;
}

function _assetEnsureHeaders(sheet) {
	const current = sheet.getRange(1, 1, 1, ASSET_HEADERS.length).getValues()[0];
	const hasAny = current.some(cell => String(cell || "").trim() !== "");
	if (!hasAny) {
		sheet.getRange(1, 1, 1, ASSET_HEADERS.length).setValues([ASSET_HEADERS]);
	}
}

function _assetRowToObject(row, map) {
	const item = {};
	ASSET_HEADERS.forEach(header => {
		const col = map[header].index;
		item[header] = row[col] !== undefined ? row[col] : "";
	});
	return item;
}

function _assetObjectToRow(obj) {
	return ASSET_HEADERS.map(header => (obj && obj[header] !== undefined ? obj[header] : ""));
}

function _assetLastDataRow(sheet) {
	const rows = sheet.getLastRow();
	if (rows <= 1) return 1;
	const values = sheet.getRange(2, 1, rows - 1, ASSET_HEADERS.length).getValues();
	for (let i = values.length - 1; i >= 0; i--) {
		if (values[i].some(cell => String(cell || "").trim() !== "")) {
			return i + 2;
		}
	}
	return 1;
}

function _assetAllRows(sheet) {
	_assetEnsureHeaders(sheet);
	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return [];

	const map = _assetHeaderMap(sheet);
	const values = sheet.getRange(2, 1, lastRow - 1, ASSET_HEADERS.length).getValues();
	return values
		.filter(row => row.some(cell => String(cell || "").trim() !== ""))
		.map(row => _assetRowToObject(row, map));
}

function _assetFindRowByTitle(sheet, title) {
	const needle = _assetKey(title);
	if (!needle) return -1;

	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return -1;

	const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
	for (let i = 0; i < values.length; i++) {
		if (_assetKey(values[i][0]) === needle) return i + 2;
	}
	return -1;
}

function _assetRequireToken(body) {
	const secret = PropertiesService.getScriptProperties().getProperty("SECRET_TOKEN");
	if (!secret) return true;
	return body && body.token === secret;
}

function _assetsGet(e) {
	return _assetFeedGet(e, _assetSheet());
}

// Shared by AssetBuilderWS and DevBuildWS — everything below reads and
// writes whichever `sheet` it's handed, so DevBuildWS gets the exact
// same feed/CRUD behavior for free just by passing a different sheet.
function _assetFeedGet(e, sheet) {
	try {
		if (!sheet) return _json({ error: "No sheet found.", items: [] });

		const params = (e && e.parameter) || {};
		const action = _assetKey(params.action || "all");

		// Reads only columns 1-8 (title..page — skips type/animated/description),
		// then keeps just {link, title, page, status} per row — a lighter fetch
		// than the full ASSET_HEADERS width, for the minimal-view toggle in the
		// client. Checked before _assetAllRows() below so that call (and its
		// full-row read) is skipped entirely for this action.
		if (action === "links") {
			const lastRow = sheet.getLastRow();
			if (lastRow < 2) return _json([]);
			const width = Math.min(8, ASSET_HEADERS.length);
			const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
			const items = rows
				.filter(row => row.some(cell => String(cell || "").trim() !== ""))
				.map(row => ({
					link:   String(row[ASSET_HEADERS.indexOf("link")] || "").trim(),
					title:  String(row[ASSET_HEADERS.indexOf("title")] || "").trim(),
					page:   row[ASSET_HEADERS.indexOf("page")],
					status: String(row[ASSET_HEADERS.indexOf("status")] || "").trim(),
				}));
			return _json(items);
		}

		const rows = _assetAllRows(sheet);

		if (action === "meta") {
			return _json({
				sheetName: sheet.getName(),
				headers: ASSET_HEADERS,
				count: rows.length,
			});
		}

		if (action === "row") {
			const rowNumber = Number(params.row || params.rowNumber || 0);
			const target = Number.isFinite(rowNumber) && rowNumber >= 2 ? rowNumber : -1;
			if (target === -1 || target > sheet.getLastRow()) {
				return _json({ error: "Missing or invalid row.", item: null });
			}
			const map = _assetHeaderMap(sheet);
			const row = sheet.getRange(target, 1, 1, ASSET_HEADERS.length).getValues()[0];
			return _json({ item: _assetRowToObject(row, map), row: target });
		}

		if (action === "find") {
			const row = _assetFindRowByTitle(sheet, params.title || params.q || "");
			if (row === -1) return _json({ error: "Not found.", row: -1, item: null });
			const map = _assetHeaderMap(sheet);
			const values = sheet.getRange(row, 1, 1, ASSET_HEADERS.length).getValues()[0];
			return _json({ item: _assetRowToObject(values, map), row });
		}

		return _json(rows);
	} catch (err) {
		return _json({ error: String(err && err.message || err), items: [] });
	}
}

function _assetsPost(e) {
	return _assetFeedPost(e, _assetSheet());
}

// Shared by AssetBuilderWS and DevBuildWS, same as _assetFeedGet above.
function _assetFeedPost(e, sheet) {
	try {
		const body = _assetReadBody(e);
		if (!_assetRequireToken(body)) {
			return _json({ ok: false, error: "Unauthorized." });
		}

		if (!sheet) return _json({ ok: false, error: "No sheet found." });

		_assetEnsureHeaders(sheet);
		const action = _assetKey(body.action || body.op || "upsert");
		const map = _assetHeaderMap(sheet);

		if (action === "list") {
			return _json({ ok: true, items: _assetAllRows(sheet) });
		}

		if (action === "add" || action === "append") {
			const row = _assetObjectToRow(body.item || body.row || body);
			const nextRow = Math.max(_assetLastDataRow(sheet) + 1, 2);
			sheet.getRange(nextRow, 1, 1, ASSET_HEADERS.length).setValues([row]);
			return _json({ ok: true, row: nextRow, item: _assetRowToObject(row, map) });
		}

		if (action === "update" || action === "upsert") {
			let targetRow = Number(body.row || body.rowNumber || 0);
			if (!Number.isFinite(targetRow) || targetRow < 2) {
				targetRow = _assetFindRowByTitle(sheet, body.title || (body.item && body.item.title) || "");
			}
			if (!Number.isFinite(targetRow) || targetRow < 2) {
				const row = _assetObjectToRow(body.item || body.row || body);
				const nextRow = Math.max(_assetLastDataRow(sheet) + 1, 2);
				sheet.getRange(nextRow, 1, 1, ASSET_HEADERS.length).setValues([row]);
				return _json({ ok: true, created: true, row: nextRow, item: _assetRowToObject(row, map) });
			}

			const current = sheet.getRange(targetRow, 1, 1, ASSET_HEADERS.length).getValues()[0];
			const merged = Object.assign(_assetRowToObject(current, map), body.item || body.row || body);
			const row = _assetObjectToRow(merged);
			sheet.getRange(targetRow, 1, 1, ASSET_HEADERS.length).setValues([row]);
			return _json({ ok: true, updated: true, row: targetRow, item: _assetRowToObject(row, map) });
		}

		if (action === "delete") {
			const targetRow = Number(body.row || body.rowNumber || 0);
			if (!Number.isFinite(targetRow) || targetRow < 2) {
				return _json({ ok: false, error: "Missing or invalid row." });
			}
			const removed = sheet.getRange(targetRow, 1, 1, ASSET_HEADERS.length).getValues()[0];
			sheet.deleteRow(targetRow);
			return _json({ ok: true, deleted: true, row: targetRow, item: _assetRowToObject(removed, map) });
		}

		if (action === "move") {
			const fromRow = Number(body.fromRow || body.row || body.rowNumber || 0);
			const toRow = Number(body.toRow || body.targetRow || 0);
			if (!Number.isFinite(fromRow) || fromRow < 2 || !Number.isFinite(toRow) || toRow < 2) {
				return _json({ ok: false, error: "Missing or invalid fromRow/toRow." });
			}
			const lastRow = sheet.getLastRow();
			if (fromRow > lastRow) return _json({ ok: false, error: "fromRow is out of range." });

			const values = sheet.getRange(fromRow, 1, 1, ASSET_HEADERS.length).getValues()[0];
			sheet.deleteRow(fromRow);
			const adjustedToRow = fromRow < toRow ? Math.min(toRow - 1, sheet.getLastRow() + 1) : Math.min(toRow, sheet.getLastRow() + 1);
			sheet.insertRowBefore(adjustedToRow);
			sheet.getRange(adjustedToRow, 1, 1, ASSET_HEADERS.length).setValues([values]);
			return _json({ ok: true, moved: true, fromRow, toRow: adjustedToRow, item: _assetRowToObject(values, map) });
		}

		if (action === "reorder") {
			const items = Array.isArray(body.items) ? body.items : [];
			if (!items.length) return _json({ ok: false, error: "Missing items array." });

			const existing = _assetAllRows(sheet);
			const byTitle = new Map(existing.map(item => [_assetKey(item.title), item]));
			const ordered = items.map(entry => {
				if (typeof entry === "string") return byTitle.get(_assetKey(entry)) || null;
				if (entry && typeof entry === "object") {
					if (entry.title && byTitle.has(_assetKey(entry.title))) return byTitle.get(_assetKey(entry.title));
					return entry;
				}
				return null;
			}).filter(Boolean);

			const remainder = existing.filter(item => !ordered.some(entry => _assetKey(entry.title) === _assetKey(item.title)));
			const next = ordered.concat(remainder);

			if (sheet.getLastRow() > 1) {
				sheet.getRange(2, 1, sheet.getLastRow() - 1, ASSET_HEADERS.length).clearContent();
			}
			if (next.length) {
				sheet.getRange(2, 1, next.length, ASSET_HEADERS.length).setValues(next.map(_assetObjectToRow));
			}
			return _json({ ok: true, reordered: true, count: next.length });
		}

		return _json({ ok: false, error: `Unknown action: ${action}` });
	} catch (err) {
		return _json({ ok: false, error: String(err && err.message || err) });
	}
}


// ==================== DEV BUILD (DevBuildWS) ====================
//
// Exact same feed/CRUD logic as AssetBuilderWS above (both call into
// _assetFeedGet/_assetFeedPost, which take a sheet argument) — the only
// difference is which sheet it reads/writes. Lets you test asset
// changes against a separate "DevBuildWS" tab before they touch the
// real AssetBuilderWS sheet the live site reads from.

const DEVBUILD_SHEET_NAME = "DevBuildWS";

function _devBuildSheet() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const byName = ss.getSheetByName(DEVBUILD_SHEET_NAME);
	if (byName) return byName;
	const sheets = ss.getSheets();
	return sheets.length ? sheets[0] : null;
}

function _devBuildGet(e) {
	return _assetFeedGet(e, _devBuildSheet());
}

function _devBuildPost(e) {
	return _assetFeedPost(e, _devBuildSheet());
}


// ==================== THEMES (ThemifyWS) ====================

function _themesGet() {
  try {
    // === 1. Initialize Spreadsheet & Sheet ===
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ThemifyWS");
    if (!sheet) throw new Error("Sheet 'ThemifyWS' not found.");

    // === 2. Get Data (A → S, starting from row 2) ===
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No data found.");

    const range = sheet.getRange(2, 1, lastRow - 1, 19); // row 2 → last, cols A–S
    const values = range.getValues();

    // === 3. Filter Empty Rows ===
    const data = values.filter(row =>
      row.some(cell => cell !== "" && cell !== null && cell !== undefined)
    );

    // === 4. Return JSON ===
    return ContentService
      .createTextOutput(JSON.stringify(data, null, 2))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    // === 5. Error Handling ===
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.message,
        time: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ==================== GIF PACKS (GifPacksWS) ====================
//
// Deliberately minimal, per the "keep the data pretty simple" ask: no `src`
// column at all — the client already knows every gif pack lives under
// assets/media/gifs/, so it builds each state's path itself as
// assets/media/gifs/${id}/${state}.gif. Each state cell instead holds
// "width|height|pixelated" (e.g. "128|128|true"), and a blank cell just
// means that pack has no file for that state (same fallback-to-redux
// behavior the client already has for that case).
//
// Row shape (row 1 = headers, row 2 downward = one pack per row):
//   name | id | loading | loaded | searching | held | drop | crash | ded

const GIFPACK_SHEET_NAME = "GifPacksWS";

function _gifPackSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const byName = ss.getSheetByName(GIFPACK_SHEET_NAME);
  if (byName) return byName;
  const sheets = ss.getSheets();
  return sheets.length ? sheets[0] : null;
}

function _gifPacksGet() {
  try {
    const sheet = _gifPackSheet();
    if (!sheet) return _json([]);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return _json([]);

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => String(h || "").trim());

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const rows = values
      .filter(row => row.some(cell => String(cell || "").trim() !== ""))
      .map(row => {
        const item = {};
        headers.forEach((h, i) => {
          if (h) item[h] = row[i] !== undefined ? String(row[i]).trim() : "";
        });
        return item;
      });

    return _json(rows);
  } catch (err) {
    return _json({ error: String(err && err.message || err) });
  }
}


// ==================== SYSTEM DATA SYNC (SystemDataSyncWS) ====================

const SYNC_SHEET_NAME = "SystemDataSyncWS"; // change if your tab is named differently

function _syncGetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const byName = ss.getSheetByName(SYNC_SHEET_NAME);
  if (byName) return byName;
  // Fall back to the first sheet rather than returning null — a
  // mismatched SYNC_SHEET_NAME shouldn't take the whole feed down.
  const sheets = ss.getSheets();
  return sheets.length ? sheets[0] : null;
}

function _syncNormalizeKey(k) {
  return String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function _syncReadColumns() {
  const sheet = _syncGetSheet();
  if (!sheet) return { headers: [], rows: [] };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { headers: [], rows: [] };

  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1).filter(r => r.some(c => String(c).trim() !== ""));
  return { headers, rows };
}

/**
 * PUBLIC. No token check of any kind — this must never fail just
 * because SECRET_TOKEN isn't set, and it must never throw an uncaught
 * exception (which Apps Script would otherwise turn into an HTML error
 * page instead of JSON).
 */
function _syncGet() {
  try {
    const { headers, rows } = _syncReadColumns();

    const cols = {};
    headers.forEach((h, i) => {
      cols[h] = rows.map(r => (r[i] !== undefined ? r[i] : ""));
    });

    // Last non-empty SourceTruth cell = current real owner.
    const sourceTruthKey = headers.find(h => _syncNormalizeKey(h) === "sourcetruth");
    let canonicalOwner = "";
    if (sourceTruthKey && rows.length) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const val = cols[sourceTruthKey][i];
        if (String(val).trim()) {
          canonicalOwner = String(val).trim();
          break;
        }
      }
    }

    const payload = Object.assign({}, cols, { canonicalOwner, error: null });
    return _json(payload);
  } catch (err) {
    // Whatever went wrong (bad sheet, bad range, quota hiccup, etc.),
    // still hand back valid, parseable JSON — never let this bubble up
    // into Apps Script's default HTML error page.
    return _json({ canonicalOwner: "", error: String(err && err.message || err) });
  }
}

/**
 * PROTECTED. Only doPost() ever looks at SECRET_TOKEN — this has no
 * bearing whatsoever on doGet() above.
 */
function _syncPost(e) {
  try {
    let body;
    try {
      body = JSON.parse((e.postData && e.postData.contents) || "{}");
    } catch (err) {
      return _json({ ok: false, error: "Malformed JSON body." });
    }

    const secret = PropertiesService.getScriptProperties().getProperty("SECRET_TOKEN");
    if (!secret || body.token !== secret) {
      return _json({ ok: false, error: "Unauthorized." });
    }
    if (!body.sourceTruth || typeof body.sourceTruth !== "string" || !body.sourceTruth.trim()) {
      return _json({ ok: false, error: "Missing 'sourceTruth' string." });
    }

    const sheet = _syncGetSheet();
    if (!sheet) return _json({ ok: false, error: "No sheet found." });

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return _json({ ok: false, error: "No data rows found." });

    const headers = values[0].map(h => String(h).trim());
    const colIndex = headers.findIndex(h => _syncNormalizeKey(h) === "sourcetruth");
    if (colIndex === -1) return _json({ ok: false, error: "No SourceTruth column found." });

    // Find the last populated row and update its SourceTruth cell —
    // that row is "current/newest", which is what canonicalOwner reads from.
    let lastRow = -1;
    for (let r = values.length - 1; r >= 1; r--) {
      if (values[r].some(c => String(c).trim() !== "")) {
        lastRow = r;
        break;
      }
    }
    if (lastRow === -1) return _json({ ok: false, error: "No data rows to update." });

    const newOwner = body.sourceTruth.trim();
    sheet.getRange(lastRow + 1, colIndex + 1).setValue(newOwner);

    return _json({ ok: true, canonicalOwner: newOwner });
  } catch (err) {
    // Same principle as doGet(): never let an uncaught exception turn
    // into an HTML error page instead of JSON.
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}


// ==================== WIDGETS (WidgetsWS) ====================
//
// Same pattern as every other feed here: row 1 = headers, and whatever
// text is in each header cell becomes the JSON key for that column —
// row 2 downward is one widget per row. Add a new row, get a new widget;
// no header list to keep in sync in this file, since it's read straight
// from the sheet each time rather than hardcoded.
//
// Expected headers (matching the current local widgets.json shape, so
// the client's existing widgets.js needs zero changes once pointed here):
//   id | widget-name | widget-icon | widget-url | background-color |
//   shadow-color | description

const WIDGET_SHEET_NAME = "WidgetBaseWS";

function _widgetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const byName = ss.getSheetByName(WIDGET_SHEET_NAME);
  if (byName) return byName;
  const sheets = ss.getSheets();
  return sheets.length ? sheets[0] : null;
}

function _widgetsGet() {
  try {
    const sheet = _widgetSheet();
    if (!sheet) return _json([]);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return _json([]);

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => String(h || "").trim());

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const rows = values
      .filter(row => row.some(cell => String(cell || "").trim() !== ""))
      .map(row => {
        const item = {};
        headers.forEach((h, i) => {
          if (h) item[h] = row[i] !== undefined ? String(row[i]) : "";
        });
        return item;
      });

    return _json(rows);
  } catch (err) {
    return _json({ error: String(err && err.message || err) });
  }
}
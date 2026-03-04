function doPost(e) {
  let lock;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents || '{}');

    const name = String(data.name || '').trim();
    const count = Number(data.count || 0);

    lock = LockService.getScriptLock();
    lock.waitLock(5000);

    const values = sheet.getDataRange().getValues();
    const normalizedName = name.toLowerCase();

    let isDuplicate = false;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowName = String(row[1] || '').trim().toLowerCase();
      const rowCount = Number(row[2] || 0);

      if (rowName === normalizedName && rowCount === count) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      sheet.appendRow([new Date(), name, count]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, duplicate: isDuplicate }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Wedding RSVP Web App is running')
    .setMimeType(ContentService.MimeType.TEXT);
}

function cleanupDuplicateRsvpRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length <= 1) {
    return { removed: 0, kept: values.length };
  }

  const output = [values[0]];
  const seen = new Set();
  let removed = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const name = String(row[1] || '').trim().toLowerCase();
    const count = Number(row[2] || 0);
    const key = name + '|' + count;

    if (seen.has(key)) {
      removed++;
      continue;
    }

    seen.add(key);
    output.push(row);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, output.length, output[0].length).setValues(output);

  return { removed: removed, kept: output.length - 1 };
}

function removeLegacyClientTimeColumn() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns >= 4) {
    sheet.deleteColumn(4);
  }
  return { ok: true, columnsNow: sheet.getMaxColumns() };
}

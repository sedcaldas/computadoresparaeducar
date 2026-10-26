/**
 * Code.gs - Puente (relay) de Google Apps Script hacia la carpeta compartida de Drive.
 *
 * Permite que la aplicación estática guarde TODOS los archivos y acciones en la
 * carpeta oficial sin que los usuarios inicien sesión con Google y sin exponer
 * el enlace de la carpeta. El script se ejecuta con la cuenta dueña de la carpeta.
 *
 * Despliegue: ver apps-script/README.md
 */

var ROOT_FOLDER_ID = '1sCwul3GdqXtAwTsMP1EZHaeD3Zx190RW';

// Clave compartida opcional. Si se define aquí, debe configurarse la misma en la app.
var RELAY_KEY = '';

function doGet() {
  return json_({ ok: true, service: 'ceducar-drive-relay' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    if (RELAY_KEY && req.key !== RELAY_KEY) {
      return json_({ ok: false, error: 'Clave del puente inválida.' });
    }

    lock.waitLock(30000);

    switch (req.action) {
      case 'ping':
        return json_({ ok: true, rootAccessible: !!DriveApp.getFolderById(ROOT_FOLDER_ID) });
      case 'upload':
        return json_(upload_(req));
      case 'upsertJson':
        return json_(upsertJson_(req));
      case 'appendAudit':
        return json_(appendAudit_(req));
      case 'download':
        return json_(download_(req));
      default:
        return json_({ ok: false, error: 'Acción no soportada: ' + req.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/** Sube un archivo a la ruta indicada. Si existía una versión anterior, la envía a la papelera. */
function upload_(req) {
  var folder = folderForPath_(req.path || []);
  var bytes = Utilities.base64Decode(req.base64 || '');
  var blob = Utilities.newBlob(bytes, req.mimeType || 'application/octet-stream', req.filename);

  var file = folder.createFile(blob);
  if (req.description) file.setDescription(String(req.description).slice(0, 2000));

  if (req.existingFileId) {
    try {
      var old = DriveApp.getFileById(req.existingFileId);
      if (old.getId() !== file.getId() && isInsideRoot_(old)) old.setTrashed(true);
    } catch (ignore) {}
  }

  return { ok: true, id: file.getId(), name: file.getName(), folderId: folder.getId() };
}

/** Crea o reemplaza un archivo JSON por nombre dentro de la ruta indicada. */
function upsertJson_(req) {
  var folder = folderForPath_(req.path || []);
  var content = typeof req.content === 'string' ? req.content : JSON.stringify(req.content, null, 2);
  var it = folder.getFilesByName(req.filename);
  var file;
  if (it.hasNext()) {
    file = it.next();
    file.setContent(content);
  } else {
    file = folder.createFile(req.filename, content, 'application/json');
  }
  return { ok: true, id: file.getId(), name: file.getName() };
}

/** Agrega uno o varios eventos a la bitácora (hoja de cálculo en /Historial). */
function appendAudit_(req) {
  var entries = req.entries || (req.entry ? [req.entry] : []);
  if (!entries.length) return { ok: true, appended: 0 };

  var sheet = auditSheet_();
  var rows = entries.map(function (a) {
    return [a.id || '', a.timestamp || new Date().toISOString(), a.actor || '', a.rol || '',
            a.accion || '', a.entidad || '', a.entidad_id || '', a.detalles || '', a.version || ''];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return { ok: true, appended: rows.length };
}

/** Devuelve un archivo en base64, solo si está dentro de la carpeta raíz. */
function download_(req) {
  var file = DriveApp.getFileById(req.fileId);
  if (!isInsideRoot_(file)) throw new Error('Archivo fuera de la carpeta autorizada.');
  var blob = file.getBlob();
  return {
    ok: true,
    name: file.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function folderForPath_(segments) {
  var folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  for (var i = 0; i < segments.length; i++) {
    var name = String(segments[i] || '').replace(/[\/\\?%*:|"<>]/g, '_').trim();
    if (!name || name === '.' || name === '..') continue;
    var it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  }
  return folder;
}

function auditSheet_() {
  var historial = folderForPath_(['Historial']);
  var it = historial.getFilesByName('Bitacora_Auditoria');
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.open(it.next());
  } else {
    ss = SpreadsheetApp.create('Bitacora_Auditoria');
    var f = DriveApp.getFileById(ss.getId());
    f.moveTo(historial);
    ss.getSheets()[0].appendRow(['ID', 'Fecha/Hora (UTC)', 'Actor', 'Rol', 'Acción', 'Entidad', 'Entidad ID', 'Detalles', 'Versión']);
    ss.getSheets()[0].setFrozenRows(1);
  }
  return ss.getSheets()[0];
}

function isInsideRoot_(file) {
  var queue = [];
  var parents = file.getParents();
  while (parents.hasNext()) queue.push(parents.next());
  var seen = {};
  while (queue.length) {
    var f = queue.shift();
    var id = f.getId();
    if (id === ROOT_FOLDER_ID) return true;
    if (seen[id]) continue;
    seen[id] = true;
    var p = f.getParents();
    while (p.hasNext()) queue.push(p.next());
  }
  return false;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

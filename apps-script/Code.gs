// Paste the Google Sheet ID between the quotes. The Sheet must contain a tab named "Livingston Leads".
const SHEET_ID = '1aGOR2CGMKQbh_t7ZnOoxlpJF_TJf2NJpmfEpggi2UnM';

// Paste the ID of the Google Drive folder named "Livingston Lead Photos" between the quotes.
const FOLDER_ID = '1sKw_ROcvvatWHeUeJvrrHI89I55WO0Dk';

// Replace this with the email address that should receive new-lead notifications.
const NOTIFY_EMAIL = 'livingstep@comcast.net';

const SHEET_NAME = 'Livingston Leads';
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_SERVICES = [
  'Furniture refinishing',
  'Furniture repair',
  'Antique restoration',
  'Door refinishing',
  'Log home restoration',
  'Other'
];
const HEADERS = [
  'Timestamp', 'Name', 'Phone', 'Email', 'Town', 'Service', 'Message',
  'Preferred contact', 'Photo Drive links', 'Page URL', 'utm_source',
  'utm_medium', 'utm_campaign', 'gclid'
];

function doPost(e) {
  try {
    const lead = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (clean_(lead.website)) return json_({ ok: true });

    validateLead_(lead);
    const photoLinks = savePhotos_(lead.photos || [], lead.name);
    appendLead_(lead, photoLinks);
    sendNotification_(lead, photoLinks);
    return json_({ ok: true });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: 'The request could not be saved. Please call 717-371-3463.' });
  }
}

function validateLead_(lead) {
  if (!clean_(lead.name)) throw new Error('Name is required.');
  if (!clean_(lead.phone) && !clean_(lead.email)) throw new Error('Phone or email is required.');
  if (ALLOWED_SERVICES.indexOf(clean_(lead.service)) === -1) throw new Error('Invalid service.');
  const photos = Array.isArray(lead.photos) ? lead.photos : [];
  if (photos.length > MAX_PHOTOS) throw new Error('No more than three photos are allowed.');
}

function savePhotos_(photos, leadName) {
  if (!photos.length) return [];
  const folder = DriveApp.getFolderById(FOLDER_ID);
  return photos.map(function (photo, index) {
    if (!photo || !photo.data) throw new Error('Photo ' + (index + 1) + ' is empty.');
    const mimeType = normalizeMimeType_(photo.mimeType, photo.name);
    const bytes = Utilities.base64Decode(String(photo.data || '').replace(/^data:[^;]+;base64,/, ''));
    if (bytes.length > MAX_PHOTO_BYTES) throw new Error('Photo ' + (index + 1) + ' is larger than 5 MB.');

    const originalName = safeFileName_(photo.name || ('photo-' + (index + 1)));
    const prefix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    const owner = safeFileName_(clean_(leadName) || 'lead');
    const fileName = prefix + '-' + owner + '-' + (index + 1) + '-' + originalName;
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    return folder.createFile(blob).getUrl();
  });
}

function appendLead_(lead, photoLinks) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([
      new Date(), clean_(lead.name), clean_(lead.phone), clean_(lead.email),
      clean_(lead.town), clean_(lead.service), clean_(lead.message),
      clean_(lead.preferred_contact), photoLinks.join('\n'), clean_(lead.page_url),
      clean_(lead.utm_source), clean_(lead.utm_medium), clean_(lead.utm_campaign), clean_(lead.gclid)
    ]);
  } finally {
    lock.releaseLock();
  }
}

function sendNotification_(lead, photoLinks) {
  const textLines = [
    'A new free assessment request was submitted.', '',
    'Name: ' + clean_(lead.name),
    'Phone: ' + clean_(lead.phone),
    'Email: ' + clean_(lead.email),
    'Town: ' + clean_(lead.town),
    'Service: ' + clean_(lead.service),
    'Preferred contact: ' + clean_(lead.preferred_contact), '',
    'Message:', clean_(lead.message) || '(No message)', '',
    'Photos:', photoLinks.length ? photoLinks.join('\n') : '(No photos)', '',
    'Page URL: ' + clean_(lead.page_url)
  ];
  const photoHtml = photoLinks.length
    ? '<ul>' + photoLinks.map(function (url, index) {
        return '<li><a href="' + html_(url) + '">Photo ' + (index + 1) + '</a></li>';
      }).join('') + '</ul>'
    : '<p>(No photos)</p>';
  const htmlBody = [
    '<p>A new free assessment request was submitted.</p>',
    '<table cellpadding="5" cellspacing="0" border="0">',
    rowHtml_('Name', lead.name), rowHtml_('Phone', lead.phone), rowHtml_('Email', lead.email),
    rowHtml_('Town', lead.town), rowHtml_('Service', lead.service),
    rowHtml_('Preferred contact', lead.preferred_contact), '</table>',
    '<p><strong>Message</strong><br>' + html_(clean_(lead.message) || '(No message)').replace(/\n/g, '<br>') + '</p>',
    '<p><strong>Photos</strong></p>', photoHtml,
    '<p><strong>Page URL</strong><br>' + html_(lead.page_url) + '</p>'
  ].join('');

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New Livingston assessment: ' + clean_(lead.name),
    body: textLines.join('\n'),
    htmlBody: htmlBody,
    name: 'Livingston Website'
  });
}

function normalizeMimeType_(mimeType, fileName) {
  let normalized = clean_(mimeType).toLowerCase();
  if (normalized === 'image/jpg') normalized = 'image/jpeg';
  if (!normalized) {
    if (/\.png$/i.test(fileName || '')) normalized = 'image/png';
    else if (/\.heif$/i.test(fileName || '')) normalized = 'image/heif';
    else if (/\.heic$/i.test(fileName || '')) normalized = 'image/heic';
    else normalized = 'image/jpeg';
  }
  if (['image/jpeg', 'image/png', 'image/heic', 'image/heif'].indexOf(normalized) === -1) {
    throw new Error('Only JPG, PNG, and HEIC photos are allowed.');
  }
  return normalized;
}

function clean_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function safeFileName_(value) {
  return clean_(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'photo';
}

function rowHtml_(label, value) {
  return '<tr><td><strong>' + html_(label) + '</strong></td><td>' + html_(clean_(value) || '—') + '</td></tr>';
}

function html_(value) {
  return clean_(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// backend/core/export/services/TemplateService.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

let helpersRegistered = false;
const templateCache = new Map();

function registerHelpers() {
  if (helpersRegistered) return;
  helpersRegistered = true;

  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('and', (a, b) => !!(a && b));
  Handlebars.registerHelper('or', (a, b) => !!(a || b));
  Handlebars.registerHelper('not', (a) => !a);
  Handlebars.registerHelper('json', (ctx) => new Handlebars.SafeString(`<pre>${Handlebars.escapeExpression(JSON.stringify(ctx, null, 2))}</pre>`));
  Handlebars.registerHelper('dateISO', (v) => (v ? new Date(v).toISOString() : ''));
  Handlebars.registerHelper('nl2br', (text) => new Handlebars.SafeString(String(text || '').replace(/\n/g, '<br/>')));
  Handlebars.registerHelper('join', (arr, sep) => Array.isArray(arr) ? arr.join(sep || ', ') : '');
  Handlebars.registerHelper('upper', (s) => String(s || '').toUpperCase());
  Handlebars.registerHelper('lower', (s) => String(s || '').toLowerCase());
}

function templatePath(name) {
  return path.join(__dirname, '../templates', `${name}.hbs`);
}

function loadTemplate(name) {
  registerHelpers();
  if (templateCache.has(name)) return templateCache.get(name);
  const p = templatePath(name);
  const src = fs.readFileSync(p, 'utf8');
  const tpl = Handlebars.compile(src, { noEscape: true });
  templateCache.set(name, tpl);
  return tpl;
}

function render(name, data) {
  const tpl = loadTemplate(name);
  return tpl(data || {});
}

module.exports = { render };
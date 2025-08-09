// backend/core/entities/services/EntityMergeService.js
// Service de fusion d'entités :
// - Merge JSON data (deep-merge, arrays dédupliquées)
// - Repoint des relations (from/to) + dédoublonnage
// - Repoint des fichiers (files.entity_id)
// - Suppression des entités sources
// - Détection de doublons potentiels par heuristiques

const path = require('path');
const { db } = require('../../../shared/utils/database');

// ----- Helpers normalisation -----
const normalizeEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
const normalizePhone = (v) => {
  if (!v || typeof v !== 'string') return v;
  // Remove non-digits, keep leading + if present
  const hasPlus = v.trim().startsWith('+');
  const digits = v.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};
const normalizeUrl = (v) => {
  if (!v || typeof v !== 'string') return v;
  try {
    const u = new URL(v.trim());
    u.hash = '';
    // drop trailing /
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch (_) {
    return v.trim().toLowerCase();
  }
};

// Deep merge simple pour objets JSON (sans cycles)
function deepMerge(target, source, { prefer = 'target' } = {}) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const set = new Set([...target, ...source]);
    return Array.from(set);
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
      if (out[k] === undefined) {
        out[k] = v;
      } else {
        out[k] = deepMerge(out[k], v, { prefer });
      }
    }
    return out;
  }
  if (target == null) return source;
  if (source == null) return target;
  if (prefer === 'source') return source;
  return target; // default prefer target
}

function isPlainObject(o) {
  return o && typeof o === 'object' && !Array.isArray(o);
}

async function getEntityById(id) {
  return db.get('SELECT * FROM entities WHERE id = ?;', [id]);
}

async function getEntityFilesCount(entityId) {
  const row = await db.get('SELECT COUNT(1) AS c FROM files WHERE entity_id = ?;', [entityId]);
  return row ? row.c : 0;
}

async function parseJsonSafe(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch (_) { return {}; }
}

function stringifyJsonSafe(o) {
  try { return JSON.stringify(o || {}); } catch (_) { return '{}'; }
}

async function repointRelationships(sourceId, targetId) {
  // Repoint FROM
  await db.run('UPDATE relationships SET from_entity = ? WHERE from_entity = ?;', [targetId, sourceId]);
  // Repoint TO
  await db.run('UPDATE relationships SET to_entity = ? WHERE to_entity = ?;', [targetId, sourceId]);
  // Dédoublonnage basique : supprime les doublons stricts (from, to, type identiques)
  await db.run(`
    DELETE FROM relationships
    WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM relationships
      GROUP BY from_entity, to_entity, type
    );
  `);
}

async function repointFiles(sourceId, targetId) {
  await db.run('UPDATE files SET entity_id = ? WHERE entity_id = ?;', [targetId, sourceId]);
}

function buildMergedName(target, source) {
  const t = (target || '').trim();
  const s = (source || '').trim();
  if (!t) return s;
  if (!s) return t;
  // Heuristique : garder le plus long (souvent plus complet)
  return t.length >= s.length ? t : s;
}

function normalizeEntityDataForKeys(data) {
  const out = {};
  const email = data.email || data.mail || data.e_mail;
  if (email) out.email_norm = normalizeEmail(email);
  const phone = data.phone || data.telephone || data.tel || data.msisdn;
  if (phone) out.phone_norm = normalizePhone(phone);
  const url = data.url || data.website || data.site || data.link;
  if (url) out.url_norm = normalizeUrl(url);
  const socials = {};
  ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'github'].forEach((k) => {
    if (data[k]) socials[k] = String(data[k]).trim().toLowerCase();
  });
  if (Object.keys(socials).length) out.socials = socials;
  return out;
}

function duplicateHeuristicScore(a, b) {
  // Score multi-sources : email/phone/url exact match très fort, name similaire moyen, socials léger
  let score = 0;
  if (a.email_norm && b.email_norm && a.email_norm === b.email_norm) score += 70;
  if (a.phone_norm && b.phone_norm && a.phone_norm === b.phone_norm) score += 60;
  if (a.url_norm && b.url_norm && a.url_norm === b.url_norm) score += 30;
  const socialsA = a.socials || {}; const socialsB = b.socials || {};
  for (const k of Object.keys(socialsA)) {
    if (socialsB[k] && socialsA[k] === socialsB[k]) score += 15;
  }
  return score;
}

async function findDuplicatesInFolder(folderId, { minScore = 60 } = {}) {
  const rows = await db.all('SELECT id, name, type, data FROM entities WHERE folder_id = ?;', [folderId]);
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    data: (() => { try { return JSON.parse(r.data || '{}'); } catch (_) { return {}; } })(),
  }));

  // Build signatures
  const normed = items.map((e) => ({ ...e, keys: normalizeEntityDataForKeys(e.data) }));

  const groups = [];
  const visited = new Set();

  for (let i = 0; i < normed.length; i++) {
    if (visited.has(normed[i].id)) continue;
    const cluster = [normed[i]];
    for (let j = i + 1; j < normed.length; j++) {
      if (visited.has(normed[j].id)) continue;
      // type identical or person/org types grouped — ajustable
      if (normed[i].type !== normed[j].type) continue;
      const s = duplicateHeuristicScore(normed[i].keys, normed[j].keys);
      if (s >= minScore) {
        cluster.push(normed[j]);
        visited.add(normed[j].id);
      }
    }
    if (cluster.length > 1) {
      // score moyen du groupe
      const avgScore = (() => {
        if (cluster.length < 2) return 0;
        let acc = 0, c = 0;
        for (let a = 0; a < cluster.length; a++) {
          for (let b = a + 1; b < cluster.length; b++) {
            acc += duplicateHeuristicScore(cluster[a].keys, cluster[b].keys);
            c++;
          }
        }
        return c ? Math.round(acc / c) : 0;
      })();
      groups.push({ score: avgScore, candidates: cluster.map(({ id, name, type }) => ({ id, name, type })) });
    }
  }

  return groups.sort((g1, g2) => g2.score - g1.score);
}

async function mergeEntities({ targetId, sourceIds = [], prefer = 'target' }) {
  if (!targetId || !Array.isArray(sourceIds) || sourceIds.length === 0) {
    throw new Error('mergeEntities: paramètres invalides');
  }
  if (sourceIds.includes(targetId)) {
    throw new Error('mergeEntities: sourceIds contient targetId');
  }

  const target = await getEntityById(targetId);
  if (!target) throw new Error('Entité cible introuvable');

  const targetData = await parseJsonSafe(target.data);
  const mergedFrom = new Set((targetData.merged_from || []).map(String));

  await db.exec('BEGIN TRANSACTION;');
  try {
    let currentName = target.name || '';
    let currentData = { ...targetData };

    for (const sid of sourceIds) {
      const src = await getEntityById(sid);
      if (!src) continue;
      const srcData = await parseJsonSafe(src.data);

      // merge name & data
      currentName = buildMergedName(currentName, src.name);
      currentData = deepMerge(currentData, srcData, { prefer });

      mergedFrom.add(String(sid));

      // repoint relationships & files
      await repointRelationships(sid, targetId);
      await repointFiles(sid, targetId);

      // supprimer la source
      await db.run('DELETE FROM entities WHERE id = ?;', [sid]);
    }

    currentData.merged_from = Array.from(mergedFrom);

    await db.run(
      'UPDATE entities SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
      [currentName, stringifyJsonSafe(currentData), targetId]
    );

    await db.exec('COMMIT;');

    const merged = await getEntityById(targetId);
    return merged;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

module.exports = {
  mergeEntities,
  findDuplicatesInFolder,
};
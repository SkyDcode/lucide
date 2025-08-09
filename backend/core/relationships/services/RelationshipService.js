// backend/core/relationships/services/RelationshipService.js
const RelationshipModel = require('../models/RelationshipModel');
const RelationshipTypeModel = require('../models/RelationshipTypeModel');
const db = require('../../../shared/utils/database');

async function init() {
  await RelationshipModel.ensureTable();
  await RelationshipTypeModel.ensureTable();
  await RelationshipTypeModel.seedFromConstants();
}

async function entityExists(id) {
  const row = await db.get('SELECT id FROM entities WHERE id = :id', { id });
  return !!row;
}

async function getTypeInfo(typeKey) {
  const t = await RelationshipTypeModel.getByKey(typeKey);
  if (t) return t;
  // Si le type n'existe pas en table, on considère par défaut bidirectionnel = true
  return { key: typeKey, label: typeKey, color: null, bidirectional: true };
}

async function create({ from_entity, to_entity, type, data }) {
  if (!from_entity || !to_entity || !type) {
    const err = new Error('from_entity, to_entity et type sont requis');
    err.statusCode = 400; throw err;
  }
  if (from_entity === to_entity) {
    const err = new Error('Une entité ne peut pas être reliée à elle-même');
    err.statusCode = 400; throw err;
  }
  if (!(await entityExists(from_entity)) || !(await entityExists(to_entity))) {
    const err = new Error('Entité inexistante');
    err.statusCode = 400; throw err;
  }

  const typeInfo = await getTypeInfo(type);
  const existing = await RelationshipModel.findBetween(from_entity, to_entity, type, { bidirectional: !!typeInfo.bidirectional });
  if (existing && existing.length) {
    return { created: false, record: existing[0] };
  }

  const created = await RelationshipModel.create({ from_entity, to_entity, type, data: data || null });
  return { created: true, record: created };
}

async function update(id, patch) {
  const row = await RelationshipModel.getById(id);
  if (!row) { const e = new Error('Relation introuvable'); e.statusCode = 404; throw e; }

  if (patch.type && patch.type !== row.type) {
    const typeInfo = await getTypeInfo(patch.type);
    // Vérifier le doublon potentiel avec le nouveau type
    const dup = await RelationshipModel.findBetween(row.from_entity, row.to_entity, patch.type, { bidirectional: !!typeInfo.bidirectional });
    if (dup && dup.length) {
      // On peut choisir de renvoyer l'existante plutôt que de créer un doublon
      return RelationshipModel.getById(dup[0].id);
    }
  }

  return RelationshipModel.update(id, { type: patch.type, data: patch.data });
}

async function remove(id) {
  await RelationshipModel.remove(id);
}

async function getById(id) {
  return RelationshipModel.getById(id);
}

async function list(opts) {
  return RelationshipModel.list(opts);
}

module.exports = {
  init,
  create,
  update,
  remove,
  getById,
  list,
};
// frontend/src/modules/entities/services/entityService.js
import api from '../../../shared/services/api';

const mapListResponse = (resp) => {
  // Le backend renvoie idéalement { data, metadata: { resultsCount, page, limit } }
  const data = resp?.data?.data ?? resp?.data ?? [];
  const meta = resp?.data?.metadata ?? {};
  const total = typeof meta.resultsCount === 'number' ? meta.resultsCount : data.length;
  const page = meta.page ?? 1;
  const limit = meta.limit ?? data.length ?? 20;
  return { data, metadata: { resultsCount: total, page, limit } };
};

const EntityService = {
  async list({ folderId, search, type, page = 1, limit = 20 } = {}) {
    const params = {};
    if (folderId) params.folder_id = folderId;
    if (search) params.q = search;
    if (type) params.type = type;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const resp = await api.get('/entities', { params });
    return mapListResponse(resp);
  },

  async get(id) {
    const resp = await api.get(`/entities/${id}`);
    return resp.data?.data ?? resp.data;
  },

  async create(payload) {
    const resp = await api.post('/entities', payload);
    return resp.data?.data ?? resp.data;
  },

  async update(id, payload) {
    const resp = await api.put(`/entities/${id}`, payload);
    return resp.data?.data ?? resp.data;
  },

  async remove(id) {
    const resp = await api.delete(`/entities/${id}`);
    return resp.data?.data ?? resp.data;
  },

  // ---- Entity Types ----
  async listTypes() {
    const resp = await api.get('/entity-types');
    // Attendu: { data: [ { key, label, attributes: [...] } ] }
    return resp.data?.data ?? resp.data ?? [];
  },

  async getType(key) {
    const resp = await api.get(`/entity-types/${encodeURIComponent(key)}`);
    return resp.data?.data ?? resp.data;
  }
};

export default EntityService;
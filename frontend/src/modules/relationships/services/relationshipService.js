// frontend/src/modules/relationships/services/relationshipService.js
import api from '../../../shared/services/api';

const RelationshipService = {
  async list({ entityId, type, page = 1, limit = 50 } = {}) {
    const params = {};
    if (entityId) params.entity_id = entityId;
    if (type) params.type = type;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const resp = await api.get('/relationships', { params });
    const data = resp?.data?.data ?? resp?.data ?? [];
    const meta = resp?.data?.metadata ?? {};
    return { data, metadata: meta };
  },

  async get(id) {
    const resp = await api.get(`/relationships/${id}`);
    return resp?.data?.data ?? resp?.data;
  },

  async create(payload) {
    const resp = await api.post('/relationships', payload);
    return resp?.data?.data ?? resp?.data;
  },

  async update(id, payload) {
    const resp = await api.put(`/relationships/${id}`, payload);
    return resp?.data?.data ?? resp?.data;
  },

  async remove(id) {
    const resp = await api.delete(`/relationships/${id}`);
    return resp?.data?.data ?? resp?.data;
  }
};

export default RelationshipService;
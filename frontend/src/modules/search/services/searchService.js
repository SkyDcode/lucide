// frontend/src/modules/search/services/searchService.js
import api from '../../../shared/services/api';

export async function searchEntities({ q, folderId, type, limit = 20, offset = 0 }) {
  const { data } = await api.get('/api/entities/search', { params: { q, folderId, type, limit, offset } });
  return data.results || [];
}
// frontend/src/modules/export/services/exportService.js
import api from '../../../shared/services/api';

export async function downloadEntityPDF(entityId) {
  const resp = await api.get(`/api/export/entity/${entityId}/pdf`, { responseType: 'blob' });
  return resp.data;
}

export async function downloadFolderPDF(folderId) {
  const resp = await api.get(`/api/export/folder/${folderId}/pdf`, { responseType: 'blob' });
  return resp.data;
}

export async function fetchEntityJSON(entityId) {
  const { data } = await api.get(`/api/export/entity/${entityId}/json`);
  return data;
}

export async function fetchFolderJSON(folderId) {
  const { data } = await api.get(`/api/export/folder/${folderId}/json`);
  return data;
}
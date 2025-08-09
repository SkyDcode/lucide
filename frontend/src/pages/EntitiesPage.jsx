// Extrait d'intégration — EntitiesPage.jsx (exemple)
import React from 'react';
import useSearch from '../modules/search/hooks/useSearch';
import SearchBar from '../modules/search/components/SearchBar';
import SearchResults from '../modules/search/components/SearchResults';

export default function EntitiesPage({ folderId }) {
  const { loading, error, results, search } = useSearch();

  return (
    <div className="space-y-4">
      <SearchBar onSearch={(p) => search({ ...p, folderId })} />
      {loading && <div>Recherche…</div>}
      {error && <div className="text-red-600">Erreur: {String(error.message || error)}</div>}
      <SearchResults results={results} onOpenEntity={(e) => {/* TODO: navigation vers détail */}} />
    </div>
  );
}
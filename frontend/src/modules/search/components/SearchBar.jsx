// frontend/src/modules/search/components/SearchBar.jsx
import React, { useState } from 'react';
import Button from '../../../components/ui/Button/Button';

export default function SearchBar({ onSearch, initialQuery = '', folderId, type }) {
  const [q, setQ] = useState(initialQuery);

  const submit = (e) => {
    e.preventDefault();
    onSearch && onSearch({ q, folderId, type });
  };

  return (
    <form onSubmit={submit} className="flex gap-2 items-center w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (nom, email, téléphone, URL, ...)"
        className="flex-1 border rounded px-3 py-2"
      />
      <Button type="submit">Rechercher</Button>
    </form>
  );
}
-- =============================================================================
-- SCHÉMA BASE DE DONNÉES LUCIDE
-- =============================================================================

-- Dossiers d'enquête
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entités flexibles
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    attributes TEXT DEFAULT '{}', -- JSON pour flexibilité
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

-- Relations entre entités
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity INTEGER NOT NULL,
    to_entity INTEGER NOT NULL,
    type TEXT DEFAULT 'connected',
    strength TEXT DEFAULT 'medium', -- weak, medium, strong
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_entity) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (to_entity) REFERENCES entities (id) ON DELETE CASCADE,
    UNIQUE(from_entity, to_entity, type)
);

-- Fichiers attachés aux entités
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_entities_folder ON entities(folder_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_id);

-- Données par défaut
INSERT OR IGNORE INTO folders (id, name, description) VALUES 
(1, 'Dossier de démonstration', 'Dossier d''exemple pour tester l''application');

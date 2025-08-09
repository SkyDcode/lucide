-- backend/database/schema.sql - Schéma complet base de données LUCIDE
-- Application OSINT pour Police Judiciaire

-- =============================================
-- 1. TABLE FOLDERS (Dossiers d'enquête)
-- =============================================
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(LENGTH(name) > 0),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. TABLE ENTITIES (Entités flexibles)
-- =============================================
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(LENGTH(type) > 0),
    name TEXT NOT NULL CHECK(LENGTH(name) > 0),
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    attributes TEXT DEFAULT '{}', -- JSON pour flexibilité maximale
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

-- =============================================
-- 3. TABLE RELATIONSHIPS (Relations entre entités)
-- =============================================
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity INTEGER NOT NULL,
    to_entity INTEGER NOT NULL,
    type TEXT DEFAULT 'connected' CHECK(LENGTH(type) > 0),
    strength TEXT DEFAULT 'medium' CHECK(strength IN ('weak', 'medium', 'strong')),
    description TEXT,
    attributes TEXT DEFAULT '{}', -- JSON pour données supplémentaires
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_entity) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (to_entity) REFERENCES entities (id) ON DELETE CASCADE,
    -- Éviter les relations en double
    UNIQUE(from_entity, to_entity, type),
    -- Éviter les auto-relations
    CHECK(from_entity != to_entity)
);

-- =============================================
-- 4. TABLE FILES (Fichiers attachés aux entités)
-- =============================================
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    filename TEXT NOT NULL CHECK(LENGTH(filename) > 0), -- Nom stockage
    original_name TEXT NOT NULL CHECK(LENGTH(original_name) > 0), -- Nom original
    path TEXT NOT NULL CHECK(LENGTH(path) > 0), -- Chemin complet
    size INTEGER DEFAULT 0 CHECK(size >= 0),
    mime_type TEXT,
    file_hash TEXT, -- SHA256 pour intégrité
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

-- =============================================
-- 5. TABLE TAGS (Étiquettes pour organisation)
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE CHECK(LENGTH(name) > 0),
    color TEXT DEFAULT '#6366f1',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. TABLE ENTITY_TAGS (Relation many-to-many)
-- =============================================
CREATE TABLE IF NOT EXISTS entity_tags (
    entity_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (entity_id, tag_id),
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

-- =============================================
-- 7. TABLE ACTIVITY_LOG (Journal d'activité)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    entity_id INTEGER,
    action TEXT NOT NULL CHECK(LENGTH(action) > 0), -- create, update, delete, merge
    details TEXT, -- JSON avec détails de l'action
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL,
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE SET NULL
);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================

-- Index sur les clés étrangères
CREATE INDEX IF NOT EXISTS idx_entities_folder ON entities(folder_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_folder ON activity_log(folder_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_id);

-- Index sur les timestamps pour tri
CREATE INDEX IF NOT EXISTS idx_folders_created ON folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_created ON entities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_updated ON entities(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_created ON relationships(created_at DESC);

-- Index de recherche textuelle
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);

-- Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_entities_folder_type ON entities(folder_id, type);
CREATE INDEX IF NOT EXISTS idx_relationships_entities ON relationships(from_entity, to_entity);

-- =============================================
-- TRIGGERS POUR MAINTENANCE AUTOMATIQUE
-- =============================================

-- Trigger mise à jour timestamp entities
CREATE TRIGGER IF NOT EXISTS update_entities_timestamp 
    AFTER UPDATE ON entities
    FOR EACH ROW
BEGIN
    UPDATE entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger mise à jour timestamp folders
CREATE TRIGGER IF NOT EXISTS update_folders_timestamp 
    AFTER UPDATE ON folders
    FOR EACH ROW
BEGIN
    UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger mise à jour timestamp relationships
CREATE TRIGGER IF NOT EXISTS update_relationships_timestamp 
    AFTER UPDATE ON relationships
    FOR EACH ROW
BEGIN
    UPDATE relationships SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================
-- VUES POUR REQUÊTES FRÉQUENTES
-- =============================================

-- Vue entités avec stats
CREATE VIEW IF NOT EXISTS entities_stats AS
SELECT 
    e.*,
    COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count,
    COUNT(DISTINCT f.id) as file_count,
    COUNT(DISTINCT et.tag_id) as tag_count
FROM entities e
LEFT JOIN relationships r1 ON e.id = r1.from_entity
LEFT JOIN relationships r2 ON e.id = r2.to_entity
LEFT JOIN files f ON e.id = f.entity_id
LEFT JOIN entity_tags et ON e.id = et.entity_id
GROUP BY e.id;

-- Vue dossiers avec stats
CREATE VIEW IF NOT EXISTS folders_stats AS
SELECT 
    f.*,
    COUNT(DISTINCT e.id) as entity_count,
    COUNT(DISTINCT r.id) as relationship_count,
    COUNT(DISTINCT fi.id) as file_count,
    MAX(e.updated_at) as last_activity
FROM folders f
LEFT JOIN entities e ON f.id = e.folder_id
LEFT JOIN relationships r ON e.id IN (r.from_entity, r.to_entity)
LEFT JOIN files fi ON e.id = fi.entity_id
GROUP BY f.id;

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Tags par défaut
INSERT OR IGNORE INTO tags (name, color, description) VALUES 
('Suspect Principal', '#ef4444', 'Personne suspecte principale de l''enquête'),
('Témoin', '#10b981', 'Témoin de l''affaire'),
('Victime', '#f59e0b', 'Victime de l''affaire'),
('Lieu Crime', '#dc2626', 'Lieu où le crime a été commis'),
('Preuve', '#8b5cf6', 'Élément de preuve'),
('Contact', '#06b6d4', 'Contact ou relation'),
('Véhicule Suspect', '#f97316', 'Véhicule impliqué'),
('Organisation', '#6366f1', 'Organisation ou entreprise'),
('Événement Clé', '#ec4899', 'Événement important'),
('À Vérifier', '#64748b', 'Information à vérifier');

-- =============================================
-- COMMENTAIRES TECHNIQUES
-- =============================================

/*
CHOIX DE CONCEPTION :

1. FLEXIBILITÉ MAXIMALE
   - Champ 'attributes' JSON pour éviter migrations
   - Types d'entités configurables via code
   - Relations typées et extensibles

2. PERFORMANCE
   - Index optimisés pour requêtes fréquentes
   - Vues pré-calculées pour stats
   - Triggers automatiques

3. INTÉGRITÉ
   - Contraintes CHECK pour validation
   - Clés étrangères avec CASCADE
   - Triggers de mise à jour timestamp

4. TRAÇABILITÉ
   - Journal d'activité complet
   - Timestamps sur toutes les tables
   - Hash des fichiers pour intégrité

5. ÉVOLUTIVITÉ
   - Structure extensible sans migration
   - Support futur recherche full-text
   - Prêt pour fonctionnalités avancées
*/
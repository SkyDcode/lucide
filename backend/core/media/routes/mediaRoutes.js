// backend/core/media/routes/mediaRoutes.js - Routes Media pour LUCIDE

const express = require('express');
const MediaController = require('../controllers/MediaController');
const { entityUpload, handleMulterError } = require('../../../config/multer');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');

const router = express.Router();

/**
 * ================================
 * ROUTES UPLOAD DE FICHIERS
 * ================================
 */

/**
 * @route   POST /api/media/upload/:entityId
 * @desc    Uploader un ou plusieurs fichiers pour une entité
 * @access  Public (à sécuriser selon les besoins)
 * @param   {number} entityId - ID de l'entité
 * @body    {FileList} files - Fichiers à uploader
 */
router.post('/upload/:entityId', 
  entityUpload.array('files', 10), // Maximum 10 fichiers par requête
  handleMulterError,
  MediaController.uploadFiles
);

/**
 * @route   POST /api/media/upload-single/:entityId
 * @desc    Uploader un seul fichier pour une entité
 * @access  Public
 * @param   {number} entityId - ID de l'entité
 * @body    {File} file - Fichier à uploader
 */
router.post('/upload-single/:entityId',
  entityUpload.single('file'),
  handleMulterError,
  MediaController.uploadFiles
);

/**
 * ================================
 * ROUTES RÉCUPÉRATION DE FICHIERS
 * ================================
 */

/**
 * @route   GET /api/media/entity/:entityId
 * @desc    Récupérer tous les fichiers d'une entité
 * @access  Public
 * @param   {number} entityId - ID de l'entité
 * @query   {string} orderBy - Champ de tri (created_at, name, size, mime_type)
 * @query   {string} direction - Direction du tri (ASC, DESC)
 * @query   {string} mimeType - Filtrer par type MIME
 * @query   {string} search - Terme de recherche
 */
router.get('/entity/:entityId', MediaController.getEntityFiles);

/**
 * @route   GET /api/media/:id
 * @desc    Récupérer les métadonnées d'un fichier par son ID
 * @access  Public
 * @param   {number} id - ID du fichier
 */
router.get('/:id', MediaController.getFile);

/**
 * @route   GET /api/media/download/:id
 * @desc    Télécharger un fichier
 * @access  Public
 * @param   {number} id - ID du fichier
 * @query   {boolean} inline - Afficher en ligne (true) ou télécharger (false)
 */
router.get('/download/:id', MediaController.downloadFile);

/**
 * @route   HEAD /api/media/download/:id
 * @desc    Obtenir les informations d'un fichier sans le télécharger
 * @access  Public
 * @param   {number} id - ID du fichier
 */
router.head('/download/:id', MediaController.getFileInfo);

/**
 * @route   GET /api/media/thumbnail/:id
 * @desc    Obtenir la miniature d'une image
 * @access  Public
 * @param   {number} id - ID du fichier image
 */
router.get('/thumbnail/:id', MediaController.getThumbnail);

/**
 * ================================
 * ROUTES RECHERCHE ET STATISTIQUES
 * ================================
 */

/**
 * @route   GET /api/media/search
 * @desc    Rechercher des fichiers
 * @access  Public
 * @query   {string} q - Terme de recherche (obligatoire)
 * @query   {number} folder_id - ID du dossier (0 = tous)
 * @query   {string} mime_type - Filtrer par type MIME
 * @query   {number} min_size - Taille minimale en bytes
 * @query   {number} max_size - Taille maximale en bytes
 * @query   {number} limit - Limite de résultats (défaut: 50)
 */
router.get('/search', MediaController.searchFiles);

/**
 * @route   GET /api/media/statistics
 * @desc    Obtenir les statistiques de stockage
 * @access  Public
 * @query   {number} entity_id - ID de l'entité (optionnel)
 */
router.get('/statistics', MediaController.getStorageStatistics);

/**
 * ================================
 * ROUTES MODIFICATION DE FICHIERS
 * ================================
 */

/**
 * @route   PUT /api/media/:id
 * @desc    Mettre à jour les métadonnées d'un fichier
 * @access  Public
 * @param   {number} id - ID du fichier
 * @body    {string} original_name - Nouveau nom original du fichier
 */
router.put('/:id', MediaController.updateFile);

/**
 * @route   DELETE /api/media/:id
 * @desc    Supprimer un fichier
 * @access  Public
 * @param   {number} id - ID du fichier
 */
router.delete('/:id', MediaController.deleteFile);

/**
 * ================================
 * ROUTES GESTION AVANCÉE
 * ================================
 */

/**
 * @route   POST /api/media/:id/duplicate
 * @desc    Dupliquer un fichier vers une autre entité
 * @access  Public
 * @param   {number} id - ID du fichier à dupliquer
 * @body    {number} target_entity_id - ID de l'entité cible
 */
router.post('/:id/duplicate', MediaController.duplicateFile);

/**
 * @route   POST /api/media/:id/move
 * @desc    Déplacer un fichier vers une autre entité
 * @access  Public
 * @param   {number} id - ID du fichier à déplacer
 * @body    {number} target_entity_id - ID de l'entité cible
 */
router.post('/:id/move', MediaController.moveFile);

/**
 * @route   GET /api/media/:id/history
 * @desc    Obtenir l'historique des modifications d'un fichier
 * @access  Public
 * @param   {number} id - ID du fichier
 */
router.get('/:id/history', MediaController.getFileHistory);

/**
 * ================================
 * ROUTES BATCH OPERATIONS
 * ================================
 */

/**
 * @route   POST /api/media/batch
 * @desc    Effectuer des opérations en lot sur plusieurs fichiers
 * @access  Public
 * @body    {string} operation - Opération à effectuer (delete, move, duplicate)
 * @body    {number[]} file_ids - Liste des IDs de fichiers
 * @body    {number} target_entity_id - ID de l'entité cible (pour move/duplicate)
 */
router.post('/batch', MediaController.batchOperations);

/**
 * ================================
 * ROUTES MAINTENANCE ET NETTOYAGE
 * ================================
 */

/**
 * @route   POST /api/media/cleanup/orphaned
 * @desc    Nettoyer les fichiers orphelins (sans entité parent)
 * @access  Admin (à sécuriser)
 */
router.post('/cleanup/orphaned', MediaController.cleanupOrphanedFiles);

/**
 * @route   POST /api/media/cleanup/temp
 * @desc    Nettoyer les fichiers temporaires anciens
 * @access  Admin (à sécuriser)
 * @body    {number} max_age_hours - Âge maximum en heures (défaut: 24)
 */
router.post('/cleanup/temp', MediaController.cleanupTempFiles);

/**
 * @route   POST /api/media/verify/:entityId
 * @desc    Vérifier l'intégrité des fichiers d'une entité
 * @access  Public
 * @param   {number} entityId - ID de l'entité
 */
router.post('/verify/:entityId', MediaController.verifyEntityFiles);

/**
 * ================================
 * MIDDLEWARE DE GESTION D'ERREURS
 * ================================
 */

// Middleware spécifique pour les erreurs de routes media
router.use((error, req, res, next) => {
  // Log spécifique pour les erreurs media
  console.error('Media route error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack
  });

  // Passer au middleware d'erreur global
  next(error);
});

module.exports = router;
// backend/core/entities/services/EntityMergeService.js - Service de fusion d'entités LUCIDE
const EntityModel = require('../models/EntityModel');
const RelationshipService = require('../../relationships/services/RelationshipService');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');
const DatabaseUtils = require('../../../shared/utils/database');

/**
 * Service métier pour la fusion d'entités OSINT
 * Gère la logique complexe de fusion en préservant l'intégrité des données
 */
class EntityMergeService {

  /**
   * Analyser deux entités pour déterminer leur compatibilité de fusion
   * @param {number} sourceEntityId - ID entité source (sera supprimée)
   * @param {number} targetEntityId - ID entité cible (restera)
   * @returns {Promise<Object>} Analyse de compatibilité
   */
  static async analyzeMergeCompatibility(sourceEntityId, targetEntityId) {
    try {
      logger.info('Analyzing merge compatibility', { sourceEntityId, targetEntityId });

      // Validation des IDs
      if (!sourceEntityId || !targetEntityId) {
        throw new ValidationError('IDs des entités source et cible requis');
      }

      if (sourceEntityId === targetEntityId) {
        throw new ValidationError('Une entité ne peut pas être fusionnée avec elle-même');
      }

      // Récupérer les entités
      const [sourceEntity, targetEntity] = await Promise.all([
        EntityModel.findById(sourceEntityId),
        EntityModel.findById(targetEntityId)
      ]);

      if (!sourceEntity) {
        throw new NotFoundError('Entité source', sourceEntityId);
      }
      if (!targetEntity) {
        throw new NotFoundError('Entité cible', targetEntityId);
      }

      // Vérifications de compatibilité
      const compatibility = await this.checkMergeCompatibility(sourceEntity, targetEntity);

      // Analyser les conflits potentiels
      const conflicts = await this.analyzeAttributeConflicts(sourceEntity, targetEntity);

      // Analyser l'impact sur les relations
      const relationshipImpact = await this.analyzeRelationshipImpact(sourceEntityId, targetEntityId);

      // Calculer le score de confiance de fusion
      const confidenceScore = this.calculateMergeConfidence(compatibility, conflicts, relationshipImpact);

      const analysis = {
        compatible: compatibility.compatible,
        confidence: confidenceScore,
        sourceEntity: {
          id: sourceEntity.id,
          name: sourceEntity.name,
          type: sourceEntity.type,
          connectionCount: sourceEntity.connection_count || 0
        },
        targetEntity: {
          id: targetEntity.id,
          name: targetEntity.name,
          type: targetEntity.type,
          connectionCount: targetEntity.connection_count || 0
        },
        compatibility,
        conflicts,
        relationshipImpact,
        recommendations: this.generateMergeRecommendations(compatibility, conflicts, relationshipImpact)
      };

      logger.info('Merge compatibility analysis completed', { 
        sourceEntityId, 
        targetEntityId, 
        compatible: analysis.compatible,
        confidence: analysis.confidence
      });

      return analysis;

    } catch (error) {
      logger.error('Error analyzing merge compatibility', { 
        sourceEntityId, targetEntityId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fusionner deux entités avec gestion complète des données
   * @param {number} sourceEntityId - ID entité source (sera supprimée)
   * @param {number} targetEntityId - ID entité cible (restera)
   * @param {Object} mergeOptions - Options de fusion
   * @returns {Promise<Object>} Résultat de la fusion
   */
  static async mergeEntities(sourceEntityId, targetEntityId, mergeOptions = {}) {
    try {
      logger.info('Starting entity merge', { sourceEntityId, targetEntityId, mergeOptions });

      const {
        preserveSourceName = false,
        mergeAttributes = 'target_priority', // 'source_priority', 'target_priority', 'merge_all'
        transferRelationships = true,
        deleteSource = true,
        createMergeLog = true
      } = mergeOptions;

      // Vérifier la compatibilité avant fusion
      const analysis = await this.analyzeMergeCompatibility(sourceEntityId, targetEntityId);
      
      if (!analysis.compatible) {
        throw new ValidationError(`Fusion impossible: ${analysis.compatibility.reasons.join(', ')}`);
      }

      // Effectuer la fusion dans une transaction
      const mergeResult = await DatabaseUtils.transaction(async () => {
        const [sourceEntity, targetEntity] = await Promise.all([
          EntityModel.findById(sourceEntityId),
          EntityModel.findById(targetEntityId)
        ]);

        // 1. Fusionner les attributs
        const mergedAttributes = await this.mergeEntityAttributes(
          sourceEntity, 
          targetEntity, 
          mergeAttributes
        );

        // 2. Préparer les données de mise à jour de l'entité cible
        const updateData = {
          attributes: mergedAttributes
        };

        // Préserver le nom de la source si demandé
        if (preserveSourceName) {
          updateData.name = sourceEntity.name;
        }

        // 3. Mettre à jour l'entité cible
        const updatedTargetEntity = await EntityModel.update(targetEntityId, updateData);

        // 4. Transférer les relations si demandé
        let relationshipResults = { transferred: [], merged: [], conflicts: [], deleted: [] };
        if (transferRelationships) {
          relationshipResults = await RelationshipService.mergeEntityRelationships(
            sourceEntityId, 
            targetEntityId
          );
        }

        // 5. Transférer les fichiers (placeholder pour futur module media)
        const fileTransferResults = await this.transferEntityFiles(sourceEntityId, targetEntityId);

        // 6. Créer le log de fusion si demandé
        let mergeLogId = null;
        if (createMergeLog) {
          mergeLogId = await this.createMergeLog(sourceEntity, targetEntity, mergeOptions);
        }

        // 7. Supprimer l'entité source si demandé
        let sourceDeleted = false;
        if (deleteSource) {
          sourceDeleted = await EntityModel.delete(sourceEntityId);
        }

        return {
          success: true,
          sourceEntity,
          targetEntity: updatedTargetEntity,
          mergedAttributes,
          relationshipResults,
          fileTransferResults,
          sourceDeleted,
          mergeLogId
        };
      });

      logger.success('Entity merge completed successfully', {
        sourceEntityId,
        targetEntityId,
        relationshipsTransferred: mergeResult.relationshipResults.transferred.length,
        relationshipsMerged: mergeResult.relationshipResults.merged.length,
        sourceDeleted: mergeResult.sourceDeleted
      });

      return {
        success: true,
        data: mergeResult,
        message: `Entités fusionnées avec succès: "${mergeResult.sourceEntity.name}" → "${mergeResult.targetEntity.name}"`
      };

    } catch (error) {
      logger.error('Error merging entities', { 
        sourceEntityId, targetEntityId, mergeOptions, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Suggérer des entités candidates pour la fusion
   * @param {number} entityId - ID de l'entité de référence
   * @param {Object} options - Options de suggestion
   * @returns {Promise<Object>} Entités candidates avec scores
   */
  static async suggestMergeCandidates(entityId, options = {}) {
    try {
      logger.info('Suggesting merge candidates', { entityId, options });

      const {
        sameTypeOnly = true,
        sameFolderOnly = true,
        minSimilarity = 0.5,
        maxCandidates = 10
      } = options;

      // Récupérer l'entité de référence
      const referenceEntity = await EntityModel.findById(entityId);
      if (!referenceEntity) {
        throw new NotFoundError('Entité', entityId);
      }

      // Construire les critères de recherche
      const searchCriteria = {};
      if (sameFolderOnly) {
        searchCriteria.folder_id = referenceEntity.folder_id;
      }
      if (sameTypeOnly) {
        searchCriteria.type = referenceEntity.type;
      }

      // Récupérer les entités candidates
      let candidates = [];
      if (sameFolderOnly) {
        candidates = await EntityModel.getByFolder(referenceEntity.folder_id, { type: sameTypeOnly ? referenceEntity.type : null });
      } else {
        // Recherche élargie (à implémenter si nécessaire)
        candidates = await EntityModel.search(0, '', { type: sameTypeOnly ? referenceEntity.type : null, limit: 100 });
      }

      // Exclure l'entité de référence
      candidates = candidates.filter(c => c.id !== entityId);

      // Calculer les scores de similarité
      const candidatesWithScores = await Promise.all(
        candidates.map(async candidate => {
          const similarity = await this.calculateEntitySimilarity(referenceEntity, candidate);
          const compatibility = await this.checkMergeCompatibility(referenceEntity, candidate);
          
          return {
            entity: candidate,
            similarity,
            compatibility: compatibility.compatible,
            score: this.calculateMergeCandidateScore(similarity, compatibility),
            reasons: this.getMergeSuggestionReasons(referenceEntity, candidate, similarity)
          };
        })
      );

      // Filtrer et trier par score
      const filteredCandidates = candidatesWithScores
        .filter(c => c.score >= minSimilarity && c.compatibility)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCandidates);

      logger.info('Merge candidates suggested', { 
        entityId, 
        totalCandidates: candidates.length,
        filteredCandidates: filteredCandidates.length 
      });

      return {
        referenceEntity,
        candidates: filteredCandidates,
        metadata: {
          totalEvaluated: candidates.length,
          filteredCount: filteredCandidates.length,
          criteria: { sameTypeOnly, sameFolderOnly, minSimilarity }
        }
      };

    } catch (error) {
      logger.error('Error suggesting merge candidates', { 
        entityId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Annuler une fusion (si possible)
   * @param {number} mergeLogId - ID du log de fusion
   * @returns {Promise<Object>} Résultat de l'annulation
   */
  static async undoMerge(mergeLogId) {
    try {
      logger.info('Undoing entity merge', { mergeLogId });

      // Récupérer le log de fusion
      const mergeLog = await this.getMergeLog(mergeLogId);
      if (!mergeLog) {
        throw new NotFoundError('Log de fusion', mergeLogId);
      }

      // Vérifier si l'annulation est possible
      if (!this.canUndoMerge(mergeLog)) {
        throw new ValidationError('Cette fusion ne peut pas être annulée');
      }

      // Effectuer l'annulation dans une transaction
      const undoResult = await DatabaseUtils.transaction(async () => {
        // 1. Recréer l'entité source
        const restoredEntity = await EntityModel.create({
          folder_id: mergeLog.source_entity.folder_id,
          type: mergeLog.source_entity.type,
          name: mergeLog.source_entity.name,
          x: mergeLog.source_entity.x || 0,
          y: mergeLog.source_entity.y || 0,
          attributes: mergeLog.source_entity.attributes || {}
        });

        // 2. Restaurer les attributs de l'entité cible si nécessaire
        if (mergeLog.target_entity_backup) {
          await EntityModel.update(mergeLog.target_entity_id, {
            attributes: mergeLog.target_entity_backup.attributes
          });
        }

        // 3. Restaurer les relations (placeholder)
        // TODO: Implémenter la restauration des relations

        return {
          restoredEntity,
          targetEntityRestored: !!mergeLog.target_entity_backup
        };
      });

      // Marquer le log comme annulé
      await this.markMergeAsUndone(mergeLogId);

      logger.success('Entity merge undone successfully', { 
        mergeLogId, 
        restoredEntityId: undoResult.restoredEntity.id 
      });

      return {
        success: true,
        data: undoResult,
        message: 'Fusion annulée avec succès'
      };

    } catch (error) {
      logger.error('Error undoing entity merge', { 
        mergeLogId, error: error.message 
      });
      throw error;
    }
  }

  // ===========================================
  // MÉTHODES PRIVÉES
  // ===========================================

  /**
   * Vérifier la compatibilité de fusion entre deux entités
   * @private
   */
  static async checkMergeCompatibility(sourceEntity, targetEntity) {
    const compatibility = {
      compatible: true,
      reasons: [],
      warnings: []
    };

    // Vérifier le type
    if (sourceEntity.type !== targetEntity.type) {
      compatibility.compatible = false;
      compatibility.reasons.push(`Types incompatibles: ${sourceEntity.type} ≠ ${targetEntity.type}`);
    }

    // Vérifier le dossier
    if (sourceEntity.folder_id !== targetEntity.folder_id) {
      compatibility.warnings.push('Entités dans des dossiers différents');
    }

    // Vérifier les attributs critiques (si définis par le type)
    const criticalConflicts = await this.checkCriticalAttributeConflicts(sourceEntity, targetEntity);
    if (criticalConflicts.length > 0) {
      compatibility.compatible = false;
      compatibility.reasons.push(`Conflits d'attributs critiques: ${criticalConflicts.join(', ')}`);
    }

    return compatibility;
  }

  /**
   * Analyser les conflits d'attributs
   * @private
   */
  static async analyzeAttributeConflicts(sourceEntity, targetEntity) {
    const conflicts = [];
    const sourceAttrs = sourceEntity.attributes || {};
    const targetAttrs = targetEntity.attributes || {};

    // Trouver les attributs en conflit
    Object.keys(sourceAttrs).forEach(key => {
      if (key in targetAttrs && sourceAttrs[key] !== targetAttrs[key]) {
        conflicts.push({
          attribute: key,
          sourceValue: sourceAttrs[key],
          targetValue: targetAttrs[key],
          severity: this.getConflictSeverity(key, sourceAttrs[key], targetAttrs[key])
        });
      }
    });

    return conflicts;
  }

  /**
   * Analyser l'impact sur les relations
   * @private
   */
  static async analyzeRelationshipImpact(sourceEntityId, targetEntityId) {
    try {
      // Utiliser le service de relations pour analyser l'impact
      const sourceRelationships = await RelationshipService.getEntityRelationships(sourceEntityId);
      const targetRelationships = await RelationshipService.getEntityRelationships(targetEntityId);

      // Détecter les relations qui seront fusionnées
      const potentialMerges = [];
      const potentialConflicts = [];

      sourceRelationships.relationships.forEach(sourceRel => {
        const conflictingRel = targetRelationships.relationships.find(targetRel => 
          targetRel.connected_entity === sourceRel.connected_entity && 
          targetRel.type === sourceRel.type
        );

        if (conflictingRel) {
          potentialMerges.push({
            connectedEntity: sourceRel.connected_entity,
            type: sourceRel.type,
            sourceDescription: sourceRel.description,
            targetDescription: conflictingRel.description
          });
        }
      });

      return {
        sourceRelationshipsCount: sourceRelationships.relationships.length,
        targetRelationshipsCount: targetRelationships.relationships.length,
        potentialMerges,
        potentialConflicts
      };

    } catch (error) {
      logger.warn('Could not analyze relationship impact', { error: error.message });
      return {
        sourceRelationshipsCount: 0,
        targetRelationshipsCount: 0,
        potentialMerges: [],
        potentialConflicts: []
      };
    }
  }

  /**
   * Calculer le score de confiance de fusion
   * @private
   */
  static calculateMergeConfidence(compatibility, conflicts, relationshipImpact) {
    let score = 1.0;

    // Pénalité pour incompatibilité
    if (!compatibility.compatible) {
      return 0.0;
    }

    // Pénalité pour les avertissements
    score -= compatibility.warnings.length * 0.1;

    // Pénalité pour les conflits d'attributs
    score -= conflicts.length * 0.15;

    // Bonus/malus selon l'impact relationnel
    if (relationshipImpact.potentialMerges.length > 0) {
      score -= relationshipImpact.potentialMerges.length * 0.05; // Complexité de fusion
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Générer des recommandations de fusion
   * @private
   */
  static generateMergeRecommendations(compatibility, conflicts, relationshipImpact) {
    const recommendations = [];

    if (!compatibility.compatible) {
      recommendations.push({
        type: 'error',
        message: 'Fusion non recommandée',
        reason: compatibility.reasons.join(', ')
      });
      return recommendations;
    }

    if (conflicts.length > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Résoudre les conflits d\'attributs avant fusion',
        reason: `${conflicts.length} conflit(s) détecté(s)`
      });
    }

    if (relationshipImpact.potentialMerges.length > 0) {
      recommendations.push({
        type: 'info',
        message: 'Relations seront fusionnées automatiquement',
        reason: `${relationshipImpact.potentialMerges.length} relation(s) en doublon`
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Fusion recommandée',
        reason: 'Aucun conflit détecté'
      });
    }

    return recommendations;
  }

  /**
   * Fusionner les attributs de deux entités
   * @private
   */
  static async mergeEntityAttributes(sourceEntity, targetEntity, strategy) {
    const sourceAttrs = sourceEntity.attributes || {};
    const targetAttrs = targetEntity.attributes || {};
    let mergedAttributes = {};

    switch (strategy) {
      case 'source_priority':
        mergedAttributes = { ...targetAttrs, ...sourceAttrs };
        break;
      case 'target_priority':
        mergedAttributes = { ...sourceAttrs, ...targetAttrs };
        break;
      case 'merge_all':
        mergedAttributes = await this.intelligentAttributeMerge(sourceAttrs, targetAttrs);
        break;
      default:
        mergedAttributes = { ...sourceAttrs, ...targetAttrs };
    }

    return mergedAttributes;
  }

  /**
   * Fusion intelligente des attributs
   * @private
   */
  static async intelligentAttributeMerge(sourceAttrs, targetAttrs) {
    const merged = {};

    // Combiner toutes les clés
    const allKeys = new Set([...Object.keys(sourceAttrs), ...Object.keys(targetAttrs)]);

    allKeys.forEach(key => {
      const sourceValue = sourceAttrs[key];
      const targetValue = targetAttrs[key];

      if (sourceValue === undefined) {
        merged[key] = targetValue;
      } else if (targetValue === undefined) {
        merged[key] = sourceValue;
      } else if (sourceValue === targetValue) {
        merged[key] = sourceValue;
      } else {
        // Conflit : utiliser une stratégie de résolution
        merged[key] = this.resolveAttributeConflict(key, sourceValue, targetValue);
      }
    });

    return merged;
  }

  /**
   * Résoudre un conflit d'attribut
   * @private
   */
  static resolveAttributeConflict(key, sourceValue, targetValue) {
    // Stratégies selon le type d'attribut
    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Fusionner les tableaux en supprimant les doublons
      return [...new Set([...sourceValue, ...targetValue])];
    }

    if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
      // Concaténer les chaînes si différentes
      return sourceValue.length > targetValue.length ? sourceValue : targetValue;
    }

    // Par défaut, garder la valeur de la cible
    return targetValue;
  }

  /**
   * Calculer la similarité entre deux entités
   * @private
   */
  static async calculateEntitySimilarity(entity1, entity2) {
    let similarity = 0;
    let factors = 0;

    // Similarité de nom (Levenshtein distance)
    const nameSimilarity = this.calculateStringSimilarity(entity1.name, entity2.name);
    similarity += nameSimilarity * 0.4;
    factors += 0.4;

    // Même type
    if (entity1.type === entity2.type) {
      similarity += 0.3;
    }
    factors += 0.3;

    // Similarité d'attributs
    const attrSimilarity = this.calculateAttributeSimilarity(
      entity1.attributes || {}, 
      entity2.attributes || {}
    );
    similarity += attrSimilarity * 0.3;
    factors += 0.3;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculer la similarité entre deux chaînes
   * @private
   */
  static calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return maxLen > 0 ? 1 - (distance / maxLen) : 0;
  }

  /**
   * Calculer la similarité des attributs
   * @private
   */
  static calculateAttributeSimilarity(attrs1, attrs2) {
    const keys1 = new Set(Object.keys(attrs1));
    const keys2 = new Set(Object.keys(attrs2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    if (allKeys.size === 0) return 1; // Aucun attribut = parfaitement similaire
    
    let matchingKeys = 0;
    let totalKeys = allKeys.size;
    
    allKeys.forEach(key => {
      if (keys1.has(key) && keys2.has(key)) {
        if (attrs1[key] === attrs2[key]) {
          matchingKeys += 1;
        } else {
          matchingKeys += 0.5; // Clé présente mais valeur différente
        }
      }
    });
    
    return matchingKeys / totalKeys;
  }

  /**
   * Vérifier les conflits d'attributs critiques
   * @private
   */
  static async checkCriticalAttributeConflicts(sourceEntity, targetEntity) {
    // Liste des attributs critiques selon le type (à personnaliser)
    const criticalAttributes = {
      'person': ['email', 'phone'],
      'organization': ['siret', 'registration_number'],
      'place': ['coordinates', 'address']
    };

    const critical = criticalAttributes[sourceEntity.type] || [];
    const conflicts = [];

    const sourceAttrs = sourceEntity.attributes || {};
    const targetAttrs = targetEntity.attributes || {};

    critical.forEach(attr => {
      if (sourceAttrs[attr] && targetAttrs[attr] && sourceAttrs[attr] !== targetAttrs[attr]) {
        conflicts.push(attr);
      }
    });

    return conflicts;
  }

  /**
   * Obtenir la sévérité d'un conflit
   * @private
   */
  static getConflictSeverity(attributeName, sourceValue, targetValue) {
    // Attributs critiques
    const criticalAttrs = ['email', 'phone', 'siret', 'registration_number'];
    if (criticalAttrs.includes(attributeName)) {
      return 'high';
    }

    // Attributs importants
    const importantAttrs = ['address', 'website', 'description'];
    if (importantAttrs.includes(attributeName)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculer le score d'un candidat de fusion
   * @private
   */
  static calculateMergeCandidateScore(similarity, compatibility) {
    if (!compatibility.compatible) return 0;
    
    let score = similarity;
    
    // Bonus pour haute similarité
    if (similarity > 0.8) score += 0.1;
    
    // Malus pour avertissements
    score -= compatibility.warnings.length * 0.05;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Obtenir les raisons d'une suggestion de fusion
   * @private
   */
  static getMergeSuggestionReasons(referenceEntity, candidateEntity, similarity) {
    const reasons = [];

    if (similarity.name > 0.8) {
      reasons.push('Noms très similaires');
    }

    if (referenceEntity.type === candidateEntity.type) {
      reasons.push('Même type d\'entité');
    }

    if (referenceEntity.folder_id === candidateEntity.folder_id) {
      reasons.push('Même dossier d\'enquête');
    }

    return reasons;
  }

  /**
   * Transférer les fichiers d'une entité à une autre
   * @private
   */
  static async transferEntityFiles(sourceEntityId, targetEntityId) {
    try {
      // Placeholder pour le module media
      // TODO: Implémenter le transfert de fichiers quand le module sera disponible
      logger.info('File transfer placeholder', { sourceEntityId, targetEntityId });
      
      return {
        transferred: 0,
        errors: []
      };
    } catch (error) {
      logger.warn('Could not transfer entity files', { error: error.message });
      return {
        transferred: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Créer un log de fusion
   * @private
   */
  static async createMergeLog(sourceEntity, targetEntity, mergeOptions) {
    try {
      // Placeholder pour table de logs
      // TODO: Créer une table merge_logs quand nécessaire
      const logData = {
        timestamp: new Date().toISOString(),
        source_entity: {
          id: sourceEntity.id,
          name: sourceEntity.name,
          type: sourceEntity.type,
          folder_id: sourceEntity.folder_id,
          attributes: sourceEntity.attributes
        },
        target_entity_id: targetEntity.id,
        target_entity_backup: {
          name: targetEntity.name,
          attributes: targetEntity.attributes
        },
        merge_options: mergeOptions
      };

      logger.info('Merge log created', { logData });
      
      // Retourner un ID fictif pour l'instant
      return Math.random().toString(36).substr(2, 9);
    } catch (error) {
      logger.warn('Could not create merge log', { error: error.message });
      return null;
    }
  }

  /**
   * Récupérer un log de fusion
   * @private
   */
  static async getMergeLog(mergeLogId) {
    // Placeholder
    return null;
  }

  /**
   * Vérifier si une fusion peut être annulée
   * @private
   */
  static canUndoMerge(mergeLog) {
    // Critères pour l'annulation (à personnaliser)
    const maxUndoAge = 24 * 60 * 60 * 1000; // 24 heures
    const logAge = Date.now() - new Date(mergeLog.timestamp).getTime();
    
    return logAge < maxUndoAge && !mergeLog.undone;
  }

  /**
   * Marquer une fusion comme annulée
   * @private
   */
  static async markMergeAsUndone(mergeLogId) {
    // Placeholder
    logger.info('Merge marked as undone', { mergeLogId });
  }

  /**
   * Analyser une entité pour générer des suggestions de fusion intelligentes
   * @param {Object} entity - Entité à analyser
   * @returns {Array} Suggestions d'amélioration
   * @private
   */
  static analyzeEntityForSuggestions(entity) {
    const suggestions = [];

    // Analyser les attributs pour détecter des patterns de fusion
    if (entity.attributes) {
      Object.entries(entity.attributes).forEach(([key, value]) => {
        if (typeof value === 'string') {
          // Détecter les valeurs similaires qui pourraient indiquer des doublons
          if (value.includes('(') && value.includes(')')) {
            suggestions.push({
              type: 'duplicate_indicator',
              message: 'Valeur avec parenthèses détectée',
              attribute: key,
              value: value,
              suggestion: 'Vérifier s\'il s\'agit d\'un doublon avec notation'
            });
          }

          // Détecter les formats standardisés
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            suggestions.push({
              type: 'date_format',
              message: 'Format de date détecté',
              attribute: key,
              suggestion: 'Standardiser le format de date'
            });
          }
        }
      });
    }

    return suggestions;
  }

  /**
   * Logger une action de fusion pour audit
   * @param {string} action - Action effectuée
   * @param {Object} details - Détails de l'action
   * @param {Object} user - Utilisateur (pour extension future)
   * @private
   */
  static async logMergeAction(action, details, user = null) {
    try {
      logger.info(`Merge action: ${action}`, {
        action,
        details,
        user: user ? user.id : 'system',
        timestamp: new Date().toISOString(),
        module: 'EntityMergeService'
      });
    } catch (error) {
      logger.warn('Could not log merge action', { 
        action, 
        error: error.message 
      });
    }
  }
}

module.exports = EntityMergeService;
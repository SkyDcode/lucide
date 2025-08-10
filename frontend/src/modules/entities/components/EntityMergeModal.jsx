// frontend/src/modules/entities/components/EntityMergeModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import useEntityMerge from '../hooks/useEntityMerge';
import './EntityMergeModal.css';

/**
 * Modal de fusion d'entités avec interface intuitive
 */
const EntityMergeModal = ({
  isOpen = false,
  onClose,
  sourceEntity,
  targetEntity,
  onMergeComplete,
  onMergeError,
  showCandidates = true
}) => {
  const [step, setStep] = useState('select'); // 'select', 'analyze', 'configure', 'preview', 'executing'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [mergeOptions, setMergeOptions] = useState({
    preserveSourceName: false,
    mergeAttributes: 'target_priority',
    transferRelationships: true,
    deleteSource: true,
    createMergeLog: true
  });

  const {
    loading,
    error,
    analysis,
    candidates,
    analyzeMergeCompatibility,
    executeMerge,
    getMergeCandidates,
    previewMerge,
    clearState
  } = useEntityMerge();

  // Réinitialiser lors de l'ouverture/fermeture
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedCandidate(null);
      clearState();
      
      // Si une entité cible est déjà fournie, passer à l'analyse
      if (sourceEntity && targetEntity) {
        setStep('analyze');
        analyzeEntities(sourceEntity.id, targetEntity.id);
      } else if (sourceEntity && showCandidates) {
        // Rechercher des candidats automatiquement
        loadCandidates();
      }
    } else {
      clearState();
    }
  }, [isOpen, sourceEntity, targetEntity, showCandidates, clearState]);

  /**
   * Charger les candidats de fusion
   */
  const loadCandidates = useCallback(async () => {
    if (!sourceEntity) return;

    try {
      await getMergeCandidates(sourceEntity.id, {
        sameTypeOnly: true,
        sameFolderOnly: true,
        minSimilarity: 0.5,
        maxCandidates: 10
      });
    } catch (err) {
      console.error('Error loading candidates:', err);
    }
  }, [sourceEntity, getMergeCandidates]);

  /**
   * Analyser deux entités
   */
  const analyzeEntities = useCallback(async (sourceId, targetId) => {
    try {
      setStep('analyze');
      await analyzeMergeCompatibility(sourceId, targetId);
      setStep('configure');
    } catch (err) {
      onMergeError?.(err);
    }
  }, [analyzeMergeCompatibility, onMergeError]);

  /**
   * Sélectionner un candidat
   */
  const handleCandidateSelect = useCallback((candidate) => {
    setSelectedCandidate(candidate);
    analyzeEntities(sourceEntity.id, candidate.entity.id);
  }, [sourceEntity, analyzeEntities]);

  /**
   * Prévisualiser la fusion
   */
  const handlePreview = useCallback(async () => {
    const targetId = targetEntity?.id || selectedCandidate?.entity?.id;
    if (!sourceEntity || !targetId) return;

    try {
      setStep('preview');
      await previewMerge(sourceEntity.id, targetId, mergeOptions);
    } catch (err) {
      onMergeError?.(err);
    }
  }, [sourceEntity, targetEntity, selectedCandidate, mergeOptions, previewMerge, onMergeError]);

  /**
   * Exécuter la fusion
   */
  const handleExecuteMerge = useCallback(async () => {
    const targetId = targetEntity?.id || selectedCandidate?.entity?.id;
    if (!sourceEntity || !targetId) return;

    try {
      setStep('executing');
      const result = await executeMerge(sourceEntity.id, targetId, mergeOptions);
      onMergeComplete?.(result);
      onClose?.();
    } catch (err) {
      onMergeError?.(err);
      setStep('configure');
    }
  }, [sourceEntity, targetEntity, selectedCandidate, mergeOptions, executeMerge, onMergeComplete, onClose, onMergeError]);

  /**
   * Actions du pied de page selon l'étape
   */
  const getFooterActions = () => {
    const actions = [];

    // Bouton Annuler/Fermer
    actions.push({
      key: 'cancel',
      label: step === 'executing' ? 'Fermer' : 'Annuler',
      variant: 'secondary',
      onClick: onClose,
      disabled: step === 'executing'
    });

    // Boutons spécifiques selon l'étape
    switch (step) {
      case 'configure':
        if (analysis?.compatible) {
          actions.push({
            key: 'preview',
            label: 'Aperçu',
            variant: 'primary',
            onClick: handlePreview,
            disabled: loading
          });
        }
        break;

      case 'preview':
        actions.push({
          key: 'back',
          label: 'Retour',
          variant: 'secondary',
          onClick: () => setStep('configure')
        });
        actions.push({
          key: 'execute',
          label: 'Fusionner',
          variant: 'primary',
          onClick: handleExecuteMerge,
          disabled: loading
        });
        break;

      case 'executing':
        actions.push({
          key: 'executing',
          label: 'Fusion en cours...',
          variant: 'primary',
          disabled: true,
          loading: true
        });
        break;
    }

    return actions;
  };

  /**
   * Rendu de l'étape de sélection
   */
  const renderSelectionStep = () => (
    <div className="entity-merge-selection">
      <div className="source-entity">
        <h3>Entité source</h3>
        <div className="entity-card">
          <div className="entity-info">
            <span className="entity-name">{sourceEntity?.name}</span>
            <span className="entity-type">{sourceEntity?.type}</span>
          </div>
        </div>
      </div>

      {showCandidates && (
        <div className="candidates-section">
          <h3>Candidats de fusion suggérés</h3>
          {loading ? (
            <div className="loading-message">Recherche de candidats...</div>
          ) : candidates.length > 0 ? (
            <div className="candidates-list">
              {candidates.map((candidate, index) => (
                <div
                  key={candidate.entity.id}
                  className="candidate-card"
                  onClick={() => handleCandidateSelect(candidate)}
                >
                  <div className="candidate-info">
                    <span className="candidate-name">{candidate.entity.name}</span>
                    <span className="candidate-type">{candidate.entity.type}</span>
                  </div>
                  <div className="candidate-score">
                    <span className="score-value">{Math.round(candidate.score * 100)}%</span>
                    <span className="score-label">similarité</span>
                  </div>
                  <div className="candidate-reasons">
                    {candidate.reasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="reason-tag">{reason}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-candidates">
              Aucun candidat de fusion trouvé pour cette entité.
            </div>
          )}
        </div>
      )}
    </div>
  );

  /**
   * Rendu de l'étape d'analyse
   */
  const renderAnalysisStep = () => (
    <div className="entity-merge-analysis">
      <div className="analysis-header">
        <h3>Analyse de compatibilité</h3>
        {loading && <div className="loading-spinner">Analyse en cours...</div>}
      </div>
      
      {analysis && (
        <div className="analysis-results">
          <div className={`compatibility-status ${analysis.compatible ? 'compatible' : 'incompatible'}`}>
            <span className="status-icon">
              {analysis.compatible ? '✓' : '✗'}
            </span>
            <span className="status-text">
              {analysis.compatible ? 'Entités compatibles' : 'Entités incompatibles'}
            </span>
            <span className="confidence-score">
              Confiance: {Math.round(analysis.confidence * 100)}%
            </span>
          </div>

          {analysis.compatibility.reasons.length > 0 && (
            <div className="compatibility-reasons">
              <h4>Raisons d'incompatibilité:</h4>
              <ul>
                {analysis.compatibility.reasons.map((reason, index) => (
                  <li key={index} className="reason-item error">{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.compatibility.warnings.length > 0 && (
            <div className="compatibility-warnings">
              <h4>Avertissements:</h4>
              <ul>
                {analysis.compatibility.warnings.map((warning, index) => (
                  <li key={index} className="warning-item">{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /**
   * Rendu de l'étape de configuration
   */
  const renderConfigurationStep = () => (
    <div className="entity-merge-configuration">
      <div className="entities-summary">
        <div className="entity-summary source">
          <h4>Source (sera supprimée)</h4>
          <div className="entity-details">
            <span className="name">{analysis?.sourceEntity?.name}</span>
            <span className="type">{analysis?.sourceEntity?.type}</span>
            <span className="connections">{analysis?.sourceEntity?.connectionCount} connexions</span>
          </div>
        </div>
        
        <div className="merge-arrow">→</div>
        
        <div className="entity-summary target">
          <h4>Cible (sera conservée)</h4>
          <div className="entity-details">
            <span className="name">{analysis?.targetEntity?.name}</span>
            <span className="type">{analysis?.targetEntity?.type}</span>
            <span className="connections">{analysis?.targetEntity?.connectionCount} connexions</span>
          </div>
        </div>
      </div>

      <div className="merge-options">
        <h4>Options de fusion</h4>
        
        <div className="option-group">
          <label className="option-label">
            <input
              type="checkbox"
              checked={mergeOptions.preserveSourceName}
              onChange={(e) => setMergeOptions(prev => ({
                ...prev,
                preserveSourceName: e.target.checked
              }))}
            />
            Conserver le nom de l'entité source
          </label>
        </div>

        <div className="option-group">
          <label className="option-label">Stratégie de fusion des attributs:</label>
          <select
            value={mergeOptions.mergeAttributes}
            onChange={(e) => setMergeOptions(prev => ({
              ...prev,
              mergeAttributes: e.target.value
            }))}
            className="option-select"
          >
            <option value="target_priority">Priorité à la cible</option>
            <option value="source_priority">Priorité à la source</option>
            <option value="merge_all">Fusion intelligente</option>
          </select>
        </div>

        <div className="option-group">
          <label className="option-label">
            <input
              type="checkbox"
              checked={mergeOptions.transferRelationships}
              onChange={(e) => setMergeOptions(prev => ({
                ...prev,
                transferRelationships: e.target.checked
              }))}
            />
            Transférer les relations ({analysis?.relationshipImpact?.sourceRelationshipsCount || 0} relations)
          </label>
        </div>

        <div className="option-group">
          <label className="option-label">
            <input
              type="checkbox"
              checked={mergeOptions.deleteSource}
              onChange={(e) => setMergeOptions(prev => ({
                ...prev,
                deleteSource: e.target.checked
              }))}
            />
            Supprimer l'entité source après fusion
          </label>
        </div>
      </div>

      {analysis?.conflicts && analysis.conflicts.length > 0 && (
        <div className="conflicts-section">
          <h4>Conflits d'attributs détectés</h4>
          <div className="conflicts-list">
            {analysis.conflicts.map((conflict, index) => (
              <div key={index} className={`conflict-item ${conflict.severity}`}>
                <span className="conflict-attribute">{conflict.attribute}</span>
                <div className="conflict-values">
                  <span className="source-value">Source: {conflict.sourceValue}</span>
                  <span className="target-value">Cible: {conflict.targetValue}</span>
                </div>
                <span className="conflict-severity">{conflict.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis?.recommendations && (
        <div className="recommendations-section">
          <h4>Recommandations</h4>
          <div className="recommendations-list">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className={`recommendation ${rec.type}`}>
                <span className="rec-icon">
                  {rec.type === 'error' ? '⚠️' : rec.type === 'warning' ? '⚡' : 'ℹ️'}
                </span>
                <div className="rec-content">
                  <span className="rec-message">{rec.message}</span>
                  <span className="rec-reason">{rec.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Rendu de l'étape de prévisualisation
   */
  const renderPreviewStep = () => (
    <div className="entity-merge-preview">
      <h3>Aperçu de la fusion</h3>
      
      <div className="preview-summary">
        <div className="preview-item">
          <span className="preview-label">Entité résultante:</span>
          <span className="preview-value">
            {mergeOptions.preserveSourceName ? analysis?.sourceEntity?.name : analysis?.targetEntity?.name}
          </span>
        </div>
        
        <div className="preview-item">
          <span className="preview-label">Type:</span>
          <span className="preview-value">{analysis?.targetEntity?.type}</span>
        </div>
        
        <div className="preview-item">
          <span className="preview-label">Relations à transférer:</span>
          <span className="preview-value">{analysis?.relationshipImpact?.sourceRelationshipsCount || 0}</span>
        </div>
        
        <div className="preview-item">
          <span className="preview-label">Relations à fusionner:</span>
          <span className="preview-value">{analysis?.relationshipImpact?.potentialMerges?.length || 0}</span>
        </div>
      </div>

      <div className="preview-actions-summary">
        <h4>Actions qui seront effectuées:</h4>
        <ul className="actions-list">
          <li>✓ Fusion des attributs selon la stratégie sélectionnée</li>
          {mergeOptions.transferRelationships && (
            <li>✓ Transfert des relations vers l'entité cible</li>
          )}
          {mergeOptions.deleteSource && (
            <li>✓ Suppression de l'entité source</li>
          )}
          {mergeOptions.createMergeLog && (
            <li>✓ Création d'un log de fusion pour traçabilité</li>
          )}
        </ul>
      </div>

      <div className="preview-warning">
        <strong>⚠️ Attention:</strong> Cette action est irréversible. 
        Assurez-vous que les paramètres de fusion sont corrects.
      </div>
    </div>
  );

  /**
   * Rendu de l'étape d'exécution
   */
  const renderExecutionStep = () => (
    <div className="entity-merge-execution">
      <div className="execution-status">
        <div className="loading-spinner large"></div>
        <h3>Fusion en cours...</h3>
        <p>Veuillez patienter pendant la fusion des entités.</p>
      </div>
    </div>
  );

  /**
   * Rendu du contenu selon l'étape
   */
  const renderStepContent = () => {
    if (error) {
      return (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              clearState();
              setStep('select');
            }}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    switch (step) {
      case 'select':
        return renderSelectionStep();
      case 'analyze':
        return renderAnalysisStep();
      case 'configure':
        return renderConfigurationStep();
      case 'preview':
        return renderPreviewStep();
      case 'executing':
        return renderExecutionStep();
      default:
        return <div>Étape inconnue</div>;
    }
  };

  /**
   * Titre de la modal selon l'étape
   */
  const getModalTitle = () => {
    switch (step) {
      case 'select':
        return 'Sélectionner une entité à fusionner';
      case 'analyze':
        return 'Analyse de compatibilité';
      case 'configure':
        return 'Configuration de la fusion';
      case 'preview':
        return 'Aperçu de la fusion';
      case 'executing':
        return 'Fusion en cours';
      default:
        return 'Fusion d\'entités';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="large"
      footerActions={getFooterActions()}
      className="entity-merge-modal"
      closable={step !== 'executing'}
      overlayClosable={step !== 'executing'}
    >
      <div className="entity-merge-content">
        {/* Indicateur de progression */}
        <div className="progress-indicator">
          <div className={`step ${step === 'select' || step === 'analyze' ? 'active' : 'completed'}`}>
            1. Sélection
          </div>
          <div className={`step ${step === 'configure' ? 'active' : step === 'preview' || step === 'executing' ? 'completed' : ''}`}>
            2. Configuration
          </div>
          <div className={`step ${step === 'preview' ? 'active' : step === 'executing' ? 'completed' : ''}`}>
            3. Aperçu
          </div>
          <div className={`step ${step === 'executing' ? 'active' : ''}`}>
            4. Fusion
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="step-content">
          {renderStepContent()}
        </div>
      </div>
    </Modal>
  );
};

EntityMergeModal.propTypes = {
  /** État d'ouverture de la modal */
  isOpen: PropTypes.bool,
  
  /** Fonction de fermeture */
  onClose: PropTypes.func.isRequired,
  
  /** Entité source (obligatoire) */
  sourceEntity: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
  }),
  
  /** Entité cible (optionnelle, si non fournie, affiche les candidats) */
  targetEntity: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
  }),
  
  /** Callback appelé lors du succès de la fusion */
  onMergeComplete: PropTypes.func,
  
  /** Callback appelé lors d'une erreur */
  onMergeError: PropTypes.func,
  
  /** Afficher la section des candidats */
  showCandidates: PropTypes.bool
};

export default EntityMergeModal;
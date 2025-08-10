// frontend/src/modules/export/components/ExportModal.jsx - Modal d'export avancée LUCIDE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import Select from '../../../components/ui/Form/Select';
import useExport, { useExportTemplates, useExportPreview } from '../hooks/useExport';
import './ExportModal.css';

/**
 * Modal d'export complète avec options avancées et prévisualisation
 */
const ExportModal = ({
  isOpen = false,
  onClose,
  entityId = null,
  folderId = null,
  type = null, // 'entity' | 'folder' | auto-detect
  title = null,
  defaultFormat = 'PDF',
  defaultOptions = {},
  showAdvancedOptions = true,
  showPreview = true,
  onExportComplete = null,
  onExportError = null
}) => {
  // Déterminer le type d'export automatiquement
  const exportType = useMemo(() => {
    if (type) return type;
    if (entityId && !folderId) return 'entity';
    if (folderId && !entityId) return 'folder';
    return 'entity'; // Par défaut
  }, [type, entityId, folderId]);

  const targetId = exportType === 'entity' ? entityId : folderId;

  // État local
  const [currentStep, setCurrentStep] = useState('format'); // 'format', 'options', 'preview', 'exporting'
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat);
  const [exportOptions, setExportOptions] = useState({
    // Options PDF
    format: 'A4',
    watermark: true,
    watermarkText: 'CONFIDENTIEL',
    includeRelationships: true,
    includeFiles: true,
    includeEntityDetails: false,
    
    // Options de rapport
    reportType: 'standard', // 'standard', 'network-analysis', 'investigation-summary', 'custom'
    template: 'auto',
    timeframe: 'all',
    includeTimeline: true,
    includeStatistics: true,
    includeMetrics: true,
    includeClusters: true,
    includeRecommendations: true,
    
    // Options JSON
    jsonFormat: 'pretty',
    includeMetadata: true,
    
    // Options générales
    classification: 'CONFIDENTIEL',
    customTitle: '',
    
    ...defaultOptions
  });

  // Hooks
  const {
    loading,
    error,
    progress,
    exportEntityPDF,
    exportEntityHTML,
    exportEntityJSON,
    exportFolderPDF,
    exportFolderJSON,
    generateNetworkAnalysis,
    generateInvestigationSummary,
    generateCustomReport,
    clearError
  } = useExport();

  const { templates, getTemplatesByType } = useExportTemplates();
  const { 
    previewContent, 
    previewLoading, 
    generatePreview, 
    clearPreview,
    previewVisible
  } = useExportPreview();

  /**
   * Formats d'export disponibles
   */
  const availableFormats = useMemo(() => {
    const baseFormats = [
      { value: 'PDF', label: '📄 PDF', description: 'Document pour impression et archivage' },
      { value: 'JSON', label: '📊 JSON', description: 'Données structurées pour import/export' }
    ];

    if (exportType === 'entity') {
      baseFormats.splice(1, 0, {
        value: 'HTML', 
        label: '🌐 HTML', 
        description: 'Page web autonome'
      });
    }

    return baseFormats;
  }, [exportType]);

  /**
   * Types de rapports disponibles
   */
  const reportTypes = useMemo(() => {
    const types = [
      { value: 'standard', label: 'Standard', description: 'Export basique avec informations essentielles' }
    ];

    if (exportType === 'folder') {
      types.push(
        { value: 'network-analysis', label: 'Analyse réseau', description: 'Rapport détaillé avec métriques et clusters' },
        { value: 'investigation-summary', label: 'Synthèse investigation', description: 'Résumé complet de l\'enquête' },
        { value: 'custom', label: 'Personnalisé', description: 'Rapport avec sections personnalisées' }
      );
    }

    return types;
  }, [exportType]);

  /**
   * Templates disponibles pour le type d'export
   */
  const availableTemplates = useMemo(() => {
    const typeTemplates = getTemplatesByType(exportType);
    return [
      { value: 'auto', label: 'Automatique', description: 'Template par défaut' },
      ...typeTemplates.map(template => ({
        value: template.name,
        label: template.name,
        description: template.description
      }))
    ];
  }, [exportType, getTemplatesByType]);

  /**
   * Réinitialiser lors de l'ouverture/fermeture
   */
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('format');
      setSelectedFormat(defaultFormat);
      setExportOptions(prev => ({ ...prev, ...defaultOptions }));
      clearError();
      clearPreview();
    }
  }, [isOpen, defaultFormat, defaultOptions, clearError, clearPreview]);

  /**
   * Gérer le changement de format
   */
  const handleFormatChange = useCallback((format) => {
    setSelectedFormat(format);
    
    // Ajuster les options selon le format
    if (format === 'JSON') {
      setExportOptions(prev => ({
        ...prev,
        reportType: 'standard' // JSON ne supporte que le standard
      }));
    }
  }, []);

  /**
   * Gérer le changement d'options
   */
  const handleOptionChange = useCallback((key, value) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  /**
   * Valider les options d'export
   */
  const validateOptions = useCallback(() => {
    const errors = [];

    if (!targetId) {
      errors.push('ID de cible manquant');
    }

    if (exportOptions.watermarkText && exportOptions.watermarkText.length > 50) {
      errors.push('Le texte du filigrane ne peut pas dépasser 50 caractères');
    }

    if (exportOptions.reportType === 'custom' && !exportOptions.customTitle) {
      errors.push('Titre requis pour un rapport personnalisé');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [targetId, exportOptions]);

  /**
   * Passer à l'étape suivante
   */
  const goToNextStep = useCallback(() => {
    if (currentStep === 'format') {
      if (showAdvancedOptions) {
        setCurrentStep('options');
      } else if (showPreview) {
        setCurrentStep('preview');
        handlePreview();
      } else {
        handleExport();
      }
    } else if (currentStep === 'options') {
      if (showPreview) {
        setCurrentStep('preview');
        handlePreview();
      } else {
        handleExport();
      }
    } else if (currentStep === 'preview') {
      handleExport();
    }
  }, [currentStep, showAdvancedOptions, showPreview]);

  /**
   * Revenir à l'étape précédente
   */
  const goToPreviousStep = useCallback(() => {
    if (currentStep === 'preview') {
      setCurrentStep(showAdvancedOptions ? 'options' : 'format');
    } else if (currentStep === 'options') {
      setCurrentStep('format');
    }
  }, [currentStep, showAdvancedOptions]);

  /**
   * Générer la prévisualisation
   */
  const handlePreview = useCallback(async () => {
    try {
      const previewOptions = {
        template: exportOptions.template === 'auto' ? undefined : exportOptions.template
      };

      await generatePreview(exportType, targetId, previewOptions);
    } catch (error) {
      onExportError?.(error);
    }
  }, [exportType, targetId, exportOptions.template, generatePreview, onExportError]);

  /**
   * Exécuter l'export
   */
  const handleExport = useCallback(async () => {
    const validation = validateOptions();
    if (!validation.valid) {
      onExportError?.({ message: validation.errors.join(', ') });
      return;
    }

    try {
      setCurrentStep('exporting');
      let result;

      const options = {
        ...exportOptions,
        autoDownload: true
      };

      // Sélectionner la fonction d'export appropriée
      if (exportOptions.reportType === 'network-analysis' && exportType === 'folder') {
        result = await generateNetworkAnalysis(targetId, options);
      } else if (exportOptions.reportType === 'investigation-summary' && exportType === 'folder') {
        result = await generateInvestigationSummary(targetId, options);
      } else if (exportOptions.reportType === 'custom') {
        const customConfig = {
          folderId: targetId,
          template: options.template === 'auto' ? 'folder-summary' : options.template,
          title: options.customTitle,
          format: selectedFormat,
          sections: getSelectedSections(),
          customData: {
            classification: options.classification,
            timeframe: options.timeframe
          }
        };
        result = await generateCustomReport(customConfig);
      } else {
        // Export standard
        if (exportType === 'entity') {
          if (selectedFormat === 'PDF') {
            result = await exportEntityPDF(targetId, options);
          } else if (selectedFormat === 'HTML') {
            result = await exportEntityHTML(targetId, options);
          } else if (selectedFormat === 'JSON') {
            result = await exportEntityJSON(targetId, options);
          }
        } else if (exportType === 'folder') {
          if (selectedFormat === 'PDF') {
            result = await exportFolderPDF(targetId, options);
          } else if (selectedFormat === 'JSON') {
            result = await exportFolderJSON(targetId, options);
          }
        }
      }

      onExportComplete?.(result);
      onClose?.();

    } catch (error) {
      onExportError?.(error);
      setCurrentStep('preview');
    }
  }, [
    validateOptions, 
    exportOptions, 
    exportType, 
    targetId, 
    selectedFormat,
    generateNetworkAnalysis,
    generateInvestigationSummary,
    generateCustomReport,
    exportEntityPDF,
    exportEntityHTML,
    exportEntityJSON,
    exportFolderPDF,
    exportFolderJSON,
    onExportComplete,
    onExportError,
    onClose
  ]);

  /**
   * Obtenir les sections sélectionnées pour un rapport personnalisé
   */
  const getSelectedSections = useCallback(() => {
    const sections = ['entities'];
    
    if (exportOptions.includeRelationships) sections.push('relationships');
    if (exportOptions.includeStatistics) sections.push('statistics');
    if (exportOptions.includeTimeline) sections.push('timeline');
    if (exportOptions.includeMetrics) sections.push('network-analysis');
    
    return sections;
  }, [exportOptions]);

  /**
   * Rendu de l'étape de sélection du format
   */
  const renderFormatStep = () => (
    <div className="export-step format-step">
      <div className="step-header">
        <h3>Sélectionner le format d'export</h3>
        <p className="step-description">
          Choisissez le format de sortie pour votre export
        </p>
      </div>

      <div className="format-options">
        {availableFormats.map(format => (
          <div
            key={format.value}
            className={`format-option ${selectedFormat === format.value ? 'selected' : ''}`}
            onClick={() => handleFormatChange(format.value)}
          >
            <div className="format-header">
              <span className="format-label">{format.label}</span>
              <span className="format-radio">
                <input
                  type="radio"
                  name="format"
                  value={format.value}
                  checked={selectedFormat === format.value}
                  readOnly
                />
              </span>
            </div>
            <p className="format-description">{format.description}</p>
          </div>
        ))}
      </div>

      {exportType === 'folder' && selectedFormat === 'PDF' && (
        <div className="report-type-section">
          <h4>Type de rapport</h4>
          <Select
            value={exportOptions.reportType}
            onChange={(value) => handleOptionChange('reportType', value)}
            options={reportTypes}
            className="report-type-select"
          />
        </div>
      )}
    </div>
  );

  /**
   * Rendu de l'étape d'options avancées
   */
  const renderOptionsStep = () => (
    <div className="export-step options-step">
      <div className="step-header">
        <h3>Options d'export</h3>
        <p className="step-description">
          Configurez les paramètres détaillés de votre export
        </p>
      </div>

      <div className="options-sections">
        {/* Options PDF */}
        {selectedFormat === 'PDF' && (
          <div className="options-section">
            <h4>Options PDF</h4>
            
            <div className="option-row">
              <Select
                label="Format de page"
                value={exportOptions.format}
                onChange={(value) => handleOptionChange('format', value)}
                options={[
                  { value: 'A4', label: 'A4' },
                  { value: 'A3', label: 'A3' },
                  { value: 'Letter', label: 'Letter' },
                  { value: 'Legal', label: 'Legal' }
                ]}
              />
            </div>

            <div className="option-row">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.watermark}
                  onChange={(e) => handleOptionChange('watermark', e.target.checked)}
                />
                Ajouter un filigrane
              </label>
            </div>

            {exportOptions.watermark && (
              <div className="option-row">
                <div className="input-group">
                  <label>Texte du filigrane</label>
                  <input
                    type="text"
                    value={exportOptions.watermarkText}
                    onChange={(e) => handleOptionChange('watermarkText', e.target.value)}
                    maxLength={50}
                    placeholder="CONFIDENTIEL"
                    className="watermark-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Options de contenu */}
        <div className="options-section">
          <h4>Contenu à inclure</h4>
          
          <div className="option-row">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={exportOptions.includeRelationships}
                onChange={(e) => handleOptionChange('includeRelationships', e.target.checked)}
              />
              Inclure les relations
            </label>
          </div>

          <div className="option-row">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={exportOptions.includeFiles}
                onChange={(e) => handleOptionChange('includeFiles', e.target.checked)}
              />
              Inclure les fichiers attachés
            </label>
          </div>

          {exportType === 'folder' && (
            <>
              <div className="option-row">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStatistics}
                    onChange={(e) => handleOptionChange('includeStatistics', e.target.checked)}
                  />
                  Inclure les statistiques
                </label>
              </div>

              <div className="option-row">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTimeline}
                    onChange={(e) => handleOptionChange('includeTimeline', e.target.checked)}
                  />
                  Inclure la timeline
                </label>
              </div>
            </>
          )}
        </div>

        {/* Options de rapport avancé */}
        {exportType === 'folder' && ['network-analysis', 'investigation-summary'].includes(exportOptions.reportType) && (
          <div className="options-section">
            <h4>Options de rapport avancé</h4>
            
            {exportOptions.reportType === 'network-analysis' && (
              <>
                <div className="option-row">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeMetrics}
                      onChange={(e) => handleOptionChange('includeMetrics', e.target.checked)}
                    />
                    Inclure les métriques réseau
                  </label>
                </div>

                <div className="option-row">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeClusters}
                      onChange={(e) => handleOptionChange('includeClusters', e.target.checked)}
                    />
                    Inclure l'analyse des clusters
                  </label>
                </div>

                <div className="option-row">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeRecommendations}
                      onChange={(e) => handleOptionChange('includeRecommendations', e.target.checked)}
                    />
                    Inclure les recommandations
                  </label>
                </div>
              </>
            )}

            {exportOptions.reportType === 'investigation-summary' && (
              <div className="option-row">
                <Select
                  label="Période temporelle"
                  value={exportOptions.timeframe}
                  onChange={(value) => handleOptionChange('timeframe', value)}
                  options={[
                    { value: 'all', label: 'Toute la période' },
                    { value: 'last_week', label: 'Dernière semaine' },
                    { value: 'last_month', label: 'Dernier mois' },
                    { value: 'last_quarter', label: 'Dernier trimestre' },
                    { value: 'last_year', label: 'Dernière année' }
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {/* Options de rapport personnalisé */}
        {exportOptions.reportType === 'custom' && (
          <div className="options-section">
            <h4>Rapport personnalisé</h4>
            
            <div className="option-row">
              <div className="input-group">
                <label>Titre du rapport</label>
                <input
                  type="text"
                  value={exportOptions.customTitle}
                  onChange={(e) => handleOptionChange('customTitle', e.target.value)}
                  placeholder="Titre personnalisé..."
                  className="custom-title-input"
                />
              </div>
            </div>

            <div className="option-row">
              <Select
                label="Template"
                value={exportOptions.template}
                onChange={(value) => handleOptionChange('template', value)}
                options={availableTemplates}
              />
            </div>
          </div>
        )}

        {/* Options JSON */}
        {selectedFormat === 'JSON' && (
          <div className="options-section">
            <h4>Options JSON</h4>
            
            <div className="option-row">
              <Select
                label="Format"
                value={exportOptions.jsonFormat}
                onChange={(value) => handleOptionChange('jsonFormat', value)}
                options={[
                  { value: 'pretty', label: 'Formaté (lisible)' },
                  { value: 'compact', label: 'Compact (minimal)' }
                ]}
              />
            </div>

            <div className="option-row">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                />
                Inclure les métadonnées
              </label>
            </div>
          </div>
        )}

        {/* Classification */}
        <div className="options-section">
          <h4>Classification</h4>
          <Select
            value={exportOptions.classification}
            onChange={(value) => handleOptionChange('classification', value)}
            options={[
              { value: 'PUBLIC', label: 'Public' },
              { value: 'CONFIDENTIEL', label: 'Confidentiel' },
              { value: 'SECRET', label: 'Secret' }
            ]}
          />
        </div>
      </div>
    </div>
  );

  /**
   * Rendu de l'étape de prévisualisation
   */
  const renderPreviewStep = () => (
    <div className="export-step preview-step">
      <div className="step-header">
        <h3>Aperçu de l'export</h3>
        <p className="step-description">
          Vérifiez le contenu avant d'exporter
        </p>
      </div>

      <div className="preview-container">
        {previewLoading ? (
          <div className="preview-loading">
            <div className="loading-spinner"></div>
            <p>Génération de l'aperçu...</p>
          </div>
        ) : previewContent ? (
          <div className="preview-content">
            <iframe
              srcDoc={previewContent}
              title="Aperçu export"
              className="preview-iframe"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="preview-placeholder">
            <p>Aucun aperçu disponible</p>
          </div>
        )}
      </div>

      <div className="export-summary">
        <h4>Résumé de l'export</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Type:</span>
            <span className="summary-value">{exportType === 'entity' ? 'Entité' : 'Dossier'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Format:</span>
            <span className="summary-value">{selectedFormat}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Rapport:</span>
            <span className="summary-value">
              {reportTypes.find(r => r.value === exportOptions.reportType)?.label || 'Standard'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Classification:</span>
            <span className="summary-value">{exportOptions.classification}</span>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Rendu de l'étape d'exportation
   */
  const renderExportingStep = () => (
    <div className="export-step exporting-step">
      <div className="exporting-content">
        <div className="exporting-animation">
          <div className="loading-spinner large"></div>
        </div>
        <h3>Export en cours...</h3>
        <p>Veuillez patienter pendant la génération de votre export.</p>
        
        {progress > 0 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Obtenir le titre de la modal selon l'étape
   */
  const getModalTitle = () => {
    if (title) return title;
    
    const typeLabel = exportType === 'entity' ? 'entité' : 'dossier';
    
    switch (currentStep) {
      case 'format':
        return `Exporter ${typeLabel} - Format`;
      case 'options':
        return `Exporter ${typeLabel} - Options`;
      case 'preview':
        return `Exporter ${typeLabel} - Aperçu`;
      case 'exporting':
        return `Export ${typeLabel} en cours`;
      default:
        return `Exporter ${typeLabel}`;
    }
  };

  /**
   * Obtenir les actions du pied de page
   */
  const getFooterActions = () => {
    const actions = [];

    // Bouton Annuler/Fermer
    if (currentStep !== 'exporting') {
      actions.push({
        key: 'cancel',
        label: 'Annuler',
        variant: 'secondary',
        onClick: onClose
      });
    }

    // Boutons de navigation
    switch (currentStep) {
      case 'format':
        actions.push({
          key: 'next',
          label: showAdvancedOptions ? 'Suivant' : (showPreview ? 'Aperçu' : 'Exporter'),
          variant: 'primary',
          onClick: goToNextStep
        });
        break;

      case 'options':
        actions.push({
          key: 'previous',
          label: 'Précédent',
          variant: 'secondary',
          onClick: goToPreviousStep
        });
        actions.push({
          key: 'next',
          label: showPreview ? 'Aperçu' : 'Exporter',
          variant: 'primary',
          onClick: goToNextStep
        });
        break;

      case 'preview':
        actions.push({
          key: 'previous',
          label: 'Précédent',
          variant: 'secondary',
          onClick: goToPreviousStep
        });
        actions.push({
          key: 'export',
          label: 'Exporter',
          variant: 'primary',
          onClick: handleExport,
          disabled: loading
        });
        break;

      case 'exporting':
        actions.push({
          key: 'exporting',
          label: 'Export en cours...',
          variant: 'primary',
          disabled: true,
          loading: true
        });
        break;
    }

    return actions;
  };

  /**
   * Rendu du contenu selon l'étape
   */
  const renderStepContent = () => {
    if (error) {
      return (
        <div className="export-error">
          <div className="error-icon">⚠️</div>
          <h3>Erreur d'export</h3>
          <p className="error-message">{error.message}</p>
          <div className="error-actions">
            <Button
              variant="secondary"
              onClick={() => {
                clearError();
                setCurrentStep('format');
              }}
            >
              Réessayer
            </Button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'format':
        return renderFormatStep();
      case 'options':
        return renderOptionsStep();
      case 'preview':
        return renderPreviewStep();
      case 'exporting':
        return renderExportingStep();
      default:
        return <div>Étape inconnue</div>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="large"
      footerActions={getFooterActions()}
      className="export-modal"
      closable={currentStep !== 'exporting'}
      overlayClosable={currentStep !== 'exporting'}
    >
      <div className="export-modal-content">
        {/* Indicateur de progression */}
        {(showAdvancedOptions || showPreview) && (
          <div className="step-indicator">
            <div className={`step ${currentStep === 'format' ? 'active' : 'completed'}`}>
              <span className="step-number">1</span>
              <span className="step-label">Format</span>
            </div>
            
            {showAdvancedOptions && (
              <div className={`step ${currentStep === 'options' ? 'active' : (currentStep === 'preview' || currentStep === 'exporting') ? 'completed' : ''}`}>
                <span className="step-number">2</span>
                <span className="step-label">Options</span>
              </div>
            )}
            
            {showPreview && (
              <div className={`step ${currentStep === 'preview' ? 'active' : currentStep === 'exporting' ? 'completed' : ''}`}>
                <span className="step-number">{showAdvancedOptions ? '3' : '2'}</span>
                <span className="step-label">Aperçu</span>
              </div>
            )}
            
            <div className={`step ${currentStep === 'exporting' ? 'active' : ''}`}>
              <span className="step-number">{showAdvancedOptions && showPreview ? '4' : showAdvancedOptions || showPreview ? '3' : '2'}</span>
              <span className="step-label">Export</span>
            </div>
          </div>
        )}

        {/* Contenu de l'étape */}
        <div className="step-content">
          {renderStepContent()}
        </div>
      </div>
    </Modal>
  );
};

ExportModal.propTypes = {
  /** État d'ouverture de la modal */
  isOpen: PropTypes.bool,
  
  /** Fonction de fermeture */
  onClose: PropTypes.func.isRequired,
  
  /** ID de l'entité à exporter */
  entityId: PropTypes.number,
  
  /** ID du dossier à exporter */
  folderId: PropTypes.number,
  
  /** Type d'export forcé */
  type: PropTypes.oneOf(['entity', 'folder']),
  
  /** Titre personnalisé de la modal */
  title: PropTypes.string,
  
  /** Format par défaut */
  defaultFormat: PropTypes.oneOf(['PDF', 'HTML', 'JSON']),
  
  /** Options par défaut */
  defaultOptions: PropTypes.object,
  
  /** Afficher les options avancées */
  showAdvancedOptions: PropTypes.bool,
  
  /** Afficher la prévisualisation */
  showPreview: PropTypes.bool,
  
  /** Callback appelé lors du succès */
  onExportComplete: PropTypes.func,
  
  /** Callback appelé lors d'une erreur */
  onExportError: PropTypes.func
};

export default ExportModal;
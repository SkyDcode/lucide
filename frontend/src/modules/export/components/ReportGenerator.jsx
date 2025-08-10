// frontend/src/modules/export/components/ReportGenerator.jsx - Générateur de rapports avancés LUCIDE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../components/ui/Button/Button';
import Select from '../../../components/ui/Form/Select';
import Modal from '../../../components/ui/Modal/Modal';
import useExport, { useExportTemplates, useExportPreview } from '../hooks/useExport';
import useFolders from '../../folders/hooks/useFolders';
import useEntities from '../../entities/hooks/useEntities';
import './ReportGenerator.css';

/**
 * Composant générateur de rapports avancés avec interface complète
 */
const ReportGenerator = ({
  folderId = null,
  isModal = false,
  isOpen = false,
  onClose = null,
  onReportGenerated = null,
  onError = null,
  className = ''
}) => {
  // État local
  const [reportConfig, setReportConfig] = useState({
    type: 'investigation-summary',
    format: 'PDF',
    template: 'auto',
    title: '',
    timeframe: 'all',
    sections: {
      overview: true,
      entities: true,
      relationships: true,
      statistics: true,
      timeline: true,
      networkAnalysis: false,
      centrality: false,
      clusters: false,
      recommendations: true
    },
    options: {
      includeMetrics: true,
      includeClusters: true,
      includeRecommendations: true,
      watermark: true,
      watermarkText: 'CONFIDENTIEL',
      classification: 'CONFIDENTIEL',
      format: 'A4'
    },
    customData: {}
  });

  const [selectedFolder, setSelectedFolder] = useState(folderId);
  const [currentStep, setCurrentStep] = useState('setup'); // 'setup', 'sections', 'preview', 'generating'
  const [validationErrors, setValidationErrors] = useState([]);

  // Hooks
  const { folders, loading: foldersLoading } = useFolders();
  const { items: entities, loading: entitiesLoading } = useEntities({ 
    folderId: selectedFolder 
  });

  const {
    loading: exportLoading,
    error: exportError,
    progress,
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
    clearPreview 
  } = useExportPreview();

  /**
   * Types de rapports disponibles
   */
  const reportTypes = useMemo(() => [
    {
      value: 'investigation-summary',
      label: 'Synthèse d\'investigation',
      description: 'Rapport complet de synthèse avec timeline et statistiques',
      icon: '📋',
      requirements: ['entities'],
      features: ['timeline', 'statistics', 'overview']
    },
    {
      value: 'network-analysis',
      label: 'Analyse réseau',
      description: 'Analyse approfondie des connexions et métriques réseau',
      icon: '🕸️',
      requirements: ['entities', 'relationships'],
      features: ['metrics', 'centrality', 'clusters', 'paths']
    },
    {
      value: 'custom',
      label: 'Rapport personnalisé',
      description: 'Rapport configurable avec sections sur mesure',
      icon: '🎛️',
      requirements: ['title'],
      features: ['custom-sections', 'flexible-layout']
    }
  ], []);

  /**
   * Templates disponibles selon le type
   */
  const availableTemplates = useMemo(() => {
    const baseTemplates = [
      { value: 'auto', label: 'Automatique', description: 'Template par défaut optimisé' }
    ];

    const typeTemplates = getTemplatesByType('folder');
    return [
      ...baseTemplates,
      ...typeTemplates.map(template => ({
        value: template.name,
        label: template.name,
        description: template.description
      }))
    ];
  }, [getTemplatesByType]);

  /**
   * Options de période temporelle
   */
  const timeframeOptions = useMemo(() => [
    { value: 'all', label: 'Toute la période', description: 'Depuis la création du dossier' },
    { value: 'last_week', label: 'Dernière semaine', description: '7 derniers jours' },
    { value: 'last_month', label: 'Dernier mois', description: '30 derniers jours' },
    { value: 'last_quarter', label: 'Dernier trimestre', description: '90 derniers jours' },
    { value: 'last_year', label: 'Dernière année', description: '365 derniers jours' }
  ], []);

  /**
   * Sections disponibles pour rapports personnalisés
   */
  const availableSections = useMemo(() => [
    { 
      key: 'overview', 
      label: 'Vue d\'ensemble', 
      description: 'Résumé exécutif et informations générales',
      required: true 
    },
    { 
      key: 'entities', 
      label: 'Entités', 
      description: 'Liste et détails des entités du dossier',
      required: false 
    },
    { 
      key: 'relationships', 
      label: 'Relations', 
      description: 'Connexions entre les entités',
      required: false 
    },
    { 
      key: 'statistics', 
      label: 'Statistiques', 
      description: 'Métriques et données quantitatives',
      required: false 
    },
    { 
      key: 'timeline', 
      label: 'Timeline', 
      description: 'Chronologie des événements',
      required: false 
    },
    { 
      key: 'networkAnalysis', 
      label: 'Analyse réseau', 
      description: 'Métriques de connectivité et centralité',
      required: false 
    },
    { 
      key: 'centrality', 
      label: 'Centralité', 
      description: 'Analyse de l\'importance des entités',
      required: false 
    },
    { 
      key: 'clusters', 
      label: 'Clusters', 
      description: 'Groupes et communautés détectés',
      required: false 
    },
    { 
      key: 'recommendations', 
      label: 'Recommandations', 
      description: 'Suggestions d\'investigation',
      required: false 
    }
  ], []);

  /**
   * Valider la configuration du rapport
   */
  const validateConfig = useCallback(() => {
    const errors = [];

    if (!selectedFolder) {
      errors.push('Dossier requis pour générer un rapport');
    }

    if (reportConfig.type === 'custom' && !reportConfig.title.trim()) {
      errors.push('Titre requis pour un rapport personnalisé');
    }

    if (reportConfig.type === 'network-analysis' && entities.length < 2) {
      errors.push('Au moins 2 entités requises pour l\'analyse réseau');
    }

    const activeSections = Object.values(reportConfig.sections).filter(Boolean);
    if (reportConfig.type === 'custom' && activeSections.length === 0) {
      errors.push('Au moins une section doit être sélectionnée');
    }

    if (reportConfig.options.watermarkText && reportConfig.options.watermarkText.length > 50) {
      errors.push('Le texte du filigrane ne peut pas dépasser 50 caractères');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [selectedFolder, reportConfig, entities.length]);

  /**
   * Mettre à jour la configuration
   */
  const updateConfig = useCallback((path, value) => {
    setReportConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  }, []);

  /**
   * Passer à l'étape suivante
   */
  const goToNextStep = useCallback(() => {
    if (currentStep === 'setup') {
      if (reportConfig.type === 'custom') {
        setCurrentStep('sections');
      } else {
        setCurrentStep('preview');
        handlePreview();
      }
    } else if (currentStep === 'sections') {
      setCurrentStep('preview');
      handlePreview();
    }
  }, [currentStep, reportConfig.type]);

  /**
   * Revenir à l'étape précédente
   */
  const goToPreviousStep = useCallback(() => {
    if (currentStep === 'preview') {
      setCurrentStep(reportConfig.type === 'custom' ? 'sections' : 'setup');
    } else if (currentStep === 'sections') {
      setCurrentStep('setup');
    }
  }, [currentStep, reportConfig.type]);

  /**
   * Générer la prévisualisation
   */
  const handlePreview = useCallback(async () => {
    try {
      const previewOptions = {
        template: reportConfig.template === 'auto' ? undefined : reportConfig.template
      };

      await generatePreview('folder', selectedFolder, previewOptions);
    } catch (error) {
      onError?.(error);
    }
  }, [selectedFolder, reportConfig.template, generatePreview, onError]);

  /**
   * Générer le rapport final
   */
  const handleGenerateReport = useCallback(async () => {
    if (!validateConfig()) {
      return;
    }

    try {
      setCurrentStep('generating');
      let result;

      const options = {
        ...reportConfig.options,
        timeframe: reportConfig.timeframe
      };

      switch (reportConfig.type) {
        case 'network-analysis':
          result = await generateNetworkAnalysis(selectedFolder, {
            format: reportConfig.format,
            ...options
          });
          break;

        case 'investigation-summary':
          result = await generateInvestigationSummary(selectedFolder, {
            format: reportConfig.format,
            timeframe: reportConfig.timeframe,
            includeTimeline: reportConfig.sections.timeline,
            includeStatistics: reportConfig.sections.statistics,
            ...options
          });
          break;

        case 'custom':
          const customConfig = {
            folderId: selectedFolder,
            template: reportConfig.template === 'auto' ? 'folder-summary' : reportConfig.template,
            title: reportConfig.title,
            format: reportConfig.format,
            sections: Object.keys(reportConfig.sections).filter(key => reportConfig.sections[key]),
            customData: {
              ...reportConfig.customData,
              timeframe: reportConfig.timeframe,
              classification: reportConfig.options.classification
            }
          };
          result = await generateCustomReport(customConfig);
          break;

        default:
          throw new Error(`Type de rapport non supporté: ${reportConfig.type}`);
      }

      onReportGenerated?.(result);
      
      if (isModal) {
        onClose?.();
      } else {
        setCurrentStep('setup');
      }

    } catch (error) {
      onError?.(error);
      setCurrentStep('preview');
    }
  }, [
    validateConfig,
    reportConfig,
    selectedFolder,
    generateNetworkAnalysis,
    generateInvestigationSummary,
    generateCustomReport,
    onReportGenerated,
    onError,
    isModal,
    onClose
  ]);

  /**
   * Réinitialiser la configuration
   */
  const resetConfig = useCallback(() => {
    setReportConfig({
      type: 'investigation-summary',
      format: 'PDF',
      template: 'auto',
      title: '',
      timeframe: 'all',
      sections: {
        overview: true,
        entities: true,
        relationships: true,
        statistics: true,
        timeline: true,
        networkAnalysis: false,
        centrality: false,
        clusters: false,
        recommendations: true
      },
      options: {
        includeMetrics: true,
        includeClusters: true,
        includeRecommendations: true,
        watermark: true,
        watermarkText: 'CONFIDENTIEL',
        classification: 'CONFIDENTIEL',
        format: 'A4'
      },
      customData: {}
    });
    setCurrentStep('setup');
    setValidationErrors([]);
    clearError();
    clearPreview();
  }, [clearError, clearPreview]);

  /**
   * Effet pour réinitialiser lors de l'ouverture/fermeture
   */
  useEffect(() => {
    if (isModal && isOpen) {
      resetConfig();
    }
  }, [isModal, isOpen, resetConfig]);

  /**
   * Rendu de l'étape de configuration initiale
   */
  const renderSetupStep = () => (
    <div className="report-step setup-step">
      <div className="step-header">
        <h3>Configuration du rapport</h3>
        <p className="step-description">
          Sélectionnez le type de rapport et configurez les paramètres de base
        </p>
      </div>

      <div className="setup-sections">
        {/* Sélection du dossier */}
        <div className="setup-section">
          <h4>Dossier d'enquête</h4>
          <Select
            value={selectedFolder || ''}
            onChange={(value) => setSelectedFolder(Number(value))}
            options={folders.map(folder => ({
              value: folder.id,
              label: folder.name,
              description: `${folder.entity_count || 0} entités`
            }))}
            placeholder="Sélectionner un dossier..."
            disabled={!!folderId || foldersLoading}
          />
        </div>

        {/* Type de rapport */}
        <div className="setup-section">
          <h4>Type de rapport</h4>
          <div className="report-type-options">
            {reportTypes.map(type => (
              <div
                key={type.value}
                className={`report-type-option ${reportConfig.type === type.value ? 'selected' : ''}`}
                onClick={() => updateConfig('type', type.value)}
              >
                <div className="type-header">
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-label">{type.label}</span>
                  <span className="type-radio">
                    <input
                      type="radio"
                      name="reportType"
                      value={type.value}
                      checked={reportConfig.type === type.value}
                      readOnly
                    />
                  </span>
                </div>
                <p className="type-description">{type.description}</p>
                <div className="type-features">
                  {type.features.map(feature => (
                    <span key={feature} className="feature-tag">{feature}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration spécifique au type */}
        {reportConfig.type === 'custom' && (
          <div className="setup-section">
            <h4>Titre du rapport</h4>
            <input
              type="text"
              value={reportConfig.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Titre personnalisé du rapport..."
              className="report-title-input"
            />
          </div>
        )}

        {/* Format et template */}
        <div className="setup-section">
          <h4>Format et template</h4>
          <div className="format-template-grid">
            <Select
              label="Format de sortie"
              value={reportConfig.format}
              onChange={(value) => updateConfig('format', value)}
              options={[
                { value: 'PDF', label: 'PDF' },
                { value: 'HTML', label: 'HTML' }
              ]}
            />
            <Select
              label="Template"
              value={reportConfig.template}
              onChange={(value) => updateConfig('template', value)}
              options={availableTemplates}
            />
          </div>
        </div>

        {/* Période temporelle */}
        {reportConfig.type === 'investigation-summary' && (
          <div className="setup-section">
            <h4>Période d'analyse</h4>
            <div className="timeframe-options">
              {timeframeOptions.map(option => (
                <div
                  key={option.value}
                  className={`timeframe-option ${reportConfig.timeframe === option.value ? 'selected' : ''}`}
                  onClick={() => updateConfig('timeframe', option.value)}
                >
                  <span className="timeframe-label">{option.label}</span>
                  <span className="timeframe-description">{option.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options avancées */}
        <div className="setup-section">
          <h4>Options avancées</h4>
          <div className="advanced-options">
            <div className="option-row">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={reportConfig.options.watermark}
                  onChange={(e) => updateConfig('options.watermark', e.target.checked)}
                />
                Ajouter un filigrane
              </label>
            </div>

            {reportConfig.options.watermark && (
              <div className="option-row">
                <div className="input-group">
                  <label>Texte du filigrane</label>
                  <input
                    type="text"
                    value={reportConfig.options.watermarkText}
                    onChange={(e) => updateConfig('options.watermarkText', e.target.value)}
                    maxLength={50}
                    placeholder="CONFIDENTIEL"
                  />
                </div>
              </div>
            )}

            <div className="option-row">
              <Select
                label="Classification"
                value={reportConfig.options.classification}
                onChange={(value) => updateConfig('options.classification', value)}
                options={[
                  { value: 'PUBLIC', label: 'Public' },
                  { value: 'CONFIDENTIEL', label: 'Confidentiel' },
                  { value: 'SECRET', label: 'Secret' }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Erreurs de validation */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>Erreurs de configuration</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index} className="validation-error">{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  /**
   * Rendu de l'étape de sélection des sections
   */
  const renderSectionsStep = () => (
    <div className="report-step sections-step">
      <div className="step-header">
        <h3>Sections du rapport</h3>
        <p className="step-description">
          Sélectionnez les sections à inclure dans votre rapport personnalisé
        </p>
      </div>

      <div className="sections-grid">
        {availableSections.map(section => (
          <div
            key={section.key}
            className={`section-option ${reportConfig.sections[section.key] ? 'selected' : ''} ${section.required ? 'required' : ''}`}
            onClick={() => !section.required && updateConfig(`sections.${section.key}`, !reportConfig.sections[section.key])}
          >
            <div className="section-header">
              <span className="section-label">{section.label}</span>
              <div className="section-controls">
                {section.required && <span className="required-badge">Requis</span>}
                <input
                  type="checkbox"
                  checked={reportConfig.sections[section.key]}
                  onChange={(e) => updateConfig(`sections.${section.key}`, e.target.checked)}
                  disabled={section.required}
                />
              </div>
            </div>
            <p className="section-description">{section.description}</p>
          </div>
        ))}
      </div>

      <div className="sections-summary">
        <h4>Sections sélectionnées</h4>
        <div className="selected-sections">
          {Object.entries(reportConfig.sections)
            .filter(([_, selected]) => selected)
            .map(([key, _]) => {
              const section = availableSections.find(s => s.key === key);
              return (
                <span key={key} className="selected-section-tag">
                  {section?.label}
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );

  /**
   * Rendu de l'étape de prévisualisation
   */
  const renderPreviewStep = () => (
    <div className="report-step preview-step">
      <div className="step-header">
        <h3>Aperçu du rapport</h3>
        <p className="step-description">
          Vérifiez la configuration et le contenu avant de générer le rapport final
        </p>
      </div>

      <div className="preview-container">
        <div className="preview-sidebar">
          <div className="report-summary">
            <h4>Configuration du rapport</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Type:</span>
                <span className="summary-value">
                  {reportTypes.find(t => t.value === reportConfig.type)?.label}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Format:</span>
                <span className="summary-value">{reportConfig.format}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Template:</span>
                <span className="summary-value">
                  {availableTemplates.find(t => t.value === reportConfig.template)?.label}
                </span>
              </div>
              {reportConfig.type === 'investigation-summary' && (
                <div className="summary-item">
                  <span className="summary-label">Période:</span>
                  <span className="summary-value">
                    {timeframeOptions.find(t => t.value === reportConfig.timeframe)?.label}
                  </span>
                </div>
              )}
              {reportConfig.title && (
                <div className="summary-item">
                  <span className="summary-label">Titre:</span>
                  <span className="summary-value">{reportConfig.title}</span>
                </div>
              )}
            </div>
          </div>

          {reportConfig.type === 'custom' && (
            <div className="sections-summary">
              <h4>Sections incluses</h4>
              <div className="included-sections">
                {Object.entries(reportConfig.sections)
                  .filter(([_, selected]) => selected)
                  .map(([key, _]) => {
                    const section = availableSections.find(s => s.key === key);
                    return (
                      <div key={key} className="included-section">
                        <span className="section-icon">✓</span>
                        <span className="section-name">{section?.label}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="folder-info">
            <h4>Dossier analysé</h4>
            {selectedFolder && (
              <div className="folder-details">
                <div className="folder-name">
                  {folders.find(f => f.id === selectedFolder)?.name || 'Dossier inconnu'}
                </div>
                <div className="folder-stats">
                  <span>{entities.length} entités</span>
                  {/* Ajout des statistiques de relations si disponibles */}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="preview-content">
          {previewLoading ? (
            <div className="preview-loading">
              <div className="loading-spinner"></div>
              <p>Génération de l'aperçu...</p>
            </div>
          ) : previewContent ? (
            <div className="preview-iframe-container">
              <iframe
                srcDoc={previewContent}
                title="Aperçu du rapport"
                className="preview-iframe"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-icon">📄</div>
              <h4>Aperçu non disponible</h4>
              <p>L'aperçu sera généré lors de la création du rapport final</p>
              <Button
                variant="secondary"
                onClick={handlePreview}
                disabled={previewLoading}
              >
                Générer l'aperçu
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Rendu de l'étape de génération
   */
  const renderGeneratingStep = () => (
    <div className="report-step generating-step">
      <div className="generating-content">
        <div className="generating-animation">
          <div className="loading-spinner large"></div>
        </div>
        <h3>Génération du rapport en cours...</h3>
        <p>Veuillez patienter pendant la création de votre rapport.</p>
        
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

        <div className="generating-details">
          <div className="detail-item">
            <span className="detail-label">Type:</span>
            <span className="detail-value">
              {reportTypes.find(t => t.value === reportConfig.type)?.label}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Format:</span>
            <span className="detail-value">{reportConfig.format}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Entités:</span>
            <span className="detail-value">{entities.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Rendu du contenu selon l'étape
   */
  const renderStepContent = () => {
    if (exportError) {
      return (
        <div className="report-error">
          <div className="error-icon">⚠️</div>
          <h3>Erreur de génération</h3>
          <p className="error-message">{exportError.message}</p>
          <div className="error-actions">
            <Button
              variant="secondary"
              onClick={() => {
                clearError();
                setCurrentStep('setup');
              }}
            >
              Réessayer
            </Button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'setup':
        return renderSetupStep();
      case 'sections':
        return renderSectionsStep();
      case 'preview':
        return renderPreviewStep();
      case 'generating':
        return renderGeneratingStep();
      default:
        return <div>Étape inconnue</div>;
    }
  };

  /**
   * Obtenir les actions de navigation
   */
  const getNavigationActions = () => {
    const actions = [];

    if (currentStep !== 'generating') {
      actions.push({
        key: 'reset',
        label: 'Réinitialiser',
        variant: 'ghost',
        onClick: resetConfig
      });
    }

    switch (currentStep) {
      case 'setup':
        actions.push({
          key: 'next',
          label: reportConfig.type === 'custom' ? 'Configurer sections' : 'Aperçu',
          variant: 'primary',
          onClick: () => {
            if (validateConfig()) {
              goToNextStep();
            }
          },
          disabled: !selectedFolder || validationErrors.length > 0
        });
        break;

      case 'sections':
        actions.push({
          key: 'previous',
          label: 'Précédent',
          variant: 'secondary',
          onClick: goToPreviousStep
        });
        actions.push({
          key: 'next',
          label: 'Aperçu',
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
          key: 'generate',
          label: 'Générer le rapport',
          variant: 'primary',
          onClick: handleGenerateReport,
          disabled: exportLoading
        });
        break;

      case 'generating':
        actions.push({
          key: 'generating',
          label: 'Génération en cours...',
          variant: 'primary',
          disabled: true,
          loading: true
        });
        break;
    }

    return actions;
  };

  /**
   * Rendu principal
   */
  const content = (
    <div className={`report-generator ${className}`}>
      {/* Indicateur de progression */}
      <div className="step-indicator">
        <div className={`step ${currentStep === 'setup' ? 'active' : 'completed'}`}>
          <span className="step-number">1</span>
          <span className="step-label">Configuration</span>
        </div>
        
        {reportConfig.type === 'custom' && (
          <div className={`step ${currentStep === 'sections' ? 'active' : (currentStep === 'preview' || currentStep === 'generating') ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Sections</span>
          </div>
        )}
        
        <div className={`step ${currentStep === 'preview' ? 'active' : currentStep === 'generating' ? 'completed' : ''}`}>
          <span className="step-number">{reportConfig.type === 'custom' ? '3' : '2'}</span>
          <span className="step-label">Aperçu</span>
        </div>
        
        <div className={`step ${currentStep === 'generating' ? 'active' : ''}`}>
          <span className="step-number">{reportConfig.type === 'custom' ? '4' : '3'}</span>
          <span className="step-label">Génération</span>
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="step-content">
        {renderStepContent()}
      </div>

      {/* Actions de navigation */}
      <div className="navigation-actions">
        {getNavigationActions().map(action => (
          <Button
            key={action.key}
            variant={action.variant}
            onClick={action.onClick}
            disabled={action.disabled}
            loading={action.loading}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );

  // Rendu conditionnel selon le mode
  if (isModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Générateur de rapports"
        size="extra-large"
        className="report-generator-modal"
        closable={currentStep !== 'generating'}
        overlayClosable={currentStep !== 'generating'}
        showFooter={false}
      >
        {content}
      </Modal>
    );
  }

  return content;
};

ReportGenerator.propTypes = {
  /** ID du dossier (optionnel pour présélection) */
  folderId: PropTypes.number,
  
  /** Mode modal */
  isModal: PropTypes.bool,
  
  /** État d'ouverture (mode modal) */
  isOpen: PropTypes.bool,
  
  /** Fonction de fermeture (mode modal) */
  onClose: PropTypes.func,
  
  /** Callback appelé lors de la génération réussie */
  onReportGenerated: PropTypes.func,
  
  /** Callback appelé lors d'une erreur */
  onError: PropTypes.func,
  
  /** Classes CSS supplémentaires */
  className: PropTypes.string
};

export default ReportGenerator;
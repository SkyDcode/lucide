// frontend/src/modules/relationships/components/RelationshipForm.jsx - Formulaire de création/édition de relation
import React, { useEffect, useMemo, useState } from 'react';
import Input from '../../../components/ui/Form/Input';
import Select from '../../../components/ui/Form/Select';
import Textarea from '../../../components/ui/Form/Textarea';
import Button from '../../../components/ui/Button/Button';
import RelationshipService from '../services/relationshipService';

/**
 * Composant formulaire pour créer ou modifier une relation
 */
export default function RelationshipForm({
  initial = {},
  fromEntity = null,
  toEntity = null,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  mode = 'create' // 'create' ou 'edit'
}) {
  // État du formulaire
  const [formData, setFormData] = useState({
    from_entity: initial.from_entity || fromEntity?.id || '',
    to_entity: initial.to_entity || toEntity?.id || '',
    type: initial.type || '',
    strength: initial.strength || 'medium',
    description: initial.description || '',
    bidirectional: initial.bidirectional || false
  });

  // État de validation et chargement
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [validation, setValidation] = useState(null);

  // Charger les types de relations au montage
  useEffect(() => {
    const loadRelationshipTypes = async () => {
      try {
        const types = await RelationshipService.getRelationshipTypes();
        setRelationshipTypes(types);
      } catch (error) {
        console.warn('Erreur lors du chargement des types de relations:', error);
      }
    };

    loadRelationshipTypes();
  }, []);

  // Valider en temps réel
  useEffect(() => {
    const validateFormData = async () => {
      if (formData.from_entity && formData.to_entity && formData.type) {
        try {
          const validationResult = await RelationshipService.validateRelationship({
            ...formData,
            operation: mode
          });
          setValidation(validationResult);
        } catch (error) {
          console.warn('Erreur de validation:', error);
        }
      }
    };

    const debounceTimeout = setTimeout(validateFormData, 500);
    return () => clearTimeout(debounceTimeout);
  }, [formData, mode]);

  // Options pour les sélecteurs
  const entityOptions = useMemo(() => {
    // Cette liste devrait venir d'un contexte ou être passée en props
    // Pour l'instant, on utilise les entités passées en props
    const options = [];
    
    if (fromEntity) {
      options.push({
        value: fromEntity.id,
        label: `${fromEntity.name} (${fromEntity.type})`
      });
    }
    
    if (toEntity && toEntity.id !== fromEntity?.id) {
      options.push({
        value: toEntity.id,
        label: `${toEntity.name} (${toEntity.type})`
      });
    }
    
    return options;
  }, [fromEntity, toEntity]);

  const typeOptions = useMemo(() => {
    return relationshipTypes.map(type => ({
      value: type.key,
      label: `${type.name} (${type.category})`,
      category: type.category,
      description: type.description
    }));
  }, [relationshipTypes]);

  const strengthOptions = [
    { value: 'weak', label: 'Faible' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'strong', label: 'Forte' }
  ];

  // Gestion des changements
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Validation côté client
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from_entity) {
      newErrors.from_entity = 'Entité source requise';
    }
    
    if (!formData.to_entity) {
      newErrors.to_entity = 'Entité destination requise';
    }
    
    if (formData.from_entity && formData.to_entity && 
        formData.from_entity === formData.to_entity) {
      newErrors.entities = 'Les entités source et destination doivent être différentes';
    }
    
    if (!formData.type) {
      newErrors.type = 'Type de relation requis';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'La description ne peut pas dépasser 500 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        from_entity: parseInt(formData.from_entity),
        to_entity: parseInt(formData.to_entity)
      };
      
      if (mode === 'edit' && initial.id) {
        submitData.id = initial.id;
      }
      
      await onSubmit?.(submitData);
    } catch (error) {
      setErrors({
        submit: error.message || 'Erreur lors de la soumission'
      });
    } finally {
      setLoading(false);
    }
  };

  // Suggestions automatiques
  const handleTypeChange = (newType) => {
    handleChange('type', newType);
    
    // Mettre à jour la bidirectionnalité selon le type
    const selectedType = relationshipTypes.find(t => t.key === newType);
    if (selectedType && selectedType.bidirectional !== undefined) {
      handleChange('bidirectional', selectedType.bidirectional);
    }
  };

  // Interface pour appliquer une suggestion
  const applySuggestion = (suggestion) => {
    handleChange('type', suggestion.type);
    if (suggestion.strength) {
      handleChange('strength', suggestion.strength);
    }
  };

  return (
    <div className="relationship-form">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Erreur générale */}
        {errors.submit && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-md p-3">
            {errors.submit}
          </div>
        )}

        {/* Erreur entités */}
        {errors.entities && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-md p-3">
            {errors.entities}
          </div>
        )}

        {/* Entité source */}
        <Select
          label="Entité source"
          name="from_entity"
          value={formData.from_entity}
          onChange={(value) => handleChange('from_entity', value)}
          options={entityOptions}
          required
          error={errors.from_entity}
          disabled={mode === 'edit' || !!fromEntity}
          placeholder="Sélectionner l'entité source"
        />

        {/* Entité destination */}
        <Select
          label="Entité destination"
          name="to_entity"
          value={formData.to_entity}
          onChange={(value) => handleChange('to_entity', value)}
          options={entityOptions}
          required
          error={errors.to_entity}
          disabled={mode === 'edit' || !!toEntity}
          placeholder="Sélectionner l'entité destination"
        />

        {/* Type de relation */}
        <div className="space-y-2">
          <Select
            label="Type de relation"
            name="type"
            value={formData.type}
            onChange={handleTypeChange}
            options={typeOptions}
            required
            error={errors.type}
            placeholder="Sélectionner le type de relation"
          />
          
          {/* Afficher la description du type sélectionné */}
          {formData.type && (
            <div className="text-sm text-gray-400">
              {relationshipTypes.find(t => t.key === formData.type)?.description}
            </div>
          )}
        </div>

        {/* Suggestions de validation */}
        {validation && validation.suggestions && validation.suggestions.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-3">
            <div className="text-sm font-medium text-blue-300 mb-2">
              Suggestions basées sur les entités :
            </div>
            <div className="space-y-1">
              {validation.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="block text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  {suggestion.type} ({Math.round(suggestion.confidence * 100)}% de confiance)
                  {suggestion.reason && ` - ${suggestion.reason}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Force de la relation */}
        <Select
          label="Force de la relation"
          name="strength"
          value={formData.strength}
          onChange={(value) => handleChange('strength', value)}
          options={strengthOptions}
          error={errors.strength}
        />

        {/* Description */}
        <Textarea
          label="Description (optionnelle)"
          name="description"
          value={formData.description}
          onChange={(value) => handleChange('description', value)}
          rows={3}
          error={errors.description}
          placeholder="Décrivez cette relation..."
          helperText={`${formData.description.length}/500 caractères`}
        />

        {/* Relation bidirectionnelle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="bidirectional"
            checked={formData.bidirectional}
            onChange={(e) => handleChange('bidirectional', e.target.checked)}
            className="rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="bidirectional" className="text-sm text-gray-200">
            Créer aussi la relation inverse
          </label>
        </div>

        {/* Validation en temps réel */}
        {validation && (
          <div className="space-y-2">
            {/* Erreurs de validation */}
            {validation.errors && validation.errors.length > 0 && (
              <div className="text-red-400 text-sm">
                {validation.errors.map((error, index) => (
                  <div key={index}>• {error.message}</div>
                ))}
              </div>
            )}
            
            {/* Avertissements */}
            {validation.warnings && validation.warnings.length > 0 && (
              <div className="text-yellow-400 text-sm">
                {validation.warnings.map((warning, index) => (
                  <div key={index}>⚠ {warning.message}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </Button>
          )}
          
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || (validation && !validation.valid)}
          >
            {loading ? 'Enregistrement...' : submitLabel}
          </Button>
        </div>
      </form>

      {/* Informations sur le type de relation */}
      {formData.type && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-md">
          <h4 className="text-sm font-medium text-gray-200 mb-2">
            Informations sur ce type de relation
          </h4>
          {(() => {
            const typeInfo = relationshipTypes.find(t => t.key === formData.type);
            if (!typeInfo) return null;
            
            return (
              <div className="space-y-2 text-sm text-gray-400">
                <div>
                  <span className="font-medium">Catégorie :</span> {typeInfo.category}
                </div>
                <div>
                  <span className="font-medium">Bidirectionnelle :</span> {typeInfo.bidirectional ? 'Oui' : 'Non'}
                </div>
                {typeInfo.description && (
                  <div>
                    <span className="font-medium">Description :</span> {typeInfo.description}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
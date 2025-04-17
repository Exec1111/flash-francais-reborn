import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DynamicAIForm = ({ typeKey, subtypeKey, onSubmit, onSuccess, onCancel, loading }) => {
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    console.log('DEBUG [DynamicAIForm] useEffect déclenché avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    setFormSchema(null);
    setFormData({});
    setErrors({});
    if (typeKey && subtypeKey) {
      fetchSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey, subtypeKey]);

  const fetchSchema = async () => {
    console.log('DEBUG [DynamicAIForm] fetchSchema appelé avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    try {
      setIsLoading(true);
      setError(null);
      const url = `/ai/resource-types/${typeKey}/${subtypeKey}/schema`;
      try {
        const token = localStorage.getItem('token');
        console.log('[DEBUG][fetchSchema] Token actuel dans localStorage:', token);
        const response = await api.get(url);
        setFormSchema(response.data);
      } catch (err) {
        if (err.response) {
          console.error('DEBUG DynamicAIForm: backend error response', err.response.status, err.response.data);
          setError('Erreur backend: ' + err.response.status + ' ' + JSON.stringify(err.response.data));
        } else {
          console.error('DEBUG DynamicAIForm: network or unknown error', err.message);
          setError('Erreur réseau ou inconnue: ' + err.message);
        }
        setFormSchema(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseFloat(value) : value;
    setFormData({
      ...formData,
      [name]: processedValue
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    if (!formSchema) return true;
    formSchema.fields.forEach(field => {
      if (field.required && (formData[field.name] === undefined || formData[field.name] === '')) {
        newErrors[field.name] = `${field.label} est obligatoire`;
        isValid = false;
      }
      if (field.type === 'number' && formData[field.name] !== undefined) {
        if (field.validations?.min !== undefined && formData[field.name] < field.validations.min) {
          newErrors[field.name] = `${field.label} doit être au moins ${field.validations.min}`;
          isValid = false;
        }
        if (field.validations?.max !== undefined && formData[field.name] > field.validations.max) {
          newErrors[field.name] = `${field.label} ne peut pas dépasser ${field.validations.max}`;
          isValid = false;
        }
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (validateForm()) {
      if (typeof onSubmit === 'function') {
        const token = localStorage.getItem('token');
        console.log('[DEBUG][handleSubmit] Token actuel dans localStorage:', token);
        console.log('[DEBUG][handleSubmit] Données envoyées:', {
          typeKey: typeKey,
          subtypeKey: subtypeKey,
          variables: formData
        });
        try {
          const response = await api.post(
            '/ai/generate-resource',
            {
              type_key: typeKey,
              subtype_key: subtypeKey,
              variables: formData
            }
          );
          console.log('[DEBUG][handleSubmit] Réponse du backend:', response);
          onSubmit({
            typeKey: typeKey,
            subtypeKey: subtypeKey,
            variables: formData,
            backendResponse: response.data
          });
        } catch (err) {
          if (err.response) {
            console.error('[DEBUG][handleSubmit] Erreur backend:', err.response.status, err.response.data);
            setError('Erreur backend: ' + err.response.status + ' ' + JSON.stringify(err.response.data));
            if (err.response.status === 401) {
              alert('Erreur 401 : Token absent ou invalide. Veuillez vous reconnecter.');
            }
          } else {
            console.error('[DEBUG][handleSubmit] Erreur réseau ou inconnue:', err.message);
            setError('Erreur réseau ou inconnue: ' + err.message);
          }
        }
      } else if (typeof onSuccess === 'function') {
        onSuccess({
          typeKey: typeKey,
          subtypeKey: subtypeKey,
          variables: formData
        });
      } else {
        alert("Aucune fonction de soumission n'est définie (onSubmit/onSuccess)");
      }
    }
  };

  if (isLoading) return <div>Chargement du schéma...</div>;
  if (error) return <div style={{ color: 'red', margin: '1em 0' }}>{error}</div>;
  if (!formSchema) return <div style={{ color: 'orange', margin: '1em 0' }}>Aucun schéma reçu du backend.</div>;

  return (
    <div className="dynamic-ai-form">
      {formSchema.fields.map((field) => (
        <div key={field.name} className="form-group">
          <label htmlFor={field.name} className="form-label" title={field.description}>
            {field.label} {field.required && <span className="required">*</span>}
          </label>
          {field.type === 'number' ? (
            <input
              type="number"
              id={field.name}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              min={field.validations?.min}
              max={field.validations?.max}
              className={errors[field.name] ? 'form-control error' : 'form-control'}
            />
          ) : (
            <input
              type="text"
              id={field.name}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={handleChange}
              className={errors[field.name] ? 'form-control error' : 'form-control'}
            />
          )}
          {errors[field.name] && (
            <div className="error-message">{errors[field.name]}</div>
          )}
        </div>
      ))}
      <button 
        type="button" 
        className="btn btn-primary"
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading ? 'Génération en cours...' : 'Générer'}
      </button>
    </div>
  );
};

export default DynamicAIForm;

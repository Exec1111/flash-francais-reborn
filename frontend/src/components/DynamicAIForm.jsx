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
    // Réinitialiser l'état à chaque changement de typeKey ou subtypeKey
    setFormSchema(null);
    setFormData({});
    setErrors({});
    if (typeKey && subtypeKey) {
      console.log('DEBUG [DynamicAIForm] useEffect déclenché avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
      fetchSchema();
    } else {
      console.log('DEBUG [DynamicAIForm] useEffect: typeKey ou subtypeKey non défini');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey, subtypeKey]);

  const fetchSchema = async () => {
    console.log('DEBUG [DynamicAIForm] fetchSchema appelé avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Aucun jeton d'authentification trouvé.");
        setIsLoading(false);
        return;
      }
      // Utilise l'instance api (baseURL = http://localhost:10000/api/v1)
      const url = `/ai/resource-types/${typeKey}/${subtypeKey}/schema`;
      let response;
      try {
        response = await api.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    
    // Convertir en nombre si nécessaire
    const processedValue = type === 'number' ? parseFloat(value) : value;
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
    
    // Effacer l'erreur lorsque l'utilisateur modifie le champ
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
      // Vérifier les champs obligatoires
      if (field.required && (formData[field.name] === undefined || formData[field.name] === '')) {
        newErrors[field.name] = `${field.label} est obligatoire`;
        isValid = false;
      }
      
      // Vérifier les validations supplémentaires
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Priorité à onSubmit si défini, sinon fallback sur onSuccess
      if (typeof onSubmit === 'function') {
        onSubmit({
          typeKey: typeKey,
          subtypeKey: subtypeKey,
          variables: formData
        });
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
    <form onSubmit={handleSubmit} className="dynamic-ai-form">
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
        type="submit" 
        className="btn btn-primary"
        disabled={loading}
      >
        {loading ? 'Génération en cours...' : 'Générer'}
      </button>
    </form>
  );
};

export default DynamicAIForm;

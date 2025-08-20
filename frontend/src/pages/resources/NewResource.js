import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResourceForm from '../../components/resources/ResourceForm';
import resourceTypeService from '../../services/resourceTypeService';

const NewResource = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Query params
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const userId = searchParams.get('userId');
  const initialSource = (searchParams.get('source') || 'ai').toLowerCase(); // 'file' pour PDF
  const hideType = searchParams.get('hideType') === '1' || searchParams.get('hideType') === 'true';
  const hideSO = searchParams.get('hideSO') === '1' || searchParams.get('hideSO') === 'true';
  const presetTypeKey = searchParams.get('presetTypeKey'); // ex: FILE ou FICHIER
  const presetSubtypeKey = searchParams.get('presetSubtypeKey');
  const returnTo = decodeURIComponent(searchParams.get('returnTo') || '/resources');
  const lockType = searchParams.get('lockType') === '1' || searchParams.get('lockType') === 'true';
  const pdfOnly = searchParams.get('pdfOnly') === '1' || searchParams.get('pdfOnly') === 'true';
  const attachSOIdRaw = searchParams.get('attachSOId');
  const attachSOId = attachSOIdRaw ? Number(attachSOIdRaw) : null;

  const [forcedType, setForcedType] = useState(null);

  // Données initiales pour le formulaire
  const initialData = {
    title: '',
    description: '',
    type_id: '',
    sub_type_id: '',
    content: '',
    user_id: userId || undefined,
    // Pré-remplir l'association à l'objet d'étude quand on vient de l'édition d'un SO
    ...(attachSOId && !Number.isNaN(attachSOId) ? { study_object_ids: [attachSOId] } : {})
  };

  // Résoudre le type/subtype à partir des types REST standards si demandé
  useEffect(() => {
    let ignore = false;
    const resolveForced = async () => {
      if (!presetTypeKey) return;
      try {
        const types = await resourceTypeService.getAllTypes();
        if (!types || !Array.isArray(types)) return;

        const findByKey = (key) => types.find(t => t.key && t.key.toLowerCase() === String(key).toLowerCase());
        let typeObj = findByKey(presetTypeKey);

        // Fallback: tenter recherche par libellé
        if (!typeObj) {
          const byLabel = types.find(t => (t.value || '').toLowerCase().includes('oeuvre'));
          typeObj = byLabel || null;
        }

        if (!typeObj) return;

        let subtypeObj = null;
        if (presetSubtypeKey) {
          // Charger les sous-types via l'API standard pour obtenir des IDs cohérents
          try {
            const subtypes = await resourceTypeService.getSubtypesByType(typeObj.id);
            if (Array.isArray(subtypes)) {
              subtypeObj = subtypes.find(st => st.key && st.key.toLowerCase() === presetSubtypeKey.toLowerCase()) || null;
            }
          } catch (_) {}
        }

        if (!ignore) {
          setForcedType({
            typeId: typeObj.id,
            subtypeId: subtypeObj ? subtypeObj.id : null,
            typeName: typeObj.value,
            subtypeName: subtypeObj ? subtypeObj.value : undefined,
          });
        }
      } catch (e) {
        console.warn('[NewResource] Impossible de résoudre forcedType:', e);
      }
    };
    resolveForced();
    return () => { ignore = true; };
  }, [presetTypeKey, presetSubtypeKey]);

  const handleSuccess = (createdResource) => {
    // Revenir à la page appelante avec la ressource créée dans l'état de navigation
    navigate(returnTo, { state: { createdResource, messageSuccess: 'Ressource créée à partir d\'un PDF' } });
  };

  const effectiveHideType = hideType && Boolean(forcedType);
  const effectiveLockType = lockType && Boolean(forcedType);

  // Si on doit verrouiller le type mais qu'il n'est pas encore résolu, afficher un chargement
  const mustWaitForForcedType = lockType && Boolean(presetTypeKey);
  if (mustWaitForForcedType && !forcedType) {
    return (
      <div style={{ padding: 24 }}>
        Chargement du type de ressource...
      </div>
    );
  }

  return (
    <ResourceForm
      isDialog={false}
      initialData={initialData}
      isEdit={false}
      // Préconfigurations selon query params
      hideTypeSelection={effectiveHideType}
      hideStudyObjectSelection={hideSO}
      forcedType={forcedType}
      lockTypeSelection={effectiveLockType}
      disableSourceSelection={initialSource === 'file'}
      initialSourceType={initialSource}
      allowedMimeTypesOverride={pdfOnly ? ['application/pdf'] : null}
      disableNavigation={true}
      onSuccess={handleSuccess}
    />
  );
};

export default NewResource;

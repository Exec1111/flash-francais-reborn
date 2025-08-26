import React from 'react';
import { Grid, Box, Card, CardContent, CardHeader } from '@mui/material';
import DynamicAIForm from '../../DynamicAIForm/index';

/**
 * Component for AI generation form wrapper
 */
const ResourceAIGenerator = ({
  showAIGenerationForm,
  selectedType,
  selectedSubType,
  forcedType,
  handleSubmit,
  onSuccess,
  navigate,
  disableNavigation,
  isEdit,
  isDialog,
  selectedStudyObjects,
  prefilledAiData,
  formData
}) => {
  if (!showAIGenerationForm) {
    return null;
  }

  return (
    <Grid item xs={12}>
      <Box sx={{ mt: 2 }}>
        <Card>
          <CardHeader title="Générateur de ressource basé sur l'IA" />
          <CardContent>
            {/* Debug logging */}
            {console.log('[DEBUG] Clés transmises au DynamicAIForm:', {
              typeKey: selectedType?.key || (forcedType ? 'LECON' : ''),
              subtypeKey: selectedSubType?.key || (forcedType ? 'SEQUENCE_SUMMARY' : ''),
              typeId: selectedType?.id || forcedType?.typeId,
              subtypeId: selectedSubType?.id || forcedType?.subtypeId
            })}
            <DynamicAIForm
              typeKey={selectedType?.key || (forcedType ? 'LECON' : '')}
              subtypeKey={selectedSubType?.key || (forcedType ? 'SEQUENCE_SUMMARY' : '')}
              typeId={selectedType?.id || forcedType?.typeId}
              subtypeId={selectedSubType?.id || forcedType?.subtypeId}
              onSubmit={handleSubmit}
              onSuccess={(createdResource) => {
                console.log('[DEBUG] ResourceForm.js -> onSuccess de DynamicAIForm: Callback déclenché.', { createdResource });

                if (onSuccess) {
                  console.log('[DEBUG] ResourceForm.js: Appel du onSuccess parent.');
                  onSuccess(createdResource);
                } else {
                  console.warn('[DEBUG] ResourceForm.js: Pas de callback onSuccess parent à appeler.');
                }

                if (!disableNavigation && !isEdit && !isDialog) {
                  console.log('[DEBUG] ResourceForm.js: Redirection vers /resources via navigate().');
                  navigate('/resources');
                } else {
                  console.log('[DEBUG] ResourceForm.js: Navigation désactivée.', { disableNavigation, isEdit, isDialog });
                }
              }}
              selectedStudyObjects={selectedStudyObjects}
              prefilledData={{
                ...(prefilledAiData || {}),
                title: formData.title,
                description: formData.description
              }}
              readOnlyMode={false}
            />
          </CardContent>
        </Card>
      </Box>
    </Grid>
  );
};

export default ResourceAIGenerator;
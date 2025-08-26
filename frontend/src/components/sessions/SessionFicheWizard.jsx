import React, { useState } from 'react';
import { Box, Stepper, Step, StepLabel, Paper } from '@mui/material';
import FicheResourceSelector from './FicheResourceSelector';
import FicheEditor from './FicheEditor';
import sessionService from '../../services/sessionService';
import { API_BASE_URL } from '../../services/api';

const steps = ['Sélection des ressources', 'Édition de la fiche'];

const SessionFicheWizard = ({ sessionId, onFinish }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [resourcesConfig, setResourcesConfig] = useState([]); // [{id, checked, intro}]

  /**
   * Construit une URL absolue vers un fichier HTML stocké côté backend en se
   * basant sur la même logique que celle utilisée dans ResourceForm.
   */
  const buildFullUrl = (relativeUrlRaw = '') => {
    const relativeUrl = (relativeUrlRaw || '').replace(/\\/g, '/');
    if (!relativeUrl) return null;
    if (relativeUrl.startsWith('http')) return relativeUrl;

    let base = API_BASE_URL || '';
    base = base.replace(/\/api\/?$/, '');
    if (relativeUrl.startsWith('/media/uploads/')) {
      return `${base}${relativeUrl}`;
    }
    if (relativeUrl.startsWith('media/uploads/')) {
      return `${base}/${relativeUrl}`;
    }
    if (relativeUrl.startsWith('uploads/')) {
      return `${base}/media/uploads/${relativeUrl}`;
    }
    return `${base}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  };


  const next = async () => {
    if (activeStep === 0) {
      // construire blocs avec html avant de passer à l'étape éditeur
      const selected = resourcesConfig.filter((r) => r.checked);
      const { default: resourceService } = await import('../../services/resourceService');
      const blocsWithHtml = [];
      for (const r of selected) {
        const res = await resourceService.getById(r.id);
        let html = res.content_html || res.content || res.html || '';
        if (!html) {
          const path = res.file_path || res.url || res.html_url || res.html_content_url;
          const fullUrl = buildFullUrl(path);
          if (fullUrl) {
            try {
              html = await fetch(fullUrl).then((r) => r.text());
            } catch (e) {
              console.error('Erreur chargement HTML', e);
              html = '';
            }
          }
        }
        blocsWithHtml.push({ ...r, html });
      }
      setResourcesConfig(blocsWithHtml);
    }
    setActiveStep((s) => s + 1);
  };
  const back = () => setActiveStep((s) => s - 1);

  const buildBlocs = async () => {
    // appeler API pour récupérer HTML des ressources sélectionnées
    const { default: resourceService } = await import('../../services/resourceService');
    const selected = resourcesConfig.filter((r) => r.checked);
    const blocs = [];
    for (const r of selected) {
      const res = await resourceService.getById(r.id);
      let html = res.content_html || res.content || res.html || '';
        if (!html) {
          const path = res.file_path || res.url || res.html_url || res.html_content_url;
          const fullUrl = buildFullUrl(path);
          if (fullUrl) {
            try {
              html = await fetch(fullUrl).then((r) => r.text());
            } catch (e) {
              console.error('Erreur chargement HTML', e);
              html = '';
            }
          }
        }
      blocs.push({ ...r, html });
    }
    return blocs;
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <FicheResourceSelector
            sessionId={sessionId}
            value={resourcesConfig}
            onChange={setResourcesConfig}
            onNext={next}
          />
        );
      case 1:
        return (
          <FicheEditor
            sessionId={sessionId}
            blocs={resourcesConfig}
            onBack={back}
            onFinish={async (resourceId) => {
              try {
                // Cas particulier: le flux "Générer la fiche" doit TOUJOURS mettre à jour fiche_resource_id
                if (resourceId) {
                  await sessionService.attachFiche(sessionId, resourceId);
                }
              } catch (e) {
                console.error('Erreur lors de l\'attachement de la fiche', e);
              } finally {
                if (onFinish) onFinish();
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Paper sx={{ p: 2 }}>{renderStep()}</Paper>
    </Box>
  );
};

export default SessionFicheWizard;

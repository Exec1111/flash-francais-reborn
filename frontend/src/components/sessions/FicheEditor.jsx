import React, { useState, useEffect } from 'react';
import TinyHtmlEditor from '../editors/TinyHtmlEditor';
import { Box, Button, CircularProgress } from '@mui/material';
import resourceService from '../../services/resourceService';
import sessionService from '../../services/sessionService';
import { resourceTypeService } from '../../services/resourceTypeService';

/**
 * Étape 2 : éditeur TinyMCE + sauvegarde comme ressource summary
 * props : sessionId, blocs [{id, intro, html}], onBack, onFinish
 */
const FicheEditor = ({ sessionId, blocs, onBack, onFinish }) => {
  const [content, setContent] = useState('');
  const [extraStyles, setExtraStyles] = useState('');
  const [saving, setSaving] = useState(false);

  // construit le HTML initial à partir du template simple + blocs
  // extrait le contenu <body> et les blocs <style> éventuels
  const extractBody = (html) => {
    if (!html) return '';
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    // Récupérer les styles déclarés dans le head du document de la ressource
    const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    if (styleBlocks.length) {
      // concatène
      setExtraStyles(prev => prev + '\n' + styleBlocks.join('\n'));
    }
    if (bodyMatch) return bodyMatch[1];
    // Fallback: si déjà du contenu seul
    return html;
  };

  useEffect(() => {
    const build = () => {
      // reset styles à chaque rebuild
      setExtraStyles('');
      const body = blocs
        .filter((b) => b.checked)
        .map((b) => {
          const inner = extractBody(b.html);
          return `
          <section class="bloc">
            ${b.intro ? `<p>${b.intro}</p>` : ''}
            ${inner}
          </section>`;
        })
        .join('\n');
      setContent(body);
    };
    build();
  }, [blocs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // récupérer type & subtype ids (seance/summary)
      const types = await resourceTypeService.getAllTypes();
      const seanceType = types.find((t) => t.key.toLowerCase() === 'seance');
      const sub = await resourceTypeService.getSubtypesByType(seanceType.id);
      const summarySubtype = sub.find((s) => s.key.toLowerCase() === 'summary');

      // Générer un document HTML complet avec style intégré
      const htmlFull = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Fiche séance</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; }
    .bloc { margin-bottom: 2rem; }
    .fiche h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    .subtitle { font-style: italic; color: #555; margin-bottom: 1rem; }
    .content-section { margin-bottom: 1.5rem; }
    .highlight { font-weight: bold; color: #c0392b; }
    ul { padding-left: 1.2rem; }
    /* Styles hérités des ressources composées */
${extraStyles}
  </style>
</head>
<body>
${content}
</body>
</html>`;

      // Construire le payload sous forme de FormData (multipart)
      const form = new FormData();
      form.append('title', `Fiche séance ${sessionId}`);
      form.append('type_id', seanceType.id);
      form.append('sub_type_id', summarySubtype.id);
      form.append('source_type', 'file'); // On envoie un fichier HTML généré côté client
      // Joindre le fichier HTML (Blob) :
      const file = new File([htmlFull], `fiche_seance_${sessionId}.html`, { type: 'text/plain' });
      form.append('file', file);
      // Joindre la session courante pour lier la ressource
      form.append('session_ids_json', JSON.stringify([sessionId]));

      const resp = await resourceService.create(form);
      await sessionService.attachFiche(sessionId, resp.id);
      onFinish();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {saving && <CircularProgress />}
      <TinyHtmlEditor initialHtml={content} onChange={(html)=>setContent(html)} />
      <Box mt={2}>
        <Button onClick={onBack} sx={{ mr: 2 }}>Retour</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>Enregistrer</Button>
      </Box>
    </Box>
  );
};

export default FicheEditor;

import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Paper,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../contexts/AuthContext';
import oeuvreService from '../services/oeuvreService';
import studyObjectService from '../services/studyObjectService';
import OeuvreSuggestionStep from './OeuvreSuggestionStep';

const steps = ['Configuration', 'Suggestions', 'Création'];

const OeuvreWizard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fromStudyObject = location?.state?.fromStudyObject || null;

  const [activeStep, setActiveStep] = useState(0);

  // Configuration
  const [extrait, setExtrait] = useState(false);
  const [genForm, setGenForm] = useState({
    titre: '',
    auteur_prenom: '',
    auteur_nom: '',
    type_prefere: '',
    niveau_cible: ''
  });
  const [promptLibre, setPromptLibre] = useState('');
  const [nbSuggestions, setNbSuggestions] = useState(3);

  // Data states
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });

  // Création
  const [isCreating, setIsCreating] = useState(false);
  const [creationResults, setCreationResults] = useState([]); // [{ok: boolean, data?: any, error?: string}]

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  // Petite utilitaire d'attente
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Construit une consigne d'exclusion pour éviter les doublons entre itérations
  const buildExclusionText = (titles) => {
    if (!Array.isArray(titles) || titles.length === 0) return '';
    const unique = Array.from(new Set(titles.filter(Boolean)));
    if (unique.length === 0) return '';
    if (unique.length === 1) return `Ne propose pas l'œuvre "${unique[0]}".`;
    return `Ne propose aucune des œuvres suivantes : ${unique.map((t) => `"${t}"`).join(', ')}.`;
  };

  // Récupère le titre depuis différentes structures possibles de réponse
  const getTitle = (obj) =>
    obj?.titre || obj?.title || obj?.oeuvre?.titre || obj?.oeuvre?.title || '';

  // Génération des suggestions IA (plusieurs variantes)
  const generateSuggestions = async () => {
    setSuggestionsError('');
    setIsSuggesting(true);
    setGenProgress({ current: 0, total: 0 });
    try {
      // Récupération des types d'œuvres disponibles pour varier les propositions
      let types = [];
      try {
        const typesData = await oeuvreService.getTypesOeuvres();
        if (Array.isArray(typesData)) {
          types = typesData.map((t) => (typeof t === 'string' ? t : t?.key || t?.name)).filter(Boolean);
        }
      } catch (e) {
        // Fallback basique si l'endpoint n'est pas dispo
        types = ['roman', 'nouvelle', 'poème', 'théâtre'];
      }
      // Déterminer le nombre de variantes à générer selon nbSuggestions
      const desired = Math.max(1, Math.min(5, parseInt(nbSuggestions, 10) || 3));
      const baseTypes = (types.length > 0 ? types : ['roman', 'nouvelle', 'poème', 'théâtre']);

      const base = {
        titre: genForm.titre,
        auteur_prenom: genForm.auteur_prenom,
        auteur_nom: genForm.auteur_nom,
        niveau_cible: genForm.niveau_cible || undefined,
        // Champs additionnels
        prompt_libre: promptLibre || undefined,
        study_object_title: fromStudyObject?.title || undefined,
        study_object_description: fromStudyObject?.description || undefined,
        // On force 1 suggestion par appel pour faire exactement 'desired' appels
        nombre_suggestions: 1,
      };

      // Toujours créer exactement 'desired' payloads pour déclencher autant d'appels
      const payloads = Array.from({ length: desired }, (_, i) => ({
        ...base,
        type_prefere: genForm.type_prefere || baseTypes[i % baseTypes.length],
        extrait: i % 2 === 0 ? !!extrait : !extrait, // alterne pour varier
      }));

      // Exécuter séquentiellement pour éviter les collisions côté backend ("Step is still running")
      const results = [];
      const seenTitles = [];
      setGenProgress({ current: 0, total: payloads.length });
      for (let i = 0; i < payloads.length; i++) {
        const p = { ...payloads[i] };
        // Ajouter une instruction d'exclusion basée sur les titres déjà proposés
        const exclusionNote = buildExclusionText(seenTitles);
        p.prompt_libre = [base.prompt_libre, exclusionNote].filter(Boolean).join(' ');
        try {
          const r = await oeuvreService.generateOeuvreAI(p);
          results.push(r);
          const t = getTitle(r);
          if (t) seenTitles.push(t);
        } catch (e1) {
          const msg = e1?.response?.data?.detail || e1?.message || '';
          // Retry unique si c'est un blocage transitoire connu
          if (typeof msg === 'string' && msg.toLowerCase().includes('step is still running')) {
            await sleep(1200);
            try {
              const r2 = await oeuvreService.generateOeuvreAI(p);
              results.push(r2);
              const t2 = getTitle(r2);
              if (t2) seenTitles.push(t2);
            } catch (e2) {
              results.push({ __error: e2 });
            }
          } else {
            results.push({ __error: e1 });
          }
        }
        // Mettre à jour la progression et ménager le backend
        setGenProgress((prev) => ({ current: Math.min(i + 1, prev.total), total: prev.total }));
        if (i < payloads.length - 1) {
          await sleep(350);
        }
      }
      const ok = results.filter((r) => !r?.__error);
      if (ok.length === 0) {
        throw new Error('Aucune suggestion générée.');
      }
      setSuggestions(ok);
    } catch (e) {
      setSuggestionsError(e?.response?.data?.detail || e?.message || 'Erreur lors de la génération des suggestions.');
      setSuggestions([]);
    } finally {
      setIsSuggesting(false);
      // Laisser les valeurs finales visibles un court instant, puis réinitialiser au prochain cycle
    }
  };

  // Step 0: submit configuration
  const handleSubmitConfig = async () => {
    setError('');
    setIsBusy(true);
    setSelectedIndexes([]);
    setSelectedSuggestions([]);
    setCreationResults([]);
    setSuggestions([]);
    setSuggestionsError('');

    try {
      // Toujours génération IA
      const desiredCheck = parseInt(nbSuggestions, 10);
      if (Number.isNaN(desiredCheck) || desiredCheck < 1) {
        setError('Veuillez saisir un nombre de suggestions valide (>= 1).');
        setIsBusy(false);
        return;
      }
      await generateSuggestions();
      setActiveStep(1); // Étape Suggestions
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || e?.message || 'Erreur lors de la génération/du chargement.');
    } finally {
      setIsBusy(false);
    }
  };

  // Mapping suggestion -> payload OeuvreCreate (identique à "Nouvelle œuvre")
  const mapSuggestionToOeuvre = (sugg) => {
    if (!sugg || typeof sugg !== 'object') return null;

    // Auteur tel que renvoyé par /oeuvres/generate, fallback léger si nécessaire
    const auteur = (sugg.auteur && typeof sugg.auteur === 'object')
      ? {
          nom: sugg.auteur.nom,
          prenom: sugg.auteur.prenom,
          nationalite: sugg.auteur.nationalite,
        }
      : {
          nom: sugg.auteur_nom,
          prenom: sugg.auteur_prenom,
          nationalite: sugg.nationalite_auteur,
        };

    // Normalisation numérique simple de l'année
    let date_publication = sugg.date_publication;
    if (date_publication !== undefined && date_publication !== null) {
      const n = parseInt(String(date_publication), 10);
      if (!Number.isNaN(n)) date_publication = n;
    }

    const tags = Array.isArray(sugg.tags)
      ? Array.from(new Set([...sugg.tags, 'suggestion_ia']))
      : ['suggestion_ia'];

    const payload = {
      ...(sugg.titre ? { titre: sugg.titre } : {}),
      ...(auteur && (auteur.nom || auteur.prenom || auteur.nationalite) ? { auteur } : {}),
      ...(sugg.type ? { type: sugg.type } : {}),
      ...(sugg.genre ? { genre: sugg.genre } : {}),
      ...(sugg.mouvement_litteraire ? { mouvement_litteraire: sugg.mouvement_litteraire } : {}),
      ...(sugg.langue_originale ? { langue_originale: sugg.langue_originale } : {}),
      ...(date_publication !== undefined ? { date_publication } : {}),
      ...(typeof sugg.extrait === 'boolean' ? { extrait: sugg.extrait } : {}),
      ...(sugg.contenu && typeof sugg.contenu === 'object' ? { contenu: sugg.contenu } : {}),
      ...(sugg.pedagogie && typeof sugg.pedagogie === 'object' ? { pedagogie: sugg.pedagogie } : {}),
      ...(tags ? { tags } : {}),
      ...(sugg.ressources && typeof sugg.ressources === 'object' ? { ressources: sugg.ressources } : {}),
    };

    return payload;
  };

  // Création de plusieurs œuvres à partir des suggestions sélectionnées
  const createSelected = async (items) => {
    const toCreate = Array.isArray(items) ? items : selectedSuggestions;
    setIsCreating(true);
    setCreationResults([]);
    const results = [];
    const createdIds = [];
    for (let i = 0; i < toCreate.length; i++) {
      const sugg = toCreate[i];
      try {
        const payload = mapSuggestionToOeuvre(sugg);
        if (!payload) {
          results.push({ ok: false, error: 'Suggestion invalide: payload vide.' });
          continue;
        }
        const created = await oeuvreService.createOeuvre(payload);
        results.push({ ok: true, data: created });
        if (created?.id) createdIds.push(created.id);
      } catch (e) {
        console.error(e);
        results.push({ ok: false, error: e?.response?.data?.detail || e?.message || 'Erreur lors de la création.' });
      }
    }
    // Association à l'objet d'étude source si présent
    if (fromStudyObject?.id && createdIds.length > 0) {
      try {
        const so = await studyObjectService.getStudyObjectById(fromStudyObject.id);
        const existing = Array.isArray(so?.oeuvre_ids) ? so.oeuvre_ids : [];
        const merged = Array.from(new Set([...(existing || []), ...createdIds]));
        await studyObjectService.updateStudyObject(fromStudyObject.id, { oeuvre_ids: merged });
        results.push({ ok: true, data: { note: `Associations effectuées à l'objet d'étude #${fromStudyObject.id}`, oeuvre_ids: merged } });
      } catch (e) {
        console.error(e);
        results.push({ ok: false, error: `Association à l'objet d'étude #${fromStudyObject?.id} échouée: ` + (e?.response?.data?.detail || e?.message || 'Erreur inconnue') });
      }
    }
    setCreationResults(results);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setError('');
    setIsBusy(true);
    try {
      const payload = selectedSuggestions?.[0];
      if (!payload) {
        setError("Aucune donnée à sauvegarder.");
        setIsBusy(false);
        return;
      }
      if (payload.id) {
        await oeuvreService.updateOeuvre(payload.id, payload);
      } else {
        await oeuvreService.createOeuvre(payload);
      }
      // Indication visuelle minimale
      setActiveStep(steps.length - 1);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || e?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsBusy(false);
    }
  };

  // UI blocks per step
  const renderConfig = () => (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Nombre de suggestions (seul champ requis) */}
        <Grid item xs={12} sm={4}>
          <TextField
            label="Nombre de suggestions"
            type="number"
            inputProps={{ min: 1, max: 5 }}
            value={nbSuggestions}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) setNbSuggestions('');
              else setNbSuggestions(Math.max(1, Math.min(5, v)));
            }}
            fullWidth
            required
            helperText="1 à 5 variantes seront générées"
          />
        </Grid>
        {/* Prompt libre juste sous le nombre de suggestions */}
        <Grid item xs={12}>
          <TextField
            label="Prompt libre (optionnel)"
            value={promptLibre}
            onChange={(e) => setPromptLibre(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            placeholder="Ajoutez des consignes spécifiques pour guider l'IA (style, thèmes, contraintes...)"
          />
        </Grid>

        {/* Paramètres avancés pliables pour aérer l'interface */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Paramètres avancés (facultatifs)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {fromStudyObject && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Données de l'objet d'étude (lecture seule)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Objet d'étude - titre"
                        value={fromStudyObject.title || ''}
                        fullWidth
                        variant="filled"
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Objet d'étude - description"
                        value={fromStudyObject.description || ''}
                        fullWidth
                        multiline
                        minRows={2}
                        variant="filled"
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'action.hover' } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                  </>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Titre (optionnel)"
                    value={genForm.titre}
                    onChange={(e) => setGenForm({ ...genForm, titre: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Prénom de l'auteur (optionnel)"
                    value={genForm.auteur_prenom}
                    onChange={(e) => setGenForm({ ...genForm, auteur_prenom: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Nom de l'auteur (optionnel)"
                    value={genForm.auteur_nom}
                    onChange={(e) => setGenForm({ ...genForm, auteur_nom: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Type préféré (optionnel)"
                    value={genForm.type_prefere}
                    onChange={(e) => setGenForm({ ...genForm, type_prefere: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Niveau cible (optionnel)"
                    value={genForm.niveau_cible}
                    onChange={(e) => setGenForm({ ...genForm, niveau_cible: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Switch checked={extrait} onChange={(e) => setExtrait(e.target.checked)} />}
                    label="Générer un extrait (sinon œuvre complète)"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleSubmitConfig} disabled={isBusy}>
              {isBusy ? <CircularProgress size={20} /> : 'Continuer'}
            </Button>
          </Box>
        </Grid>
        {isSuggesting && (
          <Grid item xs={12}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Génération des suggestions… {genProgress.current}/{genProgress.total}
              </Typography>
              <LinearProgress variant={genProgress.total > 0 ? 'determinate' : 'indeterminate'} value={genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : undefined} />
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  // Étape Suggestions (rendu)
  const renderSuggestions = () => (
    <Paper sx={{ p: 2 }}>
      <OeuvreSuggestionStep
        suggestions={suggestions}
        isSuggesting={isSuggesting}
        suggestionsError={suggestionsError}
        selectedIndexes={selectedIndexes}
        onToggleSelect={(idx) => {
          setSelectedIndexes((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]);
        }}
        onValidateSelection={() => {
          const chosen = selectedIndexes.map((i) => suggestions[i]).filter(Boolean);
          setSelectedSuggestions(chosen);
          setActiveStep(steps.length - 1); // passer directement à Création
          createSelected(chosen);
        }}
        onBack={handleBack}
        onRetryAll={generateSuggestions}
      />
    </Paper>
  );

  const renderCreation = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Résultats de création d'œuvres
      </Typography>
      {isCreating && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={24} />
          <Typography>Création en cours…</Typography>
        </Box>
      )}
      {creationResults.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {creationResults
            .filter((r) => r?.ok && r?.data?.id)
            .map((r, i) => (
              <Alert key={i} severity="success">
                {`Créée: ${r?.data?.titre || '—'} (id ${r?.data?.id})`}
              </Alert>
            ))}
        </Box>
      ) : (
        !isCreating && selectedSuggestions.length === 0 && (
          <Alert severity="info">Aucune sélection à créer. Retournez aux suggestions.</Alert>
        )
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button variant="outlined" onClick={handleBack}>Retour</Button>
        {fromStudyObject?.id && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/study-objects/${fromStudyObject.id}`)}
          >
            Retour à l'objet d'étude
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Paper>
  );

  const renderContent = () => {
    if (activeStep === 0) return renderConfig();
    if (activeStep === 1) return renderSuggestions();
    return renderCreation();
  };

  // reset résultats de création quand la sélection change
  useEffect(() => {
    setCreationResults([]);
  }, [selectedSuggestions]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Assistant Œuvre (Wizard)</Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 2 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default OeuvreWizard;

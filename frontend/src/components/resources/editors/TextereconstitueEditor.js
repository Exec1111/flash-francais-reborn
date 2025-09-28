import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import JsonChatBot from '../../jsonChat/JsonChatBot';

/**
 * Éditeur structuré pour l'exercice "Texte reconstitué"
 * Données attendues (format JSON-first):
 * {
 *   titre, consigne, theme, type_texte, difficulte,
 *   texte_original,
 *   elements_melanges: [{ id:number, contenu:string, marqueurs_logiques:string[] }],
 *   ordre_correct: number[],
 *   indices: [{ type:'temporel'|'logique'|'structural'|'lexical', description:string, exemple?:string }],
 *   explication: { logique_construction, structure_textuelle, connecteurs_cles: [{connecteur, fonction}] },
 *   criteres_evaluation: [{ critere, description, points }]
 * }
 */
const TextereconstitueEditor = ({ initialData, onSave, onCancel, submitting = false }) => {
  // Champs principaux
  const [titre, setTitre] = useState('');
  const [consigne, setConsigne] = useState('');
  const [theme, setTheme] = useState('');
  const [typeTexte, setTypeTexte] = useState('');
  const [difficulte, setDifficulte] = useState('');
  const [texteOriginal, setTexteOriginal] = useState('');

  // Éléments & ordre
  const [elements, setElements] = useState([]); // [{id, contenu, marqueurs_logiques:[] }]
  const ordreCorrect = useMemo(() => elements.map(e => Number(e.id)).filter(n => !Number.isNaN(n)), [elements]);

  // Indices
  const [indices, setIndices] = useState([]); // [{type, description, exemple?}]

  // Explication
  const [logiqueConstruction, setLogiqueConstruction] = useState('');
  const [structureTextuelle, setStructureTextuelle] = useState('');
  const [connecteurs, setConnecteurs] = useState([]); // [{connecteur, fonction}]

  // Critères d'évaluation
  const [criteres, setCriteres] = useState([]); // [{critere, description, points}]

  // IA
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState('');

  // Hydratation depuis la ressource existante
  useEffect(() => {
    let raw = initialData?.data_json ?? null;
    if (!raw) return;
    // Accepter data_json string → parser
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[TextereconstitueEditor] data_json string invalide, parse échoué:', e);
        return;
      }
    }
    const data = (raw && typeof raw === 'object' && raw.exercice) ? raw.exercice : raw;
    // Traces debug
    // eslint-disable-next-line no-console
    console.log('[TextereconstitueEditor] data_json reçu:', initialData?.data_json);
    // eslint-disable-next-line no-console
    console.log('[TextereconstitueEditor] données normalisées:', data);

    setTitre(data.titre || '');
    setConsigne(data.consigne || '');
    setTheme(data.theme || '');
    setTypeTexte(data.type_texte || '');
    setDifficulte(data.difficulte || '');
    setTexteOriginal(data.texte_original || '');
    setElements(Array.isArray(data.elements_melanges) ? data.elements_melanges : []);
    setIndices(Array.isArray(data.indices) ? data.indices : []);
    const exp = data.explication || {};
    setLogiqueConstruction(exp.logique_construction || '');
    setStructureTextuelle(exp.structure_textuelle || '');
    setConnecteurs(Array.isArray(exp.connecteurs_cles) ? exp.connecteurs_cles : []);
    setCriteres(Array.isArray(data.criteres_evaluation) ? data.criteres_evaluation : []);
  }, [initialData]);

  // CRUD helpers
  const addElement = () => {
    const nextId = elements.length > 0 ? Math.max(...elements.map(e => Number(e.id) || 0)) + 1 : 1;
    setElements([...elements, { id: nextId, contenu: '', marqueurs_logiques: [] }]);
  };
  const updateElement = (idx, patch) => {
    const copy = [...elements];
    copy[idx] = { ...copy[idx], ...patch };
    setElements(copy);
  };
  const removeElement = (idx) => {
    setElements(elements.filter((_, i) => i !== idx));
  };

  const addIndice = () => setIndices([...indices, { type: 'logique', description: '', exemple: '' }]);
  const updateIndice = (idx, patch) => {
    const copy = [...indices];
    copy[idx] = { ...copy[idx], ...patch };
    setIndices(copy);
  };
  const removeIndice = (idx) => setIndices(indices.filter((_, i) => i !== idx));

  const addConnecteur = () => setConnecteurs([...connecteurs, { connecteur: '', fonction: '' }]);
  const updateConnecteur = (idx, patch) => {
    const copy = [...connecteurs];
    copy[idx] = { ...copy[idx], ...patch };
    setConnecteurs(copy);
  };
  const removeConnecteur = (idx) => setConnecteurs(connecteurs.filter((_, i) => i !== idx));

  const addCritere = () => setCriteres([...criteres, { critere: '', description: '', points: 1 }]);
  const updateCritere = (idx, patch) => {
    const copy = [...criteres];
    copy[idx] = { ...copy[idx], ...patch };
    setCriteres(copy);
  };
  const removeCritere = (idx) => setCriteres(criteres.filter((_, i) => i !== idx));

  // Validation minimale
  const validate = () => {
    if (!titre.trim()) return 'Le titre est obligatoire';
    if (!consigne.trim()) return 'La consigne est obligatoire';
    if (!theme.trim()) return 'Le thème est obligatoire';
    if (!typeTexte) return 'Le type de texte est obligatoire';
    if (!difficulte) return 'La difficulté est obligatoire';
    if (!texteOriginal.trim()) return 'Le texte original est obligatoire';
    if (elements.length < 3) return 'Au moins 3 éléments mélangés sont requis';
    return '';
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const data = {
      titre: titre.trim(),
      consigne: consigne.trim(),
      theme: theme.trim(),
      type_texte: typeTexte,
      difficulte,
      texte_original: texteOriginal,
      elements_melanges: elements.map(e => ({
        id: Number(e.id),
        contenu: (e.contenu || '').trim(),
        marqueurs_logiques: Array.isArray(e.marqueurs_logiques) ? e.marqueurs_logiques.filter(Boolean) : []
      })),
      ordre_correct: ordreCorrect,
      indices: indices.map(i => ({
        type: i.type || 'logique',
        description: (i.description || '').trim(),
        ...(i.exemple ? { exemple: i.exemple } : {})
      })),
      explication: {
        logique_construction: (logiqueConstruction || '').trim(),
        structure_textuelle: (structureTextuelle || '').trim(),
        connecteurs_cles: connecteurs.map(c => ({
          connecteur: (c.connecteur || '').trim(),
          fonction: (c.fonction || '').trim()
        }))
      },
      criteres_evaluation: criteres.map(c => ({
        critere: (c.critere || '').trim(),
        description: (c.description || '').trim(),
        points: Number(c.points) || 1
      }))
    };
    onSave?.(data);
  };

  // IA helpers
  const getCurrentData = () => ({
    titre: titre.trim(),
    consigne: consigne.trim(),
    theme: theme.trim(),
    type_texte: typeTexte,
    difficulte,
    texte_original: texteOriginal,
    elements_melanges: elements,
    ordre_correct: ordreCorrect,
    indices,
    explication: {
      logique_construction: logiqueConstruction,
      structure_textuelle: structureTextuelle,
      connecteurs_cles: connecteurs
    },
    criteres_evaluation: criteres
  });

  const handleAiDataChange = (modified) => {
    if (!modified || typeof modified !== 'object') return;
    if (modified.titre !== undefined) setTitre(modified.titre || '');
    if (modified.consigne !== undefined) setConsigne(modified.consigne || '');
    if (modified.theme !== undefined) setTheme(modified.theme || '');
    if (modified.type_texte !== undefined) setTypeTexte(modified.type_texte || '');
    if (modified.difficulte !== undefined) setDifficulte(modified.difficulte || '');
    if (modified.texte_original !== undefined) setTexteOriginal(modified.texte_original || '');
    if (Array.isArray(modified.elements_melanges)) setElements(modified.elements_melanges);
    if (Array.isArray(modified.indices)) setIndices(modified.indices);
    if (modified.explication) {
      setLogiqueConstruction(modified.explication.logique_construction || '');
      setStructureTextuelle(modified.explication.structure_textuelle || '');
      if (Array.isArray(modified.explication.connecteurs_cles)) setConnecteurs(modified.explication.connecteurs_cles);
    }
    if (Array.isArray(modified.criteres_evaluation)) setCriteres(modified.criteres_evaluation);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#1e293b' }}>
      {/* Zone principale */}
      <Box sx={{ flex: showAiChat ? 2 : 1, p: 3, overflow: 'auto', mr: showAiChat ? 1 : 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#f8fafc' }}>
            Configuration de l'activité « Texte reconstitué »
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PsychologyIcon />}
            endIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowAiChat(!showAiChat)}
            disabled={submitting || aiLoading}
            sx={{ color: '#3b82f6', borderColor: '#3b82f6', '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#2563eb' } }}
          >
            {showAiChat ? 'Masquer l\'IA' : 'Assistant IA'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Informations générales */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <TextField label="Titre" value={titre} onChange={e => setTitre(e.target.value)} disabled={submitting}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <TextField label="Thème" value={theme} onChange={e => setTheme(e.target.value)} disabled={submitting}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <TextField label="Type de texte (narratif/descriptif/argumentatif/explicatif)" value={typeTexte} onChange={e => setTypeTexte(e.target.value)} disabled={submitting}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <TextField label="Difficulté (facile/moyen/difficile)" value={difficulte} onChange={e => setDifficulte(e.target.value)} disabled={submitting}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
        </Box>

        <TextField label="Consigne" multiline rows={2} value={consigne} onChange={e => setConsigne(e.target.value)} disabled={submitting}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />

        <TextField
          label="Texte original (solution)"
          multiline
          minRows={4}
          fullWidth
          value={texteOriginal}
          onChange={e => setTexteOriginal(e.target.value)}
          disabled={submitting}
          sx={{
            mb: 3,
            width: '100%',
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#475569',
              color: '#f8fafc',
              alignItems: 'flex-start'
            }
          }}
        />

        {/* Éléments mélangés */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>Éléments mélangés ({elements.length})</Typography>
            <Button startIcon={<AddIcon />} onClick={addElement} disabled={submitting} variant="contained" sx={{ backgroundColor: '#3b82f6' }}>Ajouter</Button>
          </Box>
          {elements.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2, color: '#94a3b8', fontStyle: 'italic' }}>Aucun élément.</Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {elements.map((el, idx) => (
                <Card key={idx} sx={{ backgroundColor: '#374151' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField label={`ID`} type="number" value={el.id}
                        onChange={e => updateElement(idx, { id: e.target.value })}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
                      <TextField label="Contenu" multiline rows={2} fullWidth value={el.contenu}
                        onChange={e => updateElement(idx, { contenu: e.target.value })}
                        sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
                      <IconButton onClick={() => removeElement(idx)} sx={{ color: '#ef4444' }}><DeleteIcon /></IconButton>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>Marqueurs logiques</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(el.marqueurs_logiques || []).map((m, mi) => (
                          <Chip key={mi} label={m} onDelete={() => {
                            const arr = [...(el.marqueurs_logiques || [])];
                            arr.splice(mi, 1);
                            updateElement(idx, { marqueurs_logiques: arr });
                          }} />
                        ))}
                        <TextField size="small" placeholder="Ajouter un marqueur"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const arr = [...(el.marqueurs_logiques || [])];
                              arr.push(e.currentTarget.value.trim());
                              updateElement(idx, { marqueurs_logiques: arr });
                              e.currentTarget.value = '';
                            }
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Indices */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#f8fafc' }}>Indices ({indices.length})</Typography>
            <Button startIcon={<AddIcon />} onClick={addIndice} disabled={submitting} variant="contained" sx={{ backgroundColor: '#3b82f6' }}>Ajouter</Button>
          </Box>
          {indices.map((ind, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 48px', gap: 1, mb: 1 }}>
              <TextField label="Type (temporel/logique/structural/lexical)" value={ind.type || ''}
                onChange={e => updateIndice(idx, { type: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <TextField label="Description" value={ind.description || ''}
                onChange={e => updateIndice(idx, { description: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <TextField label="Exemple (optionnel)" value={ind.exemple || ''}
                onChange={e => updateIndice(idx, { exemple: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <IconButton onClick={() => removeIndice(idx)} sx={{ color: '#ef4444' }}><DeleteIcon /></IconButton>
            </Box>
          ))}
        </Box>

        {/* Explication */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#f8fafc', mb: 1 }}>Explication</Typography>
          <TextField label="Logique de construction" multiline rows={2} value={logiqueConstruction} onChange={e => setLogiqueConstruction(e.target.value)}
            sx={{ mb: 1, '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <TextField label="Structure textuelle" multiline rows={2} value={structureTextuelle} onChange={e => setStructureTextuelle(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
          <Typography variant="subtitle1" sx={{ color: '#cbd5e1', mb: 1 }}>Connecteurs clés</Typography>
          {connecteurs.map((c, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 48px', gap: 1, mb: 1 }}>
              <TextField label="Connecteur" value={c.connecteur || ''} onChange={e => updateConnecteur(idx, { connecteur: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <TextField label="Fonction" value={c.fonction || ''} onChange={e => updateConnecteur(idx, { fonction: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <IconButton onClick={() => removeConnecteur(idx)} sx={{ color: '#ef4444' }}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addConnecteur} disabled={submitting} variant="outlined" sx={{ color: '#3b82f6', borderColor: '#3b82f6' }}>Ajouter un connecteur</Button>
        </Box>

        {/* Critères d'évaluation */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: '#f8fafc', mb: 1 }}>Critères d'évaluation</Typography>
          {criteres.map((c, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 120px 48px', gap: 1, mb: 1 }}>
              <TextField label="Critère" value={c.critere || ''} onChange={e => updateCritere(idx, { critere: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <TextField label="Description" value={c.description || ''} onChange={e => updateCritere(idx, { description: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <TextField label="Points" type="number" value={c.points || 1} onChange={e => updateCritere(idx, { points: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#475569', color: '#f8fafc' } }} />
              <IconButton onClick={() => removeCritere(idx)} sx={{ color: '#ef4444' }}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addCritere} disabled={submitting} variant="outlined" sx={{ color: '#3b82f6', borderColor: '#3b82f6' }}>Ajouter un critère</Button>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onCancel} disabled={submitting} sx={{ color: '#94a3b8', borderColor: '#94a3b8' }}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}>Enregistrer</Button>
        </Box>
      </Box>

      {/* Panneau IA */}
      {showAiChat && (
        <Box sx={{ flex: 1, ml: 1, borderLeft: '1px solid #475569', pl: 1, overflow: 'hidden' }}>
          <JsonChatBot
            currentData={getCurrentData()}
            resourceType="exercice"
            resourceSubtype="textereconstitue"
            onDataChange={handleAiDataChange}
            disabled={submitting}
            onLoadingChange={setAiLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default TextereconstitueEditor;

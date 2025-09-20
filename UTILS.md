# Scripts PowerShell – IA QCM (copier/coller)

Ces commandes enchaînées permettent de tester le workflow QCM sans passer par l’IHM.

## 0) Variables d’environnement

```powershell
# Base API locale (adapter si besoin: Render, etc.)
$baseUrl = "http://localhost:10000/api/v1"

# JWT d’auth (copier depuis le localStorage du frontend -> key 'token')
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqdWxpZW4udmFjaGV5QGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc1ODIxMTEwNywiaWF0IjoxNzU4MjEwMjA3fQ.V5JPGMry2VwSauON8knTPSBai0CtzgZO2NL3ELTtSXE"
```

## 1) Générer un QCM (JSON) – POST /ai/generate-resource

```powershell
$payload = @{
  type_key   = "exercice"
  subtype_key = "qcm"
  variables  = @{
    theme = "La Révolution française"
    niveau = "4ème"
    nombre_questions = 5
    nb_options = 4
    instructions_personnalisees = "Inclure un mélange de dates et notions essentielles."
  }
} | ConvertTo-Json -Depth 6

$gen = Invoke-RestMethod `
  -Uri "$baseUrl/ai/generate-resource" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $payload

# Sauvegarde optionnelle du JSON QCM généré
$gen.content | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -Path ".\qcm_generated.json"
"Génération OK. JSON QCM sauvegardé dans qcm_generated.json"
```

## 2) Fusionner en HTML statique (édition) – POST /ai/merge-resource

```powershell
# Prépare le JSON à envoyer (depuis la réponse précédente)
$dataJson = ($gen.content | ConvertTo-Json -Depth 20)
if (-not $dataJson) { $dataJson = Get-Content -Raw -Path ".\qcm_generated.json" }

$merge = Invoke-RestMethod `
  -Uri "$baseUrl/ai/merge-resource" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Form @{
    type_key   = "exercice"
    subtype_key = "qcm"
    data_json  = $dataJson
  }

"Fusion OK. URL d’aperçu (statique TinyMCE): $($merge.html_url)"

# Ouvrir dans le navigateur (aperçu)
if ($merge.html_url) { Start-Process $merge.html_url }
```

## 3) Éditer dans TinyMCE

- Charger le HTML de `$merge.html_url` dans TinyMCE (via l’app), éditer les textes (questions/options/explications), puis sauvegarder le HTML complet via `editorRef.current.getContent()`.
- Coller/mettre ce HTML dans un fichier local pour le test qui suit (ex: `mon_qcm_modifie.html`).

## 4) Parser le HTML édité en JSON canonique – POST /ai/parse-qcm-html

```powershell
$editedHtml = Get-Content -Raw -Path ".\mon_qcm_modifie.html"
$payload2 = @{ html = $editedHtml } | ConvertTo-Json -Depth 3

$parsed = Invoke-RestMethod `
  -Uri "$baseUrl/ai/parse-qcm-html" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json; charset=utf-8" } `
  -Body $payload2

$parsed | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -Path ".\qcm_parsed_from_html.json"
"Parsing OK. JSON canonique sauvegardé dans qcm_parsed_from_html.json"
```

---

Notes:
- Les réponses de fusion sont déjà “assainies” côté backend (suppression `<script>`, attributs `on*`, `<template>`) pour garantir un HTML 100% statique prêt pour TinyMCE.
- Pour changer de serveur, modifie simplement `$baseUrl`.
- Si une erreur “parsing body” survient, vérifie `-ContentType "application/json; charset=utf-8"` et l’encodage UTF-8.
Execution depuis powershell d'une génération IA :
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqdWxpZW4udmFjaGV5QGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc1ODIwOTM5NiwiaWF0IjoxNzU4MjA4NDk2fQ.BoNL40YOqTw5GampSUlrHKroC_0gMEph_v1-MNHM1yE"

$payload = @{
  type_key   = "exercice"
  subtype_key = "qcm"
  variables  = @{
    theme = "La Révolution française"
    niveau = "4ème"
    nombre_questions = 5
    nb_options = 4
    instructions_personnalisees = "Inclure un mélange de dates et notions essentielles."
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod `
  -Uri "http://localhost:10000/api/v1/ai/generate-resource" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $payload
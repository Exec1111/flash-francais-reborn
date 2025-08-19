import os
import json
import yaml
from jinja2 import Environment, FileSystemLoader
import jsonschema

class PromptGenerator:
    """
    Générateur de prompts basé sur des fichiers de configuration YAML.
    """
    def __init__(self, prompt_name: str):
        # Répertoire des configs
        prompts_root = os.path.dirname(__file__)
        config_dir = os.path.join(prompts_root, "config", "prompts")
        methodologies_dir = os.path.join(prompts_root, "methodologies")
        # Accepter un nom avec ou sans extension .yaml/.yml
        if prompt_name.lower().endswith((".yaml", ".yml")):
            cfg_filename = prompt_name
        else:
            cfg_filename = f"{prompt_name}.yaml"
        cfg_path = os.path.join(config_dir, cfg_filename)
        with open(cfg_path, encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        self.config = cfg

        # Environnement Jinja (permettra de rendre aussi system_prompt)
        self._env = Environment(loader=FileSystemLoader(config_dir))

        # Charger optionnellement des fichiers Markdown à injecter
        self._methodology_md = ""
        include_md = cfg.get("include_markdown")
        md_chunks = []
        if include_md:
            md_files = include_md if isinstance(include_md, list) else [include_md]
            for md_rel in md_files:
                # Résolution flexible: d'abord dans methodologies/, sinon relatif au prompts_root
                candidate_paths = [
                    os.path.join(methodologies_dir, md_rel),
                    os.path.join(prompts_root, md_rel),
                ]
                for p in candidate_paths:
                    if os.path.isfile(p):
                        with open(p, encoding="utf-8") as mdf:
                            md_chunks.append(mdf.read().strip())
                        break
        if md_chunks:
            self._methodology_md = "\n\n".join(md_chunks)

        # Templates système et utilisateur
        self.system_template = self._env.from_string(cfg.get("system_prompt", ""))
        self.template = self._env.from_string(
            cfg.get("user_prompt_template", "")
        )
        # Paramètres et contraintes
        self.parameters = cfg.get("parameters", [])
        self.constraints = cfg.get("constraints", [])
        # Schéma de réponse (optionnel)
        schema_rel = cfg.get("response_schema")
        if schema_rel:
            schema_path = os.path.join(os.path.dirname(config_dir), "schemas", schema_rel)
            with open(schema_path, encoding="utf-8") as sf:
                self.schema = json.load(sf)
        else:
            self.schema = None

    def build(self, **kwargs) -> tuple[str, str]:  # (system_prompt, user_prompt)
        # Appliquer valeurs par défaut et conserver tous les paramètres reçus
        params = kwargs.copy()  # Commencer avec tous les paramètres reçus

        # Ajouter les valeurs par défaut pour les paramètres déclarés s'ils ne sont pas déjà présents
        for p in self.parameters:
            name = p.get("name")
            if name not in params and "default" in p:
                params[name] = p.get("default")

        # Rendre les templates avec tous les paramètres disponibles + la méthodologie MD
        common_ctx = {"constraints": self.constraints, "methodology_md": self._methodology_md}
        system_prompt = self.system_template.render(**params, **common_ctx)
        user_prompt = self.template.render(**params, **common_ctx)
        return system_prompt, user_prompt

    def validate(self, response_json: dict) -> bool:
        if self.schema:
            jsonschema.validate(response_json, self.schema)
        return True

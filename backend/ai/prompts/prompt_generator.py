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
        config_dir = os.path.join(os.path.dirname(__file__), "config", "prompts")
        cfg_path = os.path.join(config_dir, f"{prompt_name}.yaml")
        with open(cfg_path, encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        self.config = cfg
        self.system_prompt = cfg.get("system_prompt", "")
        self.template = Environment(loader=FileSystemLoader(config_dir)).from_string(
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
        # Appliquer valeurs par défaut
        params = {}
        for p in self.parameters:
            name = p.get("name")
            params[name] = kwargs.get(name, p.get("default"))
        # Rendre le template
        user_prompt = self.template.render(**params, constraints=self.constraints)
        return self.system_prompt, user_prompt

    def validate(self, response_json: dict) -> bool:
        if self.schema:
            jsonschema.validate(response_json, self.schema)
        return True

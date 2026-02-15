import json
import logging
from pathlib import Path
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ActionPlaybook:
    """
    Deterministic Action Playbook Engine.
    Maps (Risk Type, Severity, User Role) -> Pre-approved Action Set.
    """
    
    def __init__(self, data_path: Optional[str] = None):
        if data_path is None:
            # Default to data/playbook.json relative to this file
            data_path = Path(__file__).parent / "data" / "playbook.json"
            
        self.data_path = Path(data_path)
        self.rules = []
        self._load_playbook()
        
    def _load_playbook(self):
        """Load rules from JSON file."""
        if not self.data_path.exists():
            logger.warning(f"Playbook data not found at {self.data_path}")
            return
            
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.rules = data.get("rules", [])
            logger.info(f"Loaded {len(self.rules)} playbook rules from {self.data_path}")
        except Exception as e:
            logger.error(f"Failed to load playbook: {e}")
            self.rules = []

    def get_actions(self, risk_type: str, severity: str, user_role: str) -> List[str]:
        """
        Retrieve structured actions for a given context.
        
        Args:
            risk_type (str): e.g., 'flood', 'cyclone', 'aqi'
            severity (str): e.g., 'low', 'medium', 'high'
            user_role (str): e.g., 'citizen', 'farmer', 'student'
            
        Returns:
            List[str]: List of actionable steps. Returns empty list if no match found.
        """
        # Normalize inputs
        risk_type = risk_type.lower().strip()
        severity = severity.lower().strip()
        user_role = user_role.lower().strip()
        
        # Exact match lookup
        # In a real DB, this would be a query. For JSON, valid iteration is fine for <100 rules.
        for rule in self.rules:
            if (rule.get("risk_type") == risk_type and
                rule.get("severity") == severity and
                rule.get("user_role") == user_role):
                return rule.get("actions", [])
                
        # Fallback: Try 'citizen' role if specific role not found (optional safety net)
        if user_role != 'citizen':
            return self.get_actions(risk_type, severity, 'citizen')
            
        return []

# Singleton instance for easy import
playbook_engine = ActionPlaybook()

if __name__ == "__main__":
    # Quick test
    actions = playbook_engine.get_actions("flood", "high", "farmer")
    print(f"Farmer Actions for High Flood: {actions}")

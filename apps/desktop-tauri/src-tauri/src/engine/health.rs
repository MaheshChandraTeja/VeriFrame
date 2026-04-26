use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineHealthReport {
    pub process_alive: bool,
    pub port_reachable: bool,
    pub version_matches: bool,
    pub model_registry_readable: bool,
    pub message: String,
}

impl EngineHealthReport {
    pub fn offline() -> Self {
        Self {
            process_alive: false,
            port_reachable: false,
            version_matches: false,
            model_registry_readable: false,
            message: "Python engine is not running.".into(),
        }
    }
}

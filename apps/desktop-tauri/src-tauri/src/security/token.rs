use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct SessionToken(String);

impl SessionToken {
    pub fn generate() -> Self {
        Self(format!("vf_{}", Uuid::new_v4().simple()))
    }

    pub fn expose_for_local_sidecar(&self) -> &str {
        &self.0
    }

    pub fn validate(&self, candidate: &str) -> bool {
        constant_time_eq(self.0.as_bytes(), candidate.as_bytes())
    }
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }

    let mut diff = 0u8;

    for (a, b) in left.iter().zip(right.iter()) {
        diff |= a ^ b;
    }

    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_token_validates_itself() {
        let token = SessionToken::generate();
        assert!(token.validate(token.expose_for_local_sidecar()));
        assert!(!token.validate("wrong-token"));
    }
}

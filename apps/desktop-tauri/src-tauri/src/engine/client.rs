use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::errors::AppError;

#[derive(Debug, Clone)]
pub struct EngineClient {
    client: reqwest::Client,
    base_url: String,
    token: String,
}

impl EngineClient {
    pub fn new(port: u16, token: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: format!("http://127.0.0.1:{port}"),
            token: token.into(),
        }
    }

    pub async fn get_json<T>(&self, path: &str) -> Result<T, AppError>
    where
        T: DeserializeOwned,
    {
        let response = self
            .client
            .get(self.url(path))
            .header("x-veriframe-token", &self.token)
            .send()
            .await
            .map_err(|error| AppError::EngineUnavailable(error.to_string()))?;

        Self::parse_response(response).await
    }

    pub async fn post_json<T>(&self, path: &str, body: &Value) -> Result<T, AppError>
    where
        T: DeserializeOwned,
    {
        let response = self
            .client
            .post(self.url(path))
            .header("x-veriframe-token", &self.token)
            .json(body)
            .send()
            .await
            .map_err(|error| AppError::EngineUnavailable(error.to_string()))?;

        Self::parse_response(response).await
    }

    pub async fn put_json<T>(&self, path: &str, body: &Value) -> Result<T, AppError>
    where
        T: DeserializeOwned,
    {
        let response = self
            .client
            .put(self.url(path))
            .header("x-veriframe-token", &self.token)
            .json(body)
            .send()
            .await
            .map_err(|error| AppError::EngineUnavailable(error.to_string()))?;

        Self::parse_response(response).await
    }

    pub async fn delete_json<T>(&self, path: &str) -> Result<T, AppError>
    where
        T: DeserializeOwned,
    {
        let response = self
            .client
            .delete(self.url(path))
            .header("x-veriframe-token", &self.token)
            .send()
            .await
            .map_err(|error| AppError::EngineUnavailable(error.to_string()))?;

        Self::parse_response(response).await
    }

    fn url(&self, path: &str) -> String {
        format!(
            "{}/{}",
            self.base_url.trim_end_matches('/'),
            path.trim_start_matches('/')
        )
    }

    async fn parse_response<T>(response: reqwest::Response) -> Result<T, AppError>
    where
        T: DeserializeOwned,
    {
        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();

            return Err(AppError::EngineUnavailable(format!(
                "Engine request failed with status {status}: {body}"
            )));
        }

        response
            .json::<T>()
            .await
            .map_err(|error| AppError::EngineUnavailable(error.to_string()))
    }
}

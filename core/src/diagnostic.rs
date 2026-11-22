use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub code: &'static str,
    pub message: String,
    pub path: String,
    pub glyph: Option<String>,
    pub command_index: Option<usize>,
}

impl Diagnostic {
    pub(crate) fn at(
        code: &'static str,
        path: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            path: path.into(),
            glyph: None,
            command_index: None,
        }
    }
    pub(crate) fn glyph(mut self, key: &str) -> Self {
        if self.glyph.is_none() {
            self.glyph = Some(key.into());
            self.path = format!(
                "/glyphs/{}{}",
                key.replace('~', "~0").replace('/', "~1"),
                self.path
            );
        }
        self
    }
}
impl fmt::Display for Diagnostic {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if !self.path.is_empty() {
            write!(f, "{}: ", self.path)?;
        }
        write!(f, "{}", self.message)
    }
}
impl std::error::Error for Diagnostic {}
impl From<String> for Diagnostic {
    fn from(value: String) -> Self {
        Self::at("invalid_request", "", value)
    }
}
impl From<&str> for Diagnostic {
    fn from(value: &str) -> Self {
        value.to_owned().into()
    }
}

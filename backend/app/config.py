from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "OpsFlow API"
    database_url: str = "postgresql+psycopg://opsflow:opsflow@localhost:5432/opsflow"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

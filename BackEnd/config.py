from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    MODEL_NAME: str = "gpt-3.5-turbo"
    TRIEVE_API_KEY: str
    TRIEVE_DATASET_ID: str
    TRIEVE_BASE_URL: str = "https://api.trieve.ai/api"
    TRIEVE_PAGE_SIZE: int = 10
    IS_DEVELOPMENT: bool = False  # Sarà True in development
    TEMPORARY_OWNER_ID: str = "dottorino_temp_user"  # Questo andrà nel .env
    FIRST_BOT_MESSAGE: str = "Ciao! Sono il tuo assistente medico. Come posso aiutarti oggi?"
    
    class Config:
        env_file = ".env"

settings = Settings() 
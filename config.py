from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
IMG_DIR = BASE_DIR / "Img"

APP_TITLE = "FarmaConsulta"
APP_ICON = "💊"

LOGO_SMALL = IMG_DIR / "logo_pequeno.svg"
LOGO_FULL = IMG_DIR / "logo_completo.svg"

USERS_FILE = BASE_DIR / "usuarios.xlsx"
CONSULTAS_FILE = BASE_DIR / "consultas.xlsx"

USER_COLUMNS = ["nome", "email", "senha", "tipo", "telefone"]
CONSULTA_COLUMNS = [
    "id",
    "paciente_nome",
    "paciente_email",
    "data",
    "hora",
    "status",
    "observacoes",
]

PRIMARY_COLOR = "#0f766e"
SECONDARY_COLOR = "#f0fdfa"
ACCENT_COLOR = "#f59e0b"

import re

import streamlit.components.v1 as components


def gerar_sala(nome: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", nome.strip().lower()).strip("-")
    if not slug:
        slug = "consulta-online"
    return f"https://demo.daily.co/{slug}"


def video_call(room_url: str, height: int = 600) -> None:
    components.iframe(room_url, height=height)

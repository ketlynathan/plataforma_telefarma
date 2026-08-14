import streamlit as st

from Versao_streamlit.components.video_call import gerar_sala, video_call


def render_consulta_online_page(user: dict | None = None) -> None:
    st.title("Consulta online")
    st.write("Abra a sala de video para conduzir um atendimento remoto com conforto.")

    nome_base = "consulta-online"
    if user:
        nome_base = f"{user.get('nome', 'consulta')}-sala"

    room_name = st.text_input("Nome da sala", value=nome_base)
    room_url = gerar_sala(room_name)

    st.caption(f"Sala gerada: {room_url}")

    if st.button("Entrar na consulta"):
        video_call(room_url)

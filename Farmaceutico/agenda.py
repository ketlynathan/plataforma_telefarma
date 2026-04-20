import streamlit as st

from database.db import get_upcoming_consultas


def render_agenda_page() -> None:
    st.title("Agenda geral")

    consultas = get_upcoming_consultas()
    if consultas.empty:
        st.info("Nenhuma consulta cadastrada ate o momento.")
        return

    st.dataframe(consultas, use_container_width=True, hide_index=True)

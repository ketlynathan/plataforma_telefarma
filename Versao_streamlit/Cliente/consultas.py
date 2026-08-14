import streamlit as st

from Versao_streamlit.database.db import get_consultas_by_email


def render_consultas_page(user: dict) -> None:
    st.title("Minhas consultas")

    consultas = get_consultas_by_email(user["email"])
    if consultas.empty:
        st.info("Nenhuma consulta encontrada para este usuario.")
        return

    st.dataframe(
        consultas.sort_values(by=["data", "hora"]),
        use_container_width=True,
        hide_index=True,
    )

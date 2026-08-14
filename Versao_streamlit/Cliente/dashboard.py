import streamlit as st

from Versao_streamlit.database.db import get_consultas_by_email


def render_cliente_dashboard(user: dict) -> None:
    st.title("Bem-vindo")
    st.subheader(user["nome"])

    consultas = get_consultas_by_email(user["email"])
    consultas_agendadas = consultas[consultas["status"] == "Agendada"]
    consultas_realizadas = consultas[consultas["status"] != "Agendada"]

    col1, col2, col3 = st.columns(3)
    col1.metric("Proximas Consultas", len(consultas_agendadas), "Agendadas para voce")
    col2.metric("Historico", len(consultas_realizadas), "Consultas realizadas")
    col3.metric("Agendar", "Nova Consulta", "Agende uma nova teleconsulta")

    st.subheader("Proximas Consultas")
    if consultas_agendadas.empty:
        st.info("Voce nao tem consultas agendadas")
        if st.button("Agendar Agora", use_container_width=True):
            st.session_state.cliente_page = "Agendar consulta"
            st.session_state.cliente_page_radio = "Agendar consulta"
            st.rerun()
        return

    st.dataframe(
        consultas_agendadas.sort_values(by=["data", "hora"]),
        use_container_width=True,
        hide_index=True,
    )

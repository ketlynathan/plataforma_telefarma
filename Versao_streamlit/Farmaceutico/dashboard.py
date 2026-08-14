from datetime import date

import streamlit as st

from Versao_streamlit.database.db import list_unique_patients, load_consultas


def render_farmaceutico_dashboard() -> None:
    st.title("Dashboard do farmaceutico")
    st.caption("Acompanhe a agenda, a demanda do dia e a base de pacientes.")

    consultas = load_consultas()
    hoje = consultas[consultas["data"] == str(date.today())]
    pacientes = list_unique_patients()

    col1, col2, col3 = st.columns(3)
    col1.metric("Consultas totais", len(consultas))
    col2.metric("Consultas hoje", len(hoje))
    col3.metric("Pacientes unicos", len(pacientes))

    st.subheader("Agenda do dia")
    if hoje.empty:
        st.info("Nao ha consultas marcadas para hoje.")
        return

    st.dataframe(hoje.sort_values(by="hora"), use_container_width=True, hide_index=True)

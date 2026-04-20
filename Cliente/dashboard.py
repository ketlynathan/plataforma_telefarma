from datetime import date

import streamlit as st

from database.db import get_consultas_by_email


def render_cliente_dashboard(user: dict) -> None:
    st.title("Dashboard do cliente")
    st.caption(f"Bem-vindo, {user['nome']}. Aqui esta um resumo rapido da sua jornada.")

    consultas = get_consultas_by_email(user["email"])
    consultas_hoje = consultas[consultas["data"] == str(date.today())]
    consultas_agendadas = consultas[consultas["status"] == "Agendada"]

    col1, col2, col3 = st.columns(3)
    col1.metric("Consultas totais", len(consultas))
    col2.metric("Consultas agendadas", len(consultas_agendadas))
    col3.metric("Consultas hoje", len(consultas_hoje))

    st.subheader("Proximas consultas")
    if consultas.empty:
        st.info("Voce ainda nao possui consultas agendadas.")
        return

    st.dataframe(
        consultas.sort_values(by=["data", "hora"]),
        use_container_width=True,
        hide_index=True,
    )

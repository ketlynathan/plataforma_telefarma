from datetime import date

import streamlit as st

from database.db import DatabaseWriteError, create_consulta


def render_agendamento_page(user: dict) -> None:
    st.title("Agendar consulta")
    st.write("Escolha a melhor data e horario para seu atendimento.")

    data_consulta = st.date_input("Data", min_value=date.today(), use_container_width=True)
    hora_consulta = st.selectbox(
        "Horario",
        ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    )

    observacoes = st.text_area(
        "Observacoes",
        placeholder="Ex.: alergias, uso continuo de medicamentos...",
        height=140,
    )

    st.caption(f"Paciente: {user['nome']}")

    if st.button("Confirmar agendamento"):
        try:
            create_consulta(
                {
                    "paciente_nome": user["nome"],
                    "paciente_email": user["email"],
                    "data": data_consulta,
                    "hora": hora_consulta,
                    "status": "Agendada",
                    "observacoes": observacoes.strip(),
                }
            )
        except DatabaseWriteError as exc:
            st.error(str(exc))
        else:
            st.success("Consulta agendada com sucesso.")

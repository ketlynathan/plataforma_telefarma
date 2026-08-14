import streamlit as st

from Versao_streamlit.database.db import list_unique_patients, load_consultas


def render_pacientes_page() -> None:
    st.title("Pacientes")

    pacientes = list_unique_patients()
    if pacientes.empty:
        st.info("Nenhum paciente com consulta registrada.")
        return

    consultas = load_consultas()
    selected_email = st.selectbox("Selecione um paciente", pacientes["paciente_email"].tolist())
    paciente_consultas = consultas[consultas["paciente_email"] == selected_email]
    paciente_nome = paciente_consultas.iloc[0]["paciente_nome"] if not paciente_consultas.empty else "-"

    st.subheader(paciente_nome)
    st.dataframe(
        paciente_consultas.sort_values(by=["data", "hora"]),
        use_container_width=True,
        hide_index=True,
    )

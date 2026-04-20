import sys
from pathlib import Path

import streamlit as st


BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from auth.login import render_login_page
from Cliente.agendamento import render_agendamento_page
from Cliente.consultas import render_consultas_page
from Cliente.dashboard import render_cliente_dashboard
from Cliente.perfil import render_perfil_page
from components.sidebar import render_user_panel
from components.theme import apply_global_styles
from config import APP_ICON, APP_TITLE
from database.db import init_db
from Farmaceutico.agenda import render_agenda_page
from Farmaceutico.consulta_online import render_consulta_online_page
from Farmaceutico.dashboard import render_farmaceutico_dashboard
from Farmaceutico.pacientes import render_pacientes_page


st.set_page_config(
    page_title=APP_TITLE,
    page_icon=APP_ICON,
    layout="wide",
    initial_sidebar_state="collapsed",
)

apply_global_styles()
init_db()

if "user" not in st.session_state:
    st.session_state.user = None


def _render_login() -> None:
    render_login_page()


def _render_cliente_dashboard() -> None:
    render_cliente_dashboard(st.session_state.user)


def _render_agendamento() -> None:
    render_agendamento_page(st.session_state.user)


def _render_consultas() -> None:
    render_consultas_page(st.session_state.user)


def _render_perfil() -> None:
    render_perfil_page(st.session_state.user)


def _render_farmaceutico_dashboard() -> None:
    render_farmaceutico_dashboard()


def _render_agenda() -> None:
    render_agenda_page()


def _render_pacientes() -> None:
    render_pacientes_page()


def _render_consulta_online() -> None:
    render_consulta_online_page(st.session_state.user)


def main() -> None:
    user = st.session_state.user

    if user is None:
        navigation = st.navigation(
            [
                st.Page(_render_login, title="Entrar", icon=":material/login:"),
            ]
        )
        navigation.run()
        return

    render_user_panel(user)

    if user["tipo"] == "cliente":
        navigation = st.navigation(
            {
                "Cliente": [
                    st.Page(_render_cliente_dashboard, title="Dashboard", icon=":material/dashboard:"),
                    st.Page(_render_agendamento, title="Agendar consulta", icon=":material/event_available:"),
                    st.Page(_render_consultas, title="Minhas consultas", icon=":material/medical_information:"),
                    st.Page(_render_perfil, title="Perfil", icon=":material/account_circle:"),
                ]
            }
        )
    else:
        navigation = st.navigation(
            {
                "Farmaceutico": [
                    st.Page(_render_farmaceutico_dashboard, title="Dashboard", icon=":material/dashboard:"),
                    st.Page(_render_agenda, title="Agenda", icon=":material/calendar_month:"),
                    st.Page(_render_consulta_online, title="Consulta online", icon=":material/videocam:"),
                    st.Page(_render_pacientes, title="Pacientes", icon=":material/groups:"),
                ]
            }
        )

    navigation.run()


if __name__ == "__main__":
    main()

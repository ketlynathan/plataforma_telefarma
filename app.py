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
from home import render_public_home


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
if "auth_mode" not in st.session_state:
    st.session_state.auth_mode = "Login"
if "public_view" not in st.session_state:
    st.session_state.public_view = "home"


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


def _render_top_navigation(options: list[str], key: str) -> str:
    current = st.session_state.get(key, options[0])
    if current not in options:
        current = options[0]

    page = st.radio(
        "Navegacao",
        options,
        index=options.index(current),
        horizontal=True,
        key=f"{key}_radio",
        label_visibility="collapsed",
    )
    st.session_state[key] = page
    return page


def main() -> None:
    user = st.session_state.user

    if user is None:
        if st.session_state.public_view == "home":
            render_public_home()
            st.markdown("## Entrar ou criar conta")
        else:
            if st.button("Voltar para a tela principal", key="back_to_home"):
                st.session_state.public_view = "home"
                st.rerun()
        _render_login()
        return

    render_user_panel(user)

    if user["tipo"] == "cliente":
        page = _render_top_navigation(
            ["Dashboard", "Agendar consulta", "Minhas consultas", "Perfil"],
            "cliente_page",
        )

        if page == "Dashboard":
            _render_cliente_dashboard()
        elif page == "Agendar consulta":
            _render_agendamento()
        elif page == "Minhas consultas":
            _render_consultas()
        else:
            _render_perfil()
    else:
        page = _render_top_navigation(
            ["Dashboard", "Agenda", "Consulta online", "Pacientes"],
            "farmaceutico_page",
        )

        if page == "Dashboard":
            _render_farmaceutico_dashboard()
        elif page == "Agenda":
            _render_agenda()
        elif page == "Consulta online":
            _render_consulta_online()
        else:
            _render_pacientes()


if __name__ == "__main__":
    main()

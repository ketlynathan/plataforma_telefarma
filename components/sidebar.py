import streamlit as st

from config import LOGO_SMALL


def render_user_panel(user: dict) -> None:
    with st.sidebar:
        if LOGO_SMALL.exists():
            st.image(str(LOGO_SMALL), width=92)

        st.markdown(f"### {user['nome']}")
        st.caption(user["tipo"].replace("_", " ").title())
        st.divider()

        if st.button("Sair", use_container_width=True):
            st.session_state.user = None
            st.rerun()

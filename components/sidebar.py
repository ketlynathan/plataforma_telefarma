import streamlit as st

from config import LOGO_SMALL


def render_user_panel(user: dict) -> None:
    col_logo, col_info, col_action = st.columns([0.9, 2.2, 1.1])

    with col_logo:
        if LOGO_SMALL.exists():
            st.image(str(LOGO_SMALL), width=72)

    with col_info:
        st.markdown(f"### {user['nome']}")
        st.caption(user["tipo"].replace("_", " ").title())

    with col_action:
        st.markdown("<div class='fc-top-action'>", unsafe_allow_html=True)
        if st.button("Sair", use_container_width=True):
            st.session_state.user = None
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    st.divider()

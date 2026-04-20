import streamlit as st

from config import APP_TITLE, LOGO_FULL
from database.db import DatabaseWriteError, authenticate_user, save_user, user_exists


def _inject_styles() -> None:
    st.markdown(
        f"""
        <style>
        [data-testid="stAppViewContainer"] {{
            background:
                radial-gradient(circle at top left, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent 32%),
                radial-gradient(circle at bottom right, color-mix(in srgb, var(--primary-color) 10%, transparent), transparent 28%),
                linear-gradient(
                    180deg,
                    color-mix(in srgb, var(--background-color) 92%, black 8%) 0%,
                    color-mix(in srgb, var(--secondary-background-color) 86%, var(--background-color) 14%) 100%
                );
        }}
        [data-testid="stMainBlockContainer"] {{
            max-width: 1180px;
            padding-top: 1.2rem;
            padding-left: 1rem;
            padding-right: 1rem;
        }}
        .fc-shell {{
            min-height: 82vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 0.5rem 0 2rem 0;
        }}
        .fc-logo-wrap {{
            width: 100%;
            max-width: 520px;
            margin: 0 auto 1.25rem auto;
        }}
        .fc-card {{
            width: 100%;
            max-width: 480px;
            background: color-mix(in srgb, var(--background-color) 84%, var(--secondary-background-color) 16%);
            border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
            border-radius: 24px;
            padding: 2rem;
            box-shadow: 0 24px 70px color-mix(in srgb, var(--text-color) 14%, transparent);
        }}
        .fc-badge {{
            display: inline-block;
            padding: 0.35rem 0.75rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--primary-color) 16%, transparent);
            color: var(--text-color);
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
        }}
        .fc-title {{
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-color);
            margin-bottom: 0.4rem;
        }}
        .fc-subtitle {{
            color: color-mix(in srgb, var(--text-color) 72%, transparent);
            margin-bottom: 1.4rem;
            line-height: 1.55;
        }}
        .stTabs [data-baseweb="tab-list"] {{
            gap: 0.5rem;
            flex-wrap: wrap;
        }}
        .stTabs [data-baseweb="tab"] {{
            height: 42px;
            min-width: 120px;
            background: color-mix(in srgb, var(--secondary-background-color) 88%, transparent);
            border-radius: 999px;
            padding: 0 1rem;
        }}
        .stTextInput input,
        .stSelectbox [data-baseweb="select"] > div,
        .stTextArea textarea {{
            border-radius: 12px;
        }}
        .stButton > button {{
            width: 100%;
            border-radius: 12px;
            border: 0;
            background: color-mix(in srgb, var(--primary-color) 92%, black 8%);
            color: var(--background-color);
            font-weight: 700;
            min-height: 2.8rem;
        }}
        @media (max-width: 768px) {{
            [data-testid="stMainBlockContainer"] {{
                padding-top: 0.5rem;
                padding-left: 0.75rem;
                padding-right: 0.75rem;
            }}
            .fc-shell {{
                min-height: auto;
                padding: 0.25rem 0 1.25rem 0;
            }}
            .fc-logo-wrap {{
                max-width: 300px;
                margin-bottom: 0.9rem;
            }}
            .fc-card {{
                max-width: 100%;
                padding: 1.2rem;
                border-radius: 18px;
                box-shadow: 0 12px 32px color-mix(in srgb, var(--text-color) 10%, transparent);
            }}
            .fc-title {{
                font-size: 1.5rem;
            }}
            .fc-subtitle {{
                font-size: 0.95rem;
                margin-bottom: 1rem;
            }}
            .stTabs [data-baseweb="tab-list"] {{
                display: grid;
                grid-template-columns: 1fr 1fr;
            }}
            .stTabs [data-baseweb="tab"] {{
                min-width: 0;
                width: 100%;
                padding: 0 0.75rem;
            }}
        }}
        @media (max-width: 480px) {{
            .fc-logo-wrap {{
                max-width: 240px;
            }}
            .fc-card {{
                padding: 1rem;
                border-radius: 16px;
            }}
            .fc-badge {{
                font-size: 0.78rem;
            }}
            .fc-title {{
                font-size: 1.35rem;
            }}
            .fc-subtitle {{
                font-size: 0.9rem;
            }}
            .stTabs [data-baseweb="tab"] {{
                height: 40px;
                font-size: 0.95rem;
            }}
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_login_page() -> None:
    _inject_styles()
    st.markdown('<div class="fc-shell">', unsafe_allow_html=True)

    if LOGO_FULL.exists():
        st.markdown('<div class="fc-logo-wrap">', unsafe_allow_html=True)
        st.image(str(LOGO_FULL), use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="fc-card">', unsafe_allow_html=True)

    st.markdown('<div class="fc-badge">Plataforma de teleatendimento</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="fc-title">{APP_TITLE}</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="fc-subtitle">Entre para gerenciar consultas, acompanhar pacientes e manter seu perfil atualizado.</div>',
        unsafe_allow_html=True,
    )

    tab_login, tab_register = st.tabs(["Login", "Cadastro"])

    with tab_login:
        email = st.text_input("Email", key="login_email")
        senha = st.text_input("Senha", type="password", key="login_password")

        if st.button("Entrar", key="login_submit"):
            user = authenticate_user(email, senha)
            if user is None:
                st.error("Email ou senha invalidos.")
            else:
                st.session_state.user = user
                st.rerun()

    with tab_register:
        nome = st.text_input("Nome completo", key="register_name")
        email = st.text_input("Email", key="register_email")
        senha = st.text_input("Senha", type="password", key="register_password")
        telefone = st.text_input("Telefone", key="register_phone")
        tipo = st.selectbox("Perfil", ["cliente", "farmaceutico"], key="register_type")

        if st.button("Criar conta", key="register_submit"):
            if not nome or not email or not senha:
                st.warning("Preencha nome, email e senha.")
            elif user_exists(email):
                st.warning("Ja existe uma conta cadastrada com esse email.")
            else:
                try:
                    save_user(
                        {
                            "nome": nome.strip(),
                            "email": email.strip(),
                            "senha": senha,
                            "tipo": tipo,
                            "telefone": telefone.strip(),
                        }
                    )
                except DatabaseWriteError as exc:
                    st.error(str(exc))
                else:
                    st.success("Conta criada com sucesso. Agora voce ja pode entrar.")

    st.markdown("</div></div>", unsafe_allow_html=True)

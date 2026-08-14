import streamlit as st

from Versao_streamlit.config import LOGO_FULL


def _inject_home_styles() -> None:
    st.markdown(
        """
        <style>
        .fc-home {
            position: relative;
            padding: 0.5rem 0 2.5rem 0;
        }
        .fc-home-shell {
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
        }
        .fc-home-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.15rem 0;
        }
        .fc-home-brandline {
            font-size: 1.08rem;
            font-weight: 700;
            color: var(--text-color);
        }
        .fc-home-logo {
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
        }
        .fc-home-hero {
            display: grid;
            grid-template-columns: minmax(0, 1.3fr) minmax(290px, 0.9fr);
            gap: 1rem;
            align-items: stretch;
            padding: 1.5rem;
            border-radius: 28px;
            background:
                radial-gradient(circle at top right, color-mix(in srgb, var(--primary-color) 18%, transparent), transparent 34%),
                linear-gradient(
                    135deg,
                    color-mix(in srgb, var(--background-color) 92%, var(--secondary-background-color) 8%) 0%,
                    color-mix(in srgb, var(--secondary-background-color) 86%, var(--background-color) 14%) 100%
                );
            border: 1px solid color-mix(in srgb, var(--primary-color) 16%, transparent);
            box-shadow: 0 18px 48px color-mix(in srgb, var(--text-color) 8%, transparent);
        }
        .fc-home-hero-copy {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
        }
        .fc-home-kicker {
            display: inline-flex;
            align-items: center;
            align-self: flex-start;
            padding: 0.42rem 0.85rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--primary-color) 14%, transparent);
            color: var(--text-color);
            font-size: 0.84rem;
            font-weight: 700;
            margin-bottom: 0.9rem;
        }
        .fc-home-title {
            margin: 0 0 0.8rem 0;
            font-size: 3rem;
            line-height: 1.02;
            letter-spacing: -0.03em;
            color: var(--text-color);
            word-break: break-word;
        }
        .fc-home-subtitle {
            margin: 0 0 1.15rem 0;
            max-width: 720px;
            color: color-mix(in srgb, var(--text-color) 72%, transparent);
            font-size: 1.04rem;
            line-height: 1.7;
        }
        .fc-home-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.8rem;
            max-width: 420px;
        }
        .fc-home-card,
        .fc-home-panel,
        .fc-home-mode,
        .fc-home-cta,
        .fc-home-commitments {
            min-width: 0;
            padding: 1.25rem;
            border-radius: 24px;
            background: color-mix(in srgb, var(--background-color) 90%, var(--secondary-background-color) 10%);
            border: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
            box-shadow: 0 16px 40px color-mix(in srgb, var(--text-color) 6%, transparent);
            overflow-wrap: anywhere;
        }
        .fc-home-footer {
            margin-top: 0.2rem;
            padding: 1.6rem 0 0 0;
            border-top: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
        }
        .fc-home-side-list {
            display: flex;
            flex-direction: column;
            gap: 0.9rem;
        }
        .fc-home-side-item {
            display: grid;
            grid-template-columns: 48px 1fr;
            gap: 0.85rem;
            align-items: center;
        }
        .fc-home-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: color-mix(in srgb, var(--primary-color) 16%, transparent);
            color: var(--text-color);
            font-weight: 800;
            font-size: 1rem;
            border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
            flex-shrink: 0;
        }
        .fc-home-side-item strong,
        .fc-home-panel h4,
        .fc-home-mode h4,
        .fc-home-footer h4 {
            color: var(--text-color);
        }
        .fc-home-side-item p,
        .fc-home-panel p,
        .fc-home-mode p,
        .fc-home-footer p,
        .fc-home-footer li,
        .fc-home-cta p,
        .fc-home-commitments li {
            margin: 0;
            color: color-mix(in srgb, var(--text-color) 74%, transparent);
            line-height: 1.6;
        }
        .fc-home-section {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .fc-home-section-head h2 {
            margin: 0 0 0.3rem 0;
            color: var(--text-color);
            font-size: 1.7rem;
        }
        .fc-home-section-head p {
            margin: 0;
            color: color-mix(in srgb, var(--text-color) 72%, transparent);
        }
        .fc-home-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1rem;
        }
        .fc-home-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
        }
        .fc-home-compliance {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
        }
        .fc-home-commitments ul,
        .fc-home-footer ul {
            margin: 0;
            padding-left: 1.1rem;
        }
        .fc-home-footer-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }
        .fc-home-footer-copy {
            margin-top: 1rem;
            padding-top: 0.9rem;
            border-top: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
            color: color-mix(in srgb, var(--text-color) 64%, transparent);
            font-size: 0.92rem;
        }
        .fc-home .stButton > button[kind="primary"] {
            background: linear-gradient(
                180deg,
                color-mix(in srgb, var(--primary-color) 86%, white 14%) 0%,
                color-mix(in srgb, var(--primary-color) 92%, black 8%) 100%
            );
            color: white;
            border: 0;
            box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 20%, transparent);
        }
        .fc-home .stButton > button[kind="secondary"] {
            background: color-mix(in srgb, var(--background-color) 96%, transparent);
            color: var(--text-color);
            border: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
            box-shadow: none;
        }
        @media (max-width: 980px) {
            .fc-home-hero,
            .fc-home-grid-3,
            .fc-home-grid-2,
            .fc-home-compliance,
            .fc-home-footer-grid {
                grid-template-columns: 1fr;
            }
            .fc-home-title {
                font-size: 2.25rem;
            }
        }
        @media (max-width: 640px) {
            .fc-home-topbar {
                flex-direction: column;
                align-items: stretch;
            }
            .fc-home-logo {
                max-width: 240px;
            }
            .fc-home-hero {
                padding: 1rem;
                border-radius: 20px;
            }
            .fc-home-title {
                font-size: 1.8rem;
            }
            .fc-home-subtitle {
                font-size: 0.96rem;
            }
            .fc-home-actions {
                grid-template-columns: 1fr;
                max-width: 100%;
            }
            .fc-home-card,
            .fc-home-panel,
            .fc-home-mode,
            .fc-home-cta,
            .fc-home-commitments {
                padding: 1rem;
                border-radius: 18px;
            }
            .fc-home-section-head h2 {
                font-size: 1.35rem;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_side_item(icon: str, title: str, description: str) -> None:
    st.markdown("<div class='fc-home-side-item'>", unsafe_allow_html=True)
    st.markdown(f"<div class='fc-home-icon'>{icon}</div>", unsafe_allow_html=True)
    st.markdown(f"<div><strong>{title}</strong><p>{description}</p></div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)


def render_public_home() -> None:
    _inject_home_styles()
    st.markdown("<div class='fc-home'><div class='fc-home-shell'>", unsafe_allow_html=True)

    top_left, top_right = st.columns([1.8, 1], vertical_alignment="center")
    with top_left:
        st.markdown("<div class='fc-home-brandline'>Farma Consulta</div>", unsafe_allow_html=True)
    with top_right:
        btn1, btn2 = st.columns(2)
        with btn1:
            if st.button("Entrar", key="home_enter", use_container_width=True, type="secondary"):
                st.session_state.auth_mode = "Login"
                st.session_state.public_view = "auth"
                st.rerun()
        with btn2:
            if st.button("Comecar Agora", key="home_start", use_container_width=True, type="primary"):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
                st.session_state.public_view = "auth"
                st.rerun()

    st.markdown("<div class='fc-home-hero'>", unsafe_allow_html=True)
    hero_left, hero_right = st.columns([1.3, 0.9], vertical_alignment="center")
    with hero_left:
        st.markdown("<div class='fc-home-hero-copy'>", unsafe_allow_html=True)
        if LOGO_FULL.exists():
            st.markdown("<div class='fc-home-logo'>", unsafe_allow_html=True)
            st.image(str(LOGO_FULL), use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("<div class='fc-home-kicker'>Farma Consulta</div>", unsafe_allow_html=True)
        st.markdown("<h1 class='fc-home-title'>Teleconsulta Farmaceutica ao Seu Alcance</h1>", unsafe_allow_html=True)
        st.markdown(
            "<p class='fc-home-subtitle'>Conecte-se com farmaceuticos qualificados para orientacoes personalizadas sobre medicamentos e saude, de forma segura e conveniente.</p>",
            unsafe_allow_html=True,
        )
        st.markdown("<div class='fc-home-actions'>", unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        with c1:
            if st.button("Agendar Teleconsulta", key="home_book", use_container_width=True, type="primary"):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
                st.session_state.public_view = "auth"
                st.rerun()
        with c2:
            if st.button("Saiba Mais", key="home_more", use_container_width=True, type="secondary"):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para continuar seu atendimento."
                st.rerun()
        st.markdown("</div></div>", unsafe_allow_html=True)

    with hero_right:
        st.markdown("<div class='fc-home-card'><div class='fc-home-side-list'>", unsafe_allow_html=True)
        _render_side_item("A", "Agendamento Rapido", "Em minutos")
        _render_side_item("S", "100% Seguro", "Conformidade LGPD")
        _render_side_item("F", "Farmaceuticos Qualificados", "Registrados no CRF")
        st.markdown("</div></div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='fc-home-section'>", unsafe_allow_html=True)
    st.markdown(
        "<div class='fc-home-section-head'><h2>Beneficios da Teleconsulta Farmaceutica</h2><p>Acesso a cuidados farmaceuticos profissionais sem sair de casa</p></div>",
        unsafe_allow_html=True,
    )
    beneficios = [
        ("C", "Conveniencia", "Consulte de qualquer lugar, sem necessidade de deslocamento"),
        ("A", "Acompanhamento de Doencas Cronicas", "Monitoramento frequente e ajustado as suas necessidades"),
        ("O", "Orientacao Especializada", "Esclarecimento de duvidas sobre medicamentos e prescricoes"),
        ("P", "Privacidade Garantida", "Dados protegidos conforme a Lei Geral de Protecao de Dados"),
        ("R", "Acesso Ampliado", "Cuidados farmaceuticos em areas rurais e comunidades carentes"),
        ("$", "Reducao de Custos", "Elimina custos de deslocamento e oferece precos acessiveis"),
    ]
    st.markdown("<div class='fc-home-grid-3'>", unsafe_allow_html=True)
    for icon, titulo, texto in beneficios:
        st.markdown("<div class='fc-home-panel'>", unsafe_allow_html=True)
        st.markdown(f"<div class='fc-home-icon'>{icon}</div>", unsafe_allow_html=True)
        st.markdown(f"<h4>{titulo}</h4><p>{texto}</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown("<div class='fc-home-section'>", unsafe_allow_html=True)
    st.markdown(
        "<div class='fc-home-section-head'><h2>Modalidades de Telefarmacia</h2><p>Diferentes formas de atendimento farmaceutico adaptadas as suas necessidades</p></div>",
        unsafe_allow_html=True,
    )
    modalidades = [
        ("T", "Teleconsulta", "Consulta realizada de forma nao presencial, obrigatoriamente sincronica, onde o farmaceutico aborda um unico caso clinico por vez. Ideal para orientacoes sobre medicamentos e duvidas sobre prescricoes."),
        ("I", "Teleinterconsulta", "Envolve a colaboracao entre farmaceuticos ou com outros profissionais de saude para otimizar o tratamento do paciente. Proporciona uma abordagem multidisciplinar para casos complexos."),
        ("M", "Telemonitoramento", "Monitoramento remoto de parametros de saude, utilizando dispositivos e tecnologias para acompanhar o estado do paciente. Essencial para pacientes com doencas cronicas."),
        ("C", "Teleconsultoria", "Interacao entre farmaceuticos e outros profissionais para emitir pareceres tecnicos e administrativos. Suporta a tomada de decisoes clinicas e administrativas."),
    ]
    st.markdown("<div class='fc-home-grid-2'>", unsafe_allow_html=True)
    for icon, titulo, texto in modalidades:
        st.markdown("<div class='fc-home-mode'>", unsafe_allow_html=True)
        st.markdown(f"<div class='fc-home-icon'>{icon}</div>", unsafe_allow_html=True)
        st.markdown(f"<h4>{titulo}</h4><p>{texto}</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown("<div class='fc-home-section'>", unsafe_allow_html=True)
    st.markdown(
        "<div class='fc-home-section-head'><h2>Conformidade e Seguranca</h2><p>Operamos em total conformidade com as regulamentacoes brasileiras</p></div>",
        unsafe_allow_html=True,
    )
    st.markdown("<div class='fc-home-compliance'>", unsafe_allow_html=True)
    st.markdown("<div class='fc-home-panel'><h4>Resolucao CFF no 727/2022</h4><p>Nossa plataforma segue rigorosamente a Resolucao no 727/2022 do Conselho Federal de Farmacia, que regula as atividades de telefarmacia no Brasil. Garantimos que todas as teleconsultas sejam sincronas, com um unico caso clinico por vez, e que todos os farmaceuticos sejam devidamente registrados no CRF de seus respectivos estados.</p></div>", unsafe_allow_html=True)
    st.markdown("<div class='fc-home-panel'><h4>Lei Geral de Protecao de Dados (LGPD)</h4><p>Implementamos todas as medidas de seguranca exigidas pela LGPD para proteger seus dados pessoais e de saude. Voce tem direito de acesso, correcao e exclusao de seus dados a qualquer momento, e seu consentimento e sempre solicitado antes de qualquer coleta de informacoes.</p></div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown(
        """
        <div class='fc-home-commitments'>
            <h4>Nossos Compromissos</h4>
            <ul>
                <li>Atendimento sincronico e exclusivo (um caso clinico por vez)</li>
                <li>Farmaceuticos registrados e qualificados</li>
                <li>Registro completo de todas as interacoes</li>
                <li>Conformidade com Procedimento Operacional Padrao (POP)</li>
                <li>Criptografia de dados sensiveis</li>
                <li>Consentimento explicito para coleta de dados</li>
                <li>Direito de acesso aos dados pessoais</li>
                <li>Direito de exclusao de dados</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='fc-home-cta'>", unsafe_allow_html=True)
    st.markdown("<h2>Pronto para Comecar?</h2>", unsafe_allow_html=True)
    st.markdown("<p>Agende sua teleconsulta farmaceutica agora e receba orientacoes profissionais de forma segura e conveniente.</p>", unsafe_allow_html=True)
    if st.button("Agendar Teleconsulta", key="home_book_bottom", use_container_width=False, type="primary"):
        st.session_state.auth_mode = "Login"
        st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
        st.session_state.public_view = "auth"
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown(
        """
        <div class='fc-home-footer'>
            <div class='fc-home-footer-title'>Farma Consulta</div>
            <p>Teleconsulta farmaceutica segura e profissional.</p>
            <div class='fc-home-footer-grid'>
                <div>
                    <h4>Sobre</h4>
                    <ul>
                        <li>Quem Somos</li>
                        <li>Nossos Farmaceuticos</li>
                        <li>Conformidade</li>
                    </ul>
                </div>
                <div>
                    <h4>Legal</h4>
                    <ul>
                        <li>Politica de Privacidade</li>
                        <li>Termos de Uso</li>
                        <li>LGPD</li>
                    </ul>
                </div>
                <div>
                    <h4>Contato</h4>
                    <p>Email: contato@farmaconsulta.com.br</p>
                    <p>Telefone: (11) 3000-0000</p>
                    <p>Desenvolvido por Ketlyn Athan</p>
                </div>
            </div>
            <div class='fc-home-footer-copy'>
                © 2026 Farma Consulta. Todos os direitos reservados. Conforme Resolucao CFF no 727/2022 e LGPD.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("</div></div>", unsafe_allow_html=True)

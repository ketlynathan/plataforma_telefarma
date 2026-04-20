import streamlit as st

from config import LOGO_FULL


def _inject_home_styles() -> None:
    st.markdown(
        """
        <style>
        .fc-home {
            padding: 0.4rem 0 2.5rem 0;
            position: relative;
        }
        .fc-home::before {
            content: "";
            position: absolute;
            inset: 0 0 auto 0;
            height: 420px;
            background:
                radial-gradient(circle at top left, rgba(14, 165, 233, 0.28), transparent 35%),
                radial-gradient(circle at top right, rgba(59, 130, 246, 0.24), transparent 30%),
                linear-gradient(180deg, rgba(8, 47, 73, 0.92) 0%, rgba(10, 18, 35, 0) 100%);
            pointer-events: none;
            border-radius: 0 0 32px 32px;
        }
        .fc-home-logo-top {
            width: 100%;
            max-width: 360px;
            margin: 0 auto 0.8rem auto;
            position: relative;
            z-index: 1;
        }
        .fc-home-topbar-title {
            font-size: 1.1rem;
            font-weight: 700;
            position: relative;
            z-index: 1;
        }
        .fc-home-brand {
            font-size: 0.95rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: rgba(191, 219, 254, 0.92);
            margin-bottom: 0.55rem;
            font-weight: 700;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        .fc-home-title {
            font-size: 2.7rem;
            font-weight: 800;
            line-height: 1.05;
            margin-bottom: 0.8rem;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        .fc-home-subtitle {
            max-width: 760px;
            margin: 0 auto 1.3rem auto;
            text-align: center;
            color: color-mix(in srgb, white 74%, var(--text-color) 26%);
            font-size: 1.05rem;
            line-height: 1.7;
            position: relative;
            z-index: 1;
        }
        .fc-home-hero-card,
        .fc-home-side,
        .fc-home-panel,
        .fc-home-mode,
        .fc-home-footer {
            background: color-mix(in srgb, var(--background-color) 82%, rgba(30, 64, 175, 0.18) 18%);
            border: 1px solid color-mix(in srgb, rgba(96, 165, 250, 0.4) 40%, transparent);
            border-radius: 24px;
            padding: 1.35rem;
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
            position: relative;
            z-index: 1;
        }
        .fc-home-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.42rem 0.85rem;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.22), rgba(59, 130, 246, 0.18));
            margin-bottom: 0.9rem;
            font-size: 0.88rem;
            font-weight: 600;
        }
        .fc-home-icon {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.8rem;
            background: linear-gradient(180deg, rgba(56, 189, 248, 0.24), rgba(37, 99, 235, 0.18));
            border: 1px solid rgba(96, 165, 250, 0.28);
            color: #dbeafe;
            font-size: 1.1rem;
            font-weight: 800;
        }
        .fc-home-check {
            padding: 0.75rem 0;
            border-bottom: 1px solid color-mix(in srgb, var(--text-color) 8%, transparent);
        }
        .fc-home-check:last-child {
            border-bottom: 0;
        }
        .fc-home-section {
            margin-top: 1.15rem;
        }
        .fc-home-section h2 {
            font-size: 1.7rem;
            margin-bottom: 0.35rem;
        }
        .fc-home-section-intro {
            color: color-mix(in srgb, var(--text-color) 72%, transparent);
            margin-bottom: 1rem;
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
        .fc-home-panel h4,
        .fc-home-mode h4 {
            margin: 0 0 0.45rem 0;
            font-size: 1.08rem;
        }
        .fc-home-panel p,
        .fc-home-mode p,
        .fc-home-footer p,
        .fc-home-footer li {
            margin: 0;
            line-height: 1.6;
            color: color-mix(in srgb, var(--text-color) 74%, transparent);
        }
        .fc-home-compliance {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }
        .fc-home-commitments {
            margin: 0;
            padding-left: 1.1rem;
        }
        .fc-home-cta {
            text-align: center;
            margin-top: 1.2rem;
            padding: 1.35rem;
            border-radius: 24px;
            background: linear-gradient(
                180deg,
                color-mix(in srgb, var(--primary-color) 14%, transparent) 0%,
                color-mix(in srgb, var(--background-color) 92%, var(--secondary-background-color) 8%) 100%
            );
            border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
        }
        .fc-home-footer {
            margin-top: 1rem;
        }
        .fc-home-footer-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 0.2rem;
        }
        .fc-home-footer-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }
        .fc-home-footer ul {
            margin: 0;
            padding-left: 1rem;
        }
        @media (max-width: 900px) {
            .fc-home-title {
                font-size: 2rem;
            }
            .fc-home-grid-3,
            .fc-home-grid-2,
            .fc-home-compliance,
            .fc-home-footer-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 480px) {
            .fc-home::before {
                height: 360px;
            }
            .fc-home-logo-top {
                max-width: 200px;
            }
            .fc-home-hero-card,
            .fc-home-side,
            .fc-home-panel,
            .fc-home-mode,
            .fc-home-footer,
            .fc-home-cta {
                border-radius: 18px;
                padding: 1rem;
            }
            .fc-home-title {
                font-size: 1.7rem;
            }
            .fc-home-brand {
                font-size: 0.78rem;
            }
            .fc-home-subtitle,
            .fc-home-section-intro {
                font-size: 0.95rem;
            }
            .fc-home-section h2 {
                font-size: 1.35rem;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_public_home() -> None:
    _inject_home_styles()
    st.markdown('<div class="fc-home">', unsafe_allow_html=True)

    top_left, top_right = st.columns([1.8, 1])
    with top_left:
        st.markdown('<div class="fc-home-topbar-title">Farma Consulta</div>', unsafe_allow_html=True)
    with top_right:
        btn1, btn2 = st.columns(2)
        with btn1:
            if st.button("Entrar", key="home_enter", use_container_width=True):
                st.session_state.auth_mode = "Login"
                st.session_state.public_view = "auth"
                st.rerun()
        with btn2:
            if st.button("Comecar Agora", key="home_start", use_container_width=True):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
                st.session_state.public_view = "auth"
                st.rerun()

    if LOGO_FULL.exists():
        st.markdown('<div class="fc-home-logo-top">', unsafe_allow_html=True)
        st.image(str(LOGO_FULL), use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-brand">Farma Consulta</div>', unsafe_allow_html=True)
    st.markdown('<div class="fc-home-title">Teleconsulta Farmaceutica ao Seu Alcance</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="fc-home-subtitle">Conecte-se com farmaceuticos qualificados para orientacoes personalizadas sobre medicamentos e saude, de forma segura e conveniente.</div>',
        unsafe_allow_html=True,
    )

    hero_left, hero_right = st.columns([1.7, 0.95], vertical_alignment="center")

    with hero_left:
        st.markdown('<div class="fc-home-hero-card">', unsafe_allow_html=True)
        st.markdown('<div class="fc-home-badge">Atendimento farmaceutico digital</div>', unsafe_allow_html=True)
        st.markdown(
            "<p style='margin-top:0; line-height:1.7;'>Agende sua consulta online com praticidade, tenha acesso a orientacoes especializadas e acompanhe seu atendimento em um ambiente profissional pensado para funcionar bem no celular e no computador.</p>",
            unsafe_allow_html=True,
        )
        primary_col, secondary_col = st.columns(2)
        with primary_col:
            if st.button("Agendar Teleconsulta", key="home_book", use_container_width=True):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
                st.session_state.public_view = "auth"
                st.rerun()
        with secondary_col:
            if st.button("Saiba Mais", key="home_more", use_container_width=True):
                st.session_state.auth_mode = "Login"
                st.session_state.auth_highlight = "Entre para continuar seu atendimento."
                st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    with hero_right:
        st.markdown('<div class="fc-home-side">', unsafe_allow_html=True)
        st.markdown('<div class="fc-home-check"><strong>Agendamento Rapido</strong><br>Em minutos</div>', unsafe_allow_html=True)
        st.markdown('<div class="fc-home-check"><strong>100% Seguro</strong><br>Conformidade LGPD</div>', unsafe_allow_html=True)
        st.markdown('<div class="fc-home-check"><strong>Farmaceuticos Qualificados</strong><br>Registrados no CRF</div>', unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-section">', unsafe_allow_html=True)
    st.markdown("<h2>Beneficios da Teleconsulta Farmaceutica</h2>", unsafe_allow_html=True)
    st.markdown(
        '<div class="fc-home-section-intro">Acesso a cuidados farmaceuticos profissionais sem sair de casa</div>',
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
    st.markdown('<div class="fc-home-grid-3">', unsafe_allow_html=True)
    for icon, titulo, texto in beneficios:
        st.markdown('<div class="fc-home-panel">', unsafe_allow_html=True)
        st.markdown(f"<div class='fc-home-icon'>{icon}</div>", unsafe_allow_html=True)
        st.markdown(f"<h4>{titulo}</h4>", unsafe_allow_html=True)
        st.markdown(f"<p>{texto}</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-section">', unsafe_allow_html=True)
    st.markdown("<h2>Modalidades de Telefarmacia</h2>", unsafe_allow_html=True)
    st.markdown(
        '<div class="fc-home-section-intro">Diferentes formas de atendimento farmaceutico adaptadas as suas necessidades</div>',
        unsafe_allow_html=True,
    )
    modalidades = [
        ("T", "Teleconsulta", "Consulta realizada de forma nao presencial, obrigatoriamente sincronica, onde o farmaceutico aborda um unico caso clinico por vez. Ideal para orientacoes sobre medicamentos e duvidas sobre prescricoes."),
        ("I", "Teleinterconsulta", "Envolve a colaboracao entre farmaceuticos ou com outros profissionais de saude para otimizar o tratamento do paciente. Proporciona uma abordagem multidisciplinar para casos complexos."),
        ("M", "Telemonitoramento", "Monitoramento remoto de parametros de saude, utilizando dispositivos e tecnologias para acompanhar o estado do paciente. Essencial para pacientes com doencas cronicas."),
        ("C", "Teleconsultoria", "Interacao entre farmaceuticos e outros profissionais para emitir pareceres tecnicos e administrativos. Suporta a tomada de decisoes clinicas e administrativas."),
    ]
    st.markdown('<div class="fc-home-grid-2">', unsafe_allow_html=True)
    for icon, titulo, texto in modalidades:
        st.markdown('<div class="fc-home-mode">', unsafe_allow_html=True)
        st.markdown(f"<div class='fc-home-icon'>{icon}</div>", unsafe_allow_html=True)
        st.markdown(f"<h4>{titulo}</h4>", unsafe_allow_html=True)
        st.markdown(f"<p>{texto}</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-section">', unsafe_allow_html=True)
    st.markdown("<h2>Conformidade e Seguranca</h2>", unsafe_allow_html=True)
    st.markdown(
        '<div class="fc-home-section-intro">Operamos em total conformidade com as regulamentacoes brasileiras</div>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="fc-home-compliance">', unsafe_allow_html=True)
    st.markdown('<div class="fc-home-panel">', unsafe_allow_html=True)
    st.markdown("<h4>Resolucao CFF no 727/2022</h4>", unsafe_allow_html=True)
    st.markdown("<p>Nossa plataforma segue rigorosamente a Resolucao no 727/2022 do Conselho Federal de Farmacia, que regula as atividades de telefarmacia no Brasil. Garantimos que todas as teleconsultas sejam sincronas, com um unico caso clinico por vez, e que todos os farmaceuticos sejam devidamente registrados no CRF de seus respectivos estados.</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown('<div class="fc-home-panel">', unsafe_allow_html=True)
    st.markdown("<h4>Lei Geral de Protecao de Dados (LGPD)</h4>", unsafe_allow_html=True)
    st.markdown("<p>Implementamos todas as medidas de seguranca exigidas pela LGPD para proteger seus dados pessoais e de saude. Voce tem direito de acesso, correcao e exclusao de seus dados a qualquer momento, e seu consentimento e sempre solicitado antes de qualquer coleta de informacoes.</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-panel" style="margin-top: 1rem;">', unsafe_allow_html=True)
    st.markdown("<h4>Nossos Compromissos</h4>", unsafe_allow_html=True)
    st.markdown(
        """
        <ul class="fc-home-commitments">
            <li>Atendimento sincronico e exclusivo (um caso clinico por vez)</li>
            <li>Farmaceuticos registrados e qualificados</li>
            <li>Registro completo de todas as interacoes</li>
            <li>Conformidade com Procedimento Operacional Padrao (POP)</li>
            <li>Criptografia de dados sensiveis</li>
            <li>Consentimento explicito para coleta de dados</li>
            <li>Direito de acesso aos dados pessoais</li>
            <li>Direito de exclusao de dados</li>
        </ul>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-cta">', unsafe_allow_html=True)
    st.markdown("<h2>Pronto para Comecar?</h2>", unsafe_allow_html=True)
    st.markdown("<p>Agende sua teleconsulta farmaceutica agora e receba orientacoes profissionais de forma segura e conveniente.</p>", unsafe_allow_html=True)
    if st.button("Agendar Teleconsulta", key="home_book_bottom", use_container_width=False):
        st.session_state.auth_mode = "Login"
        st.session_state.auth_highlight = "Entre para agendar sua teleconsulta."
        st.session_state.public_view = "auth"
        st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="fc-home-footer">', unsafe_allow_html=True)
    st.markdown('<div class="fc-home-footer-title">Farma Consulta</div>', unsafe_allow_html=True)
    st.markdown("<p>Teleconsulta farmaceutica segura e profissional.</p>", unsafe_allow_html=True)
    st.markdown('<div class="fc-home-footer-grid">', unsafe_allow_html=True)
    st.markdown("<div><h4>Sobre</h4><ul><li>Quem Somos</li><li>Nossos Farmaceuticos</li><li>Conformidade</li></ul></div>", unsafe_allow_html=True)
    st.markdown("<div><h4>Legal</h4><ul><li>Politica de Privacidade</li><li>Termos de Uso</li><li>LGPD</li></ul></div>", unsafe_allow_html=True)
    st.markdown("<div><h4>Contato</h4><p>Email: contato@farmaconsulta.com.br</p><p>Telefone: (11) 3000-0000</p><p style='margin-top:0.6rem;'>© 2026 Farma Consulta. Todos os direitos reservados. Conforme Resolucao CFF no 727/2022 e LGPD.</p></div>", unsafe_allow_html=True)
    st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

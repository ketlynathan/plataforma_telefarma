import streamlit as st

st.set_page_config(layout="wide")

# ===== CSS =====
st.markdown("""
<style>
.title {
    font-size: 42px;
    font-weight: 700;
}

.subtitle {
    font-size: 18px;
    opacity: 0.7;
}

.card {
    background: var(--secondary-background-color);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
}

.hero-btn .stButton>button {
    background-color: #2563eb;
    color: white;
    border-radius: 8px;
}
</style>
""", unsafe_allow_html=True)

# ===== HEADER =====
col1, col2 = st.columns([6,1])

with col1:
    st.markdown("### 💊 FarmaConsulta")

with col2:
    st.button("Entrar")

st.divider()

# ===== HERO =====
col1, col2 = st.columns([2,1])

with col1:
    st.markdown('<div class="title">Consultório Farmacêutico Online</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle">Atendimento seguro, orientação personalizada e acompanhamento contínuo.</div>', unsafe_allow_html=True)

    st.button("Agendar Consulta")

with col2:
    st.markdown("""
    <div class="card">
        ✔ Atendimento profissional<br><br>
        ✔ 100% online<br><br>
        ✔ Seguro e confidencial
    </div>
    """, unsafe_allow_html=True)

st.divider()

# ===== BENEFÍCIOS =====
col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="card">
        <h4>Consulta</h4>
        <p>Orientação farmacêutica personalizada</p>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="card">
        <h4>Acompanhamento</h4>
        <p>Monitoramento contínuo da sua saúde</p>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="card">
        <h4>Prontuário</h4>
        <p>Histórico seguro e organizado</p>
    </div>
    """, unsafe_allow_html=True)
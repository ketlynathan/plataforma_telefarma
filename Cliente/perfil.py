import streamlit as st

from database.db import DatabaseWriteError, update_user


def render_perfil_page(user: dict) -> None:
    st.title("Meu Perfil")
    st.caption("Gerencie seus dados pessoais e de saude")

    top_left, top_right = st.columns([3, 1])
    with top_right:
        st.button("Editar", use_container_width=True, disabled=True)

    st.subheader("Dados Pessoais")
    nome = st.text_input("Nome completo", value=user.get("nome", ""))
    email = st.text_input("Email", value=user.get("email", ""), disabled=True)
    cpf = st.text_input("CPF", value=user.get("cpf", "") or "000.000.000-00")
    data_nascimento = st.text_input(
        "Data de Nascimento",
        value=user.get("data_nascimento", "") or "dd.mm.aaaa",
    )
    telefone = st.text_input("Telefone", value=user.get("telefone", "") or "(11) 99999-9999")
    cep = st.text_input("CEP", value=user.get("cep", "") or "00000-000")
    endereco = st.text_input("Endereco", value=user.get("endereco", "") or "Rua, numero, complemento")
    cidade = st.text_input("Cidade", value=user.get("cidade", "") or "Sao Paulo")
    estado = st.text_input("Estado", value=user.get("estado", "") or "SP")

    st.subheader("Dados de Saude")
    doencas_cronicas = st.text_area("Doencas Cronicas", value=user.get("doencas_cronicas", ""), height=100)
    alergias = st.text_area("Alergias", value=user.get("alergias", ""), height=100)
    medicamentos_uso = st.text_area(
        "Medicamentos em Uso",
        value=user.get("medicamentos_uso", ""),
        height=100,
    )

    if st.button("Salvar alteracoes"):
        try:
            updated_user = update_user(
                user["email"],
                {
                    "nome": nome.strip(),
                    "telefone": telefone.strip(),
                    "cpf": cpf.strip(),
                    "data_nascimento": data_nascimento.strip(),
                    "cep": cep.strip(),
                    "endereco": endereco.strip(),
                    "cidade": cidade.strip(),
                    "estado": estado.strip(),
                    "doencas_cronicas": doencas_cronicas.strip(),
                    "alergias": alergias.strip(),
                    "medicamentos_uso": medicamentos_uso.strip(),
                },
            )
        except DatabaseWriteError as exc:
            st.error(str(exc))
            return

        if updated_user is None:
            st.error("Nao foi possivel atualizar o perfil.")
            return

        st.session_state.user = updated_user
        st.success("Perfil atualizado com sucesso.")

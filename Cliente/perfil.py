import streamlit as st

from database.db import DatabaseWriteError, update_user


def render_perfil_page(user: dict) -> None:
    st.title("Meu perfil")
    st.write("Atualize seus dados principais.")

    nome = st.text_input("Nome", value=user.get("nome", ""))
    email = st.text_input("Email", value=user.get("email", ""), disabled=True)
    telefone = st.text_input("Telefone", value=user.get("telefone", ""))

    if st.button("Salvar alteracoes"):
        try:
            updated_user = update_user(
                user["email"],
                {
                    "nome": nome.strip(),
                    "telefone": telefone.strip(),
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

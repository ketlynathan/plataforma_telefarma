import streamlit as st


def apply_global_styles() -> None:
    st.markdown(
        """
        <style>
        [data-testid="stAppViewContainer"] {
            background:
                linear-gradient(
                    180deg,
                    color-mix(in srgb, var(--background-color) 94%, black 6%) 0%,
                    color-mix(in srgb, var(--secondary-background-color) 88%, var(--background-color) 12%) 100%
                );
            color: var(--text-color);
        }
        [data-testid="stSidebar"] {
            background:
                linear-gradient(
                    180deg,
                    color-mix(in srgb, var(--secondary-background-color) 92%, var(--background-color) 8%) 0%,
                    color-mix(in srgb, var(--background-color) 96%, black 4%) 100%
                );
            border-right: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
        }
        [data-testid="stSidebar"] * {
            color: var(--text-color);
        }
        .stMetric {
            background: color-mix(in srgb, var(--background-color) 82%, var(--secondary-background-color) 18%);
            border: 1px solid color-mix(in srgb, var(--primary-color) 16%, transparent);
            border-radius: 18px;
            padding: 1rem;
        }
        div[data-testid="stDataFrame"] {
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid color-mix(in srgb, var(--primary-color) 12%, transparent);
            background: color-mix(in srgb, var(--background-color) 88%, var(--secondary-background-color) 12%);
        }
        [data-testid="stMainBlockContainer"] {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }
        .fc-top-action {
            padding-top: 0.35rem;
        }
        div[role="radiogroup"] {
            gap: 0.55rem;
            flex-wrap: wrap;
            margin-bottom: 0.35rem;
        }
        div[role="radiogroup"] label {
            background: color-mix(in srgb, var(--secondary-background-color) 82%, transparent);
            border: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
            border-radius: 999px;
            padding: 0.2rem 0.95rem;
            min-height: 42px;
            display: flex !important;
            align-items: center;
        }
        div[role="radiogroup"] label:has(input:checked) {
            background: color-mix(in srgb, var(--primary-color) 16%, transparent);
            border-color: color-mix(in srgb, var(--primary-color) 34%, transparent);
        }
        .stButton > button,
        .stSelectbox,
        .stDateInput,
        .stTextArea,
        .stTextInput {
            width: 100%;
        }
        @media (max-width: 768px) {
            [data-testid="stMainBlockContainer"] {
                padding-top: 0.75rem;
                padding-left: 0.85rem;
                padding-right: 0.85rem;
                max-width: 100%;
            }
            .fc-top-action {
                padding-top: 0;
            }
            .stMetric {
                padding: 0.8rem;
                border-radius: 14px;
            }
            div[data-testid="stDataFrame"] {
                border-radius: 14px;
            }
            div[data-testid="stVerticalBlock"] > div:has(> div[data-testid="stMetric"]) {
                gap: 0.75rem;
            }
            .stTextArea textarea {
                min-height: 120px;
            }
            div[role="radiogroup"] {
                display: grid !important;
                grid-template-columns: 1fr 1fr;
                gap: 0.45rem;
                width: 100%;
            }
            div[role="radiogroup"] label {
                width: 100%;
                justify-content: center;
                padding: 0.25rem 0.75rem;
                min-height: 44px;
            }
            h1 {
                font-size: 1.5rem !important;
                line-height: 1.2;
            }
            h2 {
                font-size: 1.25rem !important;
            }
            p, label {
                font-size: 0.95rem !important;
            }
        }
        @media (max-width: 480px) {
            [data-testid="stMainBlockContainer"] {
                padding-left: 0.7rem;
                padding-right: 0.7rem;
            }
            div[role="radiogroup"] {
                grid-template-columns: 1fr;
            }
            .stButton > button {
                min-height: 2.9rem;
            }
            h1 {
                font-size: 1.35rem !important;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

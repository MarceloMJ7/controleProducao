/* ============================================= */
/* ARQUIVO: auth.js                              */
/* (Lógica de Login e Cadastro)                  */
/* ============================================= */

import {
  API_BASE_URL,
  exibirErro, // <--- ADICIONADO: Importar a função de logout
  exibirSucesso,
  setupLogout,
  verificarAutenticacaoECarregarUsuario,
} from "./common.js";

document.addEventListener("DOMContentLoaded", function () {
  // Se não estiver no login/esqueci senha, verifica token
  const path = window.location.pathname;

  // Verifica se é uma página protegida (como o cadastro.html agora é)
  if (
    !path.includes("login.html") &&
    !path.includes("esqueci-senha.html") &&
    !path.includes("redefinirSenha.html")
  ) {
    verificarAutenticacaoECarregarUsuario();
    setupLogout(); // <--- ADICIONADO: Ativa o botão Sair
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const cadastroForm = document.getElementById("cadastroForm");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", handleCadastro);
  }
});

async function handleLogin(event) {
  event.preventDefault();
  const numero_registro = document
    .getElementById("numero_registro")
    .value.trim();
  const senha = document.getElementById("senha").value;

  if (!numero_registro || !senha) {
    exibirErro("Por favor, preencha todos os campos.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero_registro, senha }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("authToken", data.token);
      exibirSucesso("Login realizado com sucesso!");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      throw new Error(data.message || "Erro ao fazer login.");
    }
  } catch (error) {
    console.error("Erro de login:", error);
    exibirErro(error.message);
  }
}

async function handleCadastro(event) {
  event.preventDefault();
  const nome = document.getElementById("nome").value;
  const numero_registro = document.getElementById("numero_registro").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  if (senha !== confirmarSenha) {
    return exibirErro("As senhas não coincidem!");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, numero_registro, email, senha }),
    });
    const data = await response.json();

    if (response.status === 201) {
      // SUCESSO: Apenas limpa e avisa (utilizador continua logado)
      exibirSucesso("Novo utilizador cadastrado com sucesso!");
      document.getElementById("cadastroForm").reset();
    } else {
      throw new Error(data.message || "Erro ao cadastrar utilizador.");
    }
  } catch (error) {
    console.error("Erro de cadastro:", error);
    exibirErro(error.message);
  }
}

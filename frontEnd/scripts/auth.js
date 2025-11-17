import { 
  API_BASE_URL, 
  verificarAutenticacaoECarregarUsuario,
  exibirSucesso,
  exibirErro
} from './common.js';

document.addEventListener("DOMContentLoaded", function () {
  verificarAutenticacaoECarregarUsuario();

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
  const numero_registro = document.getElementById("numero_registro").value.trim();
  const senha = document.getElementById("senha").value;
  
  if (!numero_registro || !senha) {
      exibirErro("Por favor, preencha todos os campos.");
      return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero_registro, senha }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("authToken", data.token);
      exibirSucesso("Login realizado com sucesso!");
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, numero_registro, email, senha }),
    });
    const data = await response.json();
    if (response.status === 201) {
      exibirSucesso("Conta criada! Faça o login.");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
    } else { 
      throw new Error(data.message || "Erro ao cadastrar usuário."); 
    }
  } catch (error) { 
      console.error("Erro de cadastro:", error);
      exibirErro(error.message);
  }
} 
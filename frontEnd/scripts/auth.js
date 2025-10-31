/* ============================================= */
/* ARQUIVO: auth.js                              */
/* (Lógica específica do login.html e cadastro.html) */
/* ============================================= */

// --- 1. Importa o código partilhado ---
import { 
    API_BASE_URL, 
    verificarAutenticacaoECarregarUsuario 
} from './common.js';

// --- 2. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {
    
    // Verifica a autenticação. 
    // (Esta função do common.js irá redirecionar para o dashboard se já estiver logado)
    verificarAutenticacaoECarregarUsuario();

    // Adiciona os listeners APENAS se os formulários existirem na página
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const cadastroForm = document.getElementById("cadastroForm");
    if (cadastroForm) {
        cadastroForm.addEventListener("submit", handleCadastro);
    }
});

// --- 3. Funções Específicas de Autenticação ---

/**
 * Lida com o envio do formulário de Login.
 */
async function handleLogin(event) {
    event.preventDefault();
    const numero_registro = document.getElementById("numero_registro").value.trim();
    const senha = document.getElementById("senha").value;
    
    if (!numero_registro || !senha) {
        alert("Por favor, preencha o número de registro e a senha.");
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
        alert("Login realizado com sucesso!");
        window.location.href = "dashboard.html"; // Redireciona para o dashboard
      } else { 
        throw new Error(data.message || "Erro ao fazer login."); 
      }
    } catch (error) { 
        console.error("Erro de login:", error);
        alert(error.message); 
    }
}

/**
 * Lida com o envio do formulário de Cadastro.
 */
async function handleCadastro(event) {
    event.preventDefault();
    const nome = document.getElementById("nome").value;
    const numero_registro = document.getElementById("numero_registro").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;
    
    if (senha !== confirmarSenha) { 
        return alert("As senhas não coincidem!"); 
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, numero_registro, email, senha }),
      });
      const data = await response.json();
      if (response.status === 201) {
        alert("Usuário criado com sucesso! Por favor, faça o login.");
        window.location.href = "login.html"; // Redireciona para o login
      } else { 
        throw new Error(data.message || "Erro ao cadastrar usuário."); 
      }
    } catch (error) { 
        console.error("Erro de cadastro:", error);
        alert(error.message); 
    }
}
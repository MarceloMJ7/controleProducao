/* ============================================= */
/* ARQUIVO: common.js                            */
/* (Código partilhado por todas as páginas)      */
/* ============================================= */

// --- 1. Exporta a Configuração da API ---
//export const API_BASE_URL = 'https://controleproducao.onrender.com';
export const API_BASE_URL = "http://localhost:3001"; // (Descomente para testar localmente)


// --- 2. Lógica de Autenticação e Dados do Usuário ---

/**
 * Verifica se o usuário está logado (tem token) e redireciona se necessário.
 * Carrega os dados do usuário na sidebar.
 */
export async function verificarAutenticacaoECarregarUsuario() {
    const paginasDeAcesso = ["login.html", "cadastro.html", "esqueci-senha.html"];
    const paginaAtual = window.location.pathname.split("/").pop();
    const token = localStorage.getItem("authToken");

    if (paginasDeAcesso.includes(paginaAtual) || paginaAtual === "") {
        // Se está na página de login/cadastro E tem token, redireciona para o dashboard
        if (token) {
            window.location.href = "dashboard.html";
        }
        return; // Não faz nada se estiver na página de login sem token
    }

    // Se NÃO está na página de login E NÃO tem token, redireciona para o login
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Se chegou aqui, está numa página protegida e tem token. Carrega os dados.
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
            method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-cache",
        });
        if (response.ok) {
            const usuario = await response.json();
            const elementoNome = document.getElementById("nomeUsuarioLogado");
            if (elementoNome) elementoNome.textContent = usuario.nome;
        } else {
            // Token inválido/expirado
            localStorage.removeItem("authToken");
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
}

/**
 * Configura o botão de Logout em todas as páginas.
 */
export function setupLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('authToken');
            alert('Logout realizado com sucesso!');
            window.location.href = 'login.html';
        });
    }
}


// --- 3. Funções Utilitárias Partilhadas ---

/**
 * Calcula o tempo relativo (ex: "há 5 min").
 * @param {string} dataISO - A data em formato ISO (vem do banco).
 * @returns {string} O texto formatado.
 */
export function calcularTempoAtras(dataISO) {
    const agora = new Date(); const dataPassada = new Date(dataISO);
    const diferencaSegundos = Math.round((agora - dataPassada) / 1000);
    const minutos = Math.round(diferencaSegundos / 60); const horas = Math.round(diferencaSegundos / 3600);
    const dias = Math.round(diferencaSegundos / 86400); const semanas = Math.round(diferencaSegundos / 604800);
    const meses = Math.round(diferencaSegundos / 2629800); const anos = Math.round(diferencaSegundos / 31557600);
    
    if (diferencaSegundos < 60) { return `agora mesmo`; }
    else if (minutos < 60) { return `há ${minutos} min`; }
    else if (horas < 24) { return `há ${horas} h`; }
    else if (dias < 7) { return `há ${dias} d`; }
    else if (semanas < 4) { return `há ${semanas} sem`; }
    else if (meses < 12) { return `há ${meses} mes`; }
    else { return `há ${anos} a`; }
}

/**
 * Retorna a classe CSS do badge com base no status do projeto.
 * @param {string} status - O status (ex: "Pendente").
 * @returns {string} A classe CSS (ex: "border-warning text-warning").
 */
export function getBadgeClass(status) {
    switch (status) {
      case "Pendente": return "border-warning text-warning";
      case "Em Montagem": return "border-info text-info";
      case "Concluído": return "border-success text-success";
      default: return "border-secondary text-secondary";
    }
}
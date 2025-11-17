/* ============================================= */
/* ARQUIVO: common.js                            */
/* (Código partilhado por todas as páginas)      */
/* ============================================= */

// --- 1. Exporta a Configuração da API ---
export const API_BASE_URL = "http://localhost:3001"; 
// export const API_BASE_URL = 'https://controleproducao.onrender.com';

// --- 2. Lógica de Autenticação e Dados do Usuário ---

export async function verificarAutenticacaoECarregarUsuario() {
    const paginasDeAcesso = ["login.html", "cadastro.html", "esqueci-senha.html"];
    const paginaAtual = window.location.pathname.split("/").pop();
    const token = localStorage.getItem("authToken");

    if (paginasDeAcesso.includes(paginaAtual) || paginaAtual === "") {
        if (token) {
            window.location.href = "dashboard.html";
        }
        return;
    }

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
            method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-cache",
        });
        if (response.ok) {
            const usuario = await response.json();
            const elementoNome = document.getElementById("nomeUsuarioLogado");
            if (elementoNome) elementoNome.textContent = usuario.nome;
        } else {
            localStorage.removeItem("authToken");
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
}

export function setupLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            
            Swal.fire({
                title: 'Sair do Sistema?',
                text: "Você terá que fazer login novamente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, sair',
                cancelButtonText: 'Cancelar',
                background: '#212529',
                color: '#fff'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                }
            });
        });
    }
}

// --- 3. Funções Utilitárias Partilhadas ---

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

export function getBadgeClass(status) {
    switch (status) {
      case "Pendente": return "border-warning text-warning";
      case "Em Montagem": return "border-info text-info";
      case "Concluído": return "border-success text-success";
      default: return "border-secondary text-secondary";
    }
}

// --- 4. FUNÇÕES DE NOTIFICAÇÃO (SweetAlert2) ---

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#212529', 
    color: '#fff',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

export function exibirSucesso(mensagem) {
    Toast.fire({ icon: 'success', title: mensagem });
}

export function exibirErro(mensagem) {
    Toast.fire({ icon: 'error', title: mensagem });
}

export async function confirmarAcao(titulo, texto) {
    const result = await Swal.fire({
        title: titulo,
        text: texto,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, confirmar',
        cancelButtonText: 'Cancelar',
        background: '#212529',
        color: '#fff'
    });
    return result.isConfirmed;
}
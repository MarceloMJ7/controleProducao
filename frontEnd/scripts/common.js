/* ============================================= */
/* ARQUIVO: common.js                            */
/* ============================================= */

// PARA PRODUÇÃO / DEPLOY (Use esta):
export const API_BASE_URL = 'https://controleproducao.onrender.com'; 
// PARA LOCALHOST (Use esta se for testar na sua máquina):
// export const API_BASE_URL = "http://localhost:3001"; 

// --- 1. Autenticação e Inicialização ---
export async function verificarAutenticacaoECarregarUsuario() {
    const paginasDeAcesso = ["login.html", "cadastro.html", "esqueci-senha.html"];
    const paginaAtual = window.location.pathname.split("/").pop();
    const token = localStorage.getItem("authToken");

    if (paginasDeAcesso.includes(paginaAtual) || paginaAtual === "") {
        if (token) window.location.href = "dashboard.html";
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
            
            // INICIALIZA A SIDEBAR
            setupSidebarToggle();

        } else {
            localStorage.removeItem("authToken");
            window.location.href = "login.html";
        }
    } catch (error) {
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
}

// --- 2. Lógica da Sidebar (NOVO) ---
function setupSidebarToggle() {
    const btn = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (btn && sidebar) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('toggled');
        });
    }
}

// --- 3. Logout ---
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

// --- 4. Utilitários ---
export function calcularTempoAtras(dataISO) {
    const agora = new Date(); const dataPassada = new Date(dataISO);
    const diferencaSegundos = Math.round((agora - dataPassada) / 1000);
    const minutos = Math.round(diferencaSegundos / 60); const horas = Math.round(diferencaSegundos / 3600);
    const dias = Math.round(diferencaSegundos / 86400);
    
    if (diferencaSegundos < 60) return `agora mesmo`;
    if (minutos < 60) return `há ${minutos} min`;
    if (horas < 24) return `há ${horas} h`;
    return `há ${dias} d`;
}

export function getBadgeClass(status) {
    switch (status) {
      case "Pendente": return "border-warning text-warning";
      case "Em Montagem": return "border-info text-info";
      case "Concluído": return "border-success text-success";
      default: return "border-secondary text-secondary";
    }
}

// --- 5. SweetAlert2 ---
const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: '#212529', color: '#fff',
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});
export function exibirSucesso(msg) { Toast.fire({ icon: 'success', title: msg }); }
export function exibirErro(msg) { Toast.fire({ icon: 'error', title: msg }); }
export async function confirmarAcao(titulo, texto) {
    const result = await Swal.fire({ title: titulo, text: texto, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim', cancelButtonText: 'Não', background: '#212529', color: '#fff' });
    return result.isConfirmed;
}
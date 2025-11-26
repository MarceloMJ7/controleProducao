/* ============================================= */
/* ARQUIVO: common.js                            */
/* ============================================= */

// Configuração Automática da API
const hostname = window.location.hostname;
export const API_BASE_URL =
  hostname === "localhost" || hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://controleproducao.onrender.com";

// --- Lógica de Autenticação ---
export async function verificarAutenticacaoECarregarUsuario() {
  const paginasPublicas = [
    "login.html",
    "esqueci-senha.html",
    "redefinirSenha.html",
  ];
  const paginaAtual = window.location.pathname.split("/").pop();
  const token = localStorage.getItem("authToken");

  // 1. Se for página pública, redireciona para dashboard se já tiver token
  if (paginasPublicas.includes(paginaAtual) || paginaAtual === "") {
    if (token) window.location.href = "dashboard.html";
    return;
  }

  // 2. Se não tiver token e for página privada, manda pro login
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/perfil`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-cache",
    });

    if (response.ok) {
      // SUCESSO: Carrega dados do usuário
      const usuario = await response.json();
      const elementoNome = document.getElementById("nomeUsuarioLogado");
      if (elementoNome) elementoNome.textContent = usuario.nome;

      setupSidebarToggle();
    } else {
      // ERRO NA RESPOSTA
      // Só desloga se for 401 (Token inválido/expirado) ou 403 (Proibido)
      if (response.status === 401 || response.status === 403) {
        console.warn("Sessão expirada. Redirecionando...");
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
      } else {
        // Se for erro 500 ou outro, não desloga, apenas avisa
        console.error("Erro no servidor (não é auth):", response.status);
      }
    }
  } catch (error) {
    // ERRO DE REDE (Servidor fora do ar ou acordando)
    console.error("Erro de conexão:", error);
    // NÃO DESLOGA AQUI. Isso evita o "kick" quando o Render está acordando.
    // Opcional: Você pode exibir um Toast avisando "Tentando reconectar..."
  }
}

// --- Interface (Sidebar & Logout) ---
function setupSidebarToggle() {
  const btn = document.getElementById("menu-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (btn && sidebar) {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sidebar.classList.toggle("toggled");
    });
  }
}

export function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();
      confirmarAcao("Sair do Sistema?", "Terá de fazer login novamente.").then(
        (confirmado) => {
          if (confirmado) {
            localStorage.removeItem("authToken");
            window.location.href = "login.html";
          }
        }
      );
    });
  }
}

// --- Utilitários ---
export function calcularTempoAtras(dataISO) {
  const agora = new Date();
  const dataPassada = new Date(dataISO);
  const diferenca = Math.round((agora - dataPassada) / 1000);
  if (diferenca < 60) return `agora mesmo`;
  if (diferenca < 3600) return `há ${Math.round(diferenca / 60)} min`;
  if (diferenca < 86400) return `há ${Math.round(diferenca / 3600)} h`;
  return `há ${Math.round(diferenca / 86400)} d`;
}

export function getBadgeClass(status) {
  switch (status) {
    case "Pendente":
      return "border-warning text-warning";
    case "Em Montagem":
      return "border-info text-info";
    case "Concluído":
      return "border-success text-success";
    default:
      return "border-secondary text-secondary";
  }
}

export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// --- Notificações (SweetAlert2) ---
function getSwal() {
  if (typeof Swal === "undefined") return null;
  return Swal;
}

const Toast = () => {
  const S = getSwal();
  if (!S) return null;
  return S.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#212529",
    color: "#fff",
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", S.stopTimer);
      toast.addEventListener("mouseleave", S.resumeTimer);
    },
  });
};

export function exibirSucesso(msg) {
  const t = Toast();
  if (t) t.fire({ icon: "success", title: msg });
  else alert(msg);
}
export function exibirErro(msg) {
  const t = Toast();
  if (t) t.fire({ icon: "error", title: msg });
  else alert(msg);
}

export async function confirmarAcao(titulo, texto) {
  const S = getSwal();
  if (!S) return confirm(titulo);
  const result = await S.fire({
    title: titulo,
    text: texto,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sim",
    cancelButtonText: "Cancelar",
    background: "#212529",
    color: "#fff",
  });
  return result.isConfirmed;
}
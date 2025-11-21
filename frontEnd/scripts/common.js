/* ============================================= */
/* ARQUIVO: common.js                            */
/* (Código partilhado por todas as páginas)      */
/* ============================================= */

// --- 1. Configuração Automática da API (NOVO) ---
// Se o navegador estiver rodando em 'localhost' ou '127.0.0.1', usa a porta 3001.
// Caso contrário (ex: vercel.app), usa o backend do Render.
export const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://controleproducao.onrender.com";

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
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-cache",
    });
    if (response.ok) {
      const usuario = await response.json();
      const elementoNome = document.getElementById("nomeUsuarioLogado");
      if (elementoNome) elementoNome.textContent = usuario.nome;

      setupSidebarToggle();
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
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();

      Swal.fire({
        title: "Sair do Sistema?",
        text: "Você terá que fazer login novamente.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sim, sair",
        cancelButtonText: "Cancelar",
        background: "#212529",
        color: "#fff",
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem("authToken");
          window.location.href = "login.html";
        }
      });
    });
  }
}

function setupSidebarToggle() {
  const btn = document.getElementById("menu-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (btn && sidebar) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      sidebar.classList.toggle("toggled");
    });
  }
}

// --- 3. Funções Utilitárias Partilhadas ---

export function calcularTempoAtras(dataISO) {
  const agora = new Date();
  const dataPassada = new Date(dataISO);
  const diferencaSegundos = Math.round((agora - dataPassada) / 1000);
  const minutos = Math.round(diferencaSegundos / 60);
  const horas = Math.round(diferencaSegundos / 3600);
  const dias = Math.round(diferencaSegundos / 86400);

  if (diferencaSegundos < 60) {
    return `agora mesmo`;
  } else if (minutos < 60) {
    return `há ${minutos} min`;
  } else if (horas < 24) {
    return `há ${horas} h`;
  } else {
    return `há ${dias} d`;
  }
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

// --- 4. Utilitário de DEBOUNCE (NOVO) ---
// Atrasa a execução de uma função (útil para barras de pesquisa)
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// --- 5. Funções de Notificação (SweetAlert2) ---

function getToast() {
  if (typeof Swal === "undefined") return null;
  return Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#212529",
    color: "#fff",
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

export function exibirSucesso(mensagem) {
  const Toast = getToast();
  if (Toast) Toast.fire({ icon: "success", title: mensagem });
  else alert(mensagem);
}

export function exibirErro(mensagem) {
  const Toast = getToast();
  if (Toast) Toast.fire({ icon: "error", title: mensagem });
  else alert(mensagem);
}

export async function confirmarAcao(titulo, texto) {
  if (typeof Swal === "undefined") return confirm(titulo);
  const result = await Swal.fire({
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

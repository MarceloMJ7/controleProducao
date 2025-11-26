// frontEnd/scripts/relatorios.js

import {
  API_BASE_URL,
  exibirErro,
  getBadgeClass,
  setupLogout,
  verificarAutenticacaoECarregarUsuario,
} from "./common.js";

let currentReportChart = null;

// Configuração global do Chart.js
if (typeof Chart !== "undefined") {
  Chart.defaults.color = "rgba(255, 255, 255, 0.7)";
  Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)";
  Chart.defaults.plugins.legend.labels.color = "rgba(255, 255, 255, 0.9)";
}

document.addEventListener("DOMContentLoaded", function () {
  verificarAutenticacaoECarregarUsuario();
  setupLogout();

  const reportForm = document.getElementById("reportForm");
  if (reportForm) {
    popularFiltroMontadores();
    popularFiltroStatus();

    const reportTypeSelect = document.getElementById("reportType");
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener("change", alternarFiltros);
      alternarFiltros(); // Chama uma vez para iniciar correto
    }

    // REMOVE qualquer listener antigo antes de adicionar o novo (para evitar duplicação)
    const newReportForm = reportForm.cloneNode(true);
    reportForm.parentNode.replaceChild(newReportForm, reportForm);

    newReportForm.addEventListener("submit", handleGerarRelatorio);

    const exportBtn = document.getElementById("exportPdfButton");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportarPDF);
    }

    const tbody = document.getElementById("reportTableBody");
    if (tbody) {
      tbody.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-ver-nc");
        if (btn) {
          const descricao = btn.dataset.desc;
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: "Detalhe da Não Conformidade",
              text: descricao,
              icon: "warning",
              background: "#212529",
              color: "#fff",
              confirmButtonColor: "#d33",
              confirmButtonText: "Fechar",
            });
          } else {
            alert(`Não Conformidade: ${descricao}`);
          }
        }
      });
    }
  }
});

function alternarFiltros() {
  const type = document.getElementById("reportType").value;
  const montadorFilter = document.getElementById("montadorFilter");
  const statusFilter = document.getElementById("statusFilter");
  const ncFilter = document.getElementById("naoConformidadeFilter");

  if (montadorFilter) montadorFilter.className = type === "montador" ? "col-md-3" : "col-md-3 d-none";
  if (statusFilter) statusFilter.className = type === "projeto" ? "col-md-3" : "col-md-3 d-none";
  if (ncFilter) ncFilter.className = type === "projeto" ? "col-md-3" : "col-md-3 d-none";
}

async function popularFiltroMontadores() {
  const select = document.getElementById("montadorSelect");
  if (!select) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/montadores?limit=1000`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });
    if (res.ok) {
      const json = await res.json();
      const montadores = json.data || (Array.isArray(json) ? json : []);
      select.innerHTML = '<option value="">Todos os Montadores</option>';
      montadores.forEach(m => select.innerHTML += `<option value="${m.id}">${m.nome}</option>`);
    }
  } catch (e) {
    console.error("Erro ao carregar montadores", e);
  }
}

function popularFiltroStatus() {
  const select = document.getElementById("statusSelect");
  if (!select) return;
  select.innerHTML = `
        <option value="">Todos os Status</option>
        <option value="Pendente">Pendente</option>
        <option value="Em Montagem">Em Montagem</option>
        <option value="Concluído">Concluído</option>`;
}

async function handleGerarRelatorio(e) {
  e.preventDefault();

  const filtroNCElement = document.getElementById("naoConformidadeSelect");
  const filtroNC = filtroNCElement ? filtroNCElement.value : "";

  const filtros = {
    reportType: document.getElementById("reportType").value,
    montadorId: document.getElementById("montadorSelect").value,
    status: document.getElementById("statusSelect").value,
    teveNaoConformidade: filtroNC,
    startDate: document.getElementById("startDate").value || null,
    endDate: document.getElementById("endDate").value || null,
  };

  const visual = document.getElementById("visualResults");
  const ph = document.getElementById("reportPlaceholder");
  const resDiv = document.getElementById("reportResults");
  const tbody = document.getElementById("reportTableBody");
  const btnExport = document.getElementById("exportPdfButton");

  ph.classList.add("d-none");
  visual.classList.add("d-none");
  resDiv.classList.remove("d-none");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50"><span class="spinner-border spinner-border-sm"></span> Gerando...</td></tr>`;
  if (btnExport) btnExport.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify(filtros),
    });

    if (!res.ok) {
      // const errData = await res.json().catch(() => ({}));
      // throw new Error(errData.message || "Erro ao gerar relatório.");
    }

    const data = await res.json();

    if (!data.tableData || data.tableData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum dado encontrado com os filtros selecionados.</td></tr>`;
      return;
    }

    visual.classList.remove("d-none");

    // Passamos o filtroNC para controlar os títulos e cores
    renderKPIs(data.statistics, filtros.reportType, filtroNC);

    document.getElementById("chartTitle").textContent = data.chartData.title;
    renderizarGrafico(data.chartData);

    filtros.reportType === "montador"
      ? renderizarTabelaMontadores(data.tableData)
      : renderizarTabelaProjetos(data.tableData);

    if (btnExport) btnExport.disabled = false;

  } catch (err) {
    console.error(err);
    visual.classList.add("d-none");
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

function renderKPIs(stats, type, filterNC) {
  const row = document.getElementById("kpiCardsRow");
  if (!row) return;

  const fmt = (val, perc) => `${val} <span class="fs-6 text-white-50 ms-1">(${perc}%)</span>`;

  // Formatação para Filtro Ativo (Ex: "3 / 4 (75%)")
  const fmtDual = (val, total, perc) =>
    `${val} <span class="fs-5 text-white-50">/ ${total}</span> <span class="fs-6 text-white-50 ms-1">(${perc}%)</span>`;

  const card = (t, valHTML, i, c) => `
        <div class="col-xxl-3 col-lg-6 col-md-6">
            <div class="card glass-card h-100">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div class="text-white"><h5 class="card-title opacity-75">${t}</h5><p class="card-text fs-2 fw-bold">${valHTML}</p></div>
                    <i class="fas ${i} fa-3x ${c} opacity-50"></i>
                </div>
            </div>
        </div>`;

  if (type === "projeto") {
    let html = "";

    // Verifica se stats.isFilteringNC existe (veio do backend atualizado)
    // Se não vier, assume comportamento padrão (todos)
    const isFiltering = stats.isFilteringNC === true;

    if (isFiltering) {
      // === MODO FILTRADO (Separa o Total do Recorte) ===

      // 1. Card Total Geral de Concluídos (O Universo)
      html += card(
        "Total Concluídos",
        `${stats.totalConcluidosGeral}`,
        "fa-clipboard-check",
        "text-light"
      );

      // 2. Card do Filtro Específico (A Fatia)
      const titulo = filterNC === "true" ? "Com Não Conformidade" : "Sem Não Conformidade";
      const cor = filterNC === "true" ? "text-danger" : "text-success";
      const icone = filterNC === "true" ? "fa-exclamation-triangle" : "fa-check-circle";

      html += card(
        titulo,
        fmt(stats.qtdConcluidos, stats.percConcluidos),
        icone,
        cor
      );

    } else {
      // === MODO VISÃO GERAL (Todos) ===
      html += card("Concluídos", fmt(stats.qtdConcluidos, stats.percConcluidos), "fa-check-circle", "text-success");
      html += card("Em Montagem", fmt(stats.qtdEmMontagem, stats.percEmMontagem), "fa-cogs", "text-primary");
      html += card("Pendentes", fmt(stats.qtdPendentes, stats.percPendentes), "fa-hourglass-half", "text-warning");
      html += card("Total de Projetos", `${stats.totalProjetos}`, "fa-list-alt", "text-light");
    }

    // 3 e 4. Métricas (Sempre aparecem)
    html += card("Tempo Médio", `${stats.mediaDiasEntrega} <span class="fs-6 text-white-50">dias</span>`, "fa-clock", "text-info");
    html += card("Pontualidade", `${stats.percNoPrazo}% <span class="fs-6 text-white-50">no prazo</span>`, "fa-calendar-check", "text-success");

    row.innerHTML = html;

  } else {
    // Layout Montadores
    row.innerHTML =
      card("Montadores", stats.totalMontadores, "fa-users", "text-primary") +
      card("Total Concluídos", stats.totalProjetosConcluidos, "fa-check-circle", "text-success") +
      card("Média / Montador", stats.mediaProjetosPorMontador, "fa-chart-pie", "text-info") +
      card("N/C Geral", fmt(stats.qtdNaoConformidades, stats.taxaNaoConformidadeGeral), "fa-exclamation-triangle", "text-danger");
  }
}

function renderizarGrafico(chartData) {
  if (currentReportChart) currentReportChart.destroy();
  const ctxElement = document.getElementById("reportChart");
  if (!ctxElement) return;

  const ctx = ctxElement.getContext("2d");
  const colors = { azul: "rgba(13, 110, 253, 0.7)", azulB: "rgba(13, 110, 253, 1)", vermelho: "rgba(220, 53, 69, 0.7)", vermelhoB: "rgba(220, 53, 69, 1)", verde: "rgba(25, 135, 84, 0.7)", amarelo: "rgba(255, 206, 86, 0.7)" };

  let config = {
    type: chartData.type,
    data: {
      labels: chartData.labels,
      datasets: chartData.type === "pie"
        ? [{ data: chartData.data, backgroundColor: [colors.verde, colors.azul, colors.amarelo], borderWidth: 2, borderColor: "rgba(33,37,41,0.5)" }]
        : chartData.datasets.map((d, i) => ({ ...d, backgroundColor: i === 0 ? colors.azul : colors.vermelho, borderColor: i === 0 ? colors.azulB : colors.vermelhoB, borderWidth: 1, borderRadius: 6 })),
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: chartData.type === "pie" ? "top" : "bottom" } } },
  };

  if (chartData.type === "bar") {
    config.options.indexAxis = "y";
    config.options.scales = { x: { beginAtZero: true, ticks: { color: "#bbb", precision: 0 }, grid: { color: "rgba(255,255,255,0.1)", borderDash: [2, 4] } }, y: { ticks: { color: "#bbb" }, grid: { display: false } } };
  }
  currentReportChart = new Chart(ctx, config);
}

function renderizarTabelaMontadores(data) {
  const h = document.getElementById("reportTableHeader");
  const b = document.getElementById("reportTableBody");
  h.innerHTML = `<tr><th>Montador</th><th class="text-center">Concluídos</th><th class="text-center">Não Conformidades</th></tr>`;
  b.innerHTML = "";
  data.forEach(i => b.innerHTML += `<tr><td>${i.nome}</td><td class="text-center">${i.projetosConcluidos}</td><td class="text-center text-danger fw-bold">${i.naoConformidades}</td></tr>`);
}

function renderizarTabelaProjetos(data) {
  const h = document.getElementById("reportTableHeader");
  const b = document.getElementById("reportTableBody");
  h.innerHTML = `<tr><th>Projeto</th><th>Empresa</th><th>Montador(es)</th><th class="text-center">Status</th><th>Entrega</th></tr>`;
  b.innerHTML = "";
  data.forEach(i => {
    const date = new Date(i.data_entrega).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const monts = i.montadores.map(m => m.nome).join(", ") || "N/A";
    const badge = getBadgeClass(i.status);
    const nc = i.teveNaoConformidade ? `<button class="btn btn-sm p-0 border-0 text-danger btn-ver-nc" data-desc="${i.descricaoNaoConformidade || "Sem descrição."}" title="Ver Detalhe"><i class="fas fa-exclamation-circle fa-lg"></i></button>` : "";
    b.innerHTML += `<tr><td>${i.codigo_projeto}</td><td>${i.nome_empresa}</td><td>${monts}</td><td class="text-center"><span class="badge rounded-pill ${badge}">${i.status}</span>${nc}</td><td>${date}</td></tr>`;
  });
}

async function exportarPDF() {
  if (typeof window.jspdf === "undefined" || typeof html2canvas === "undefined") return exibirErro("Erro: Bibliotecas PDF não carregadas.");
  const btn = document.getElementById("exportPdfButton");
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Gerando PDF...`;
  document.body.classList.add("body-pdf-export");
  if (currentReportChart) { Chart.defaults.color = "#000000"; Chart.defaults.borderColor = "#cccccc"; Chart.defaults.plugins.legend.labels.color = "#000000"; currentReportChart.update("none"); }
  await new Promise((r) => setTimeout(r, 400));
  try {
    const canvas = await html2canvas(document.getElementById("reportableContent"), { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove("body-pdf-export");
    if (currentReportChart) { Chart.defaults.color = "rgba(255, 255, 255, 0.7)"; Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)"; Chart.defaults.plugins.legend.labels.color = "rgba(255, 255, 255, 0.9)"; currentReportChart.update("none"); }
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210, h = 297, imgH = (canvas.height * w) / canvas.width;
    let heightLeft = imgH, pos = 0;
    pdf.addImage(imgData, "PNG", 0, pos, w, imgH);
    heightLeft -= h;
    while (heightLeft > 0) { pos = heightLeft - imgH; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, pos, w, imgH); heightLeft -= h; }
    pdf.save(`Relatorio_SGP_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
    exibirSucesso("PDF Gerado!");
  } catch (err) { console.error(err); document.body.classList.remove("body-pdf-export"); } finally { btn.disabled = false; btn.innerHTML = oldText; }
}
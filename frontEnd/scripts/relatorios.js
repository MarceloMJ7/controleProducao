/* ============================================= */
/* ARQUIVO: relatorios.js                        */
/* (Lógica específica da página de Relatórios)   */
/* ============================================= */

// --- 1. Importa o código partilhado ---
import {
    API_BASE_URL,
    verificarAutenticacaoECarregarUsuario,
    setupLogout,
    getBadgeClass
} from './common.js';

// --- 2. Variável Global para o Gráfico ---
let currentReportChart = null; // Guarda a instância do gráfico para destruí-la antes de criar um novo

// --- 3. Configurações Globais do Chart.js para Tema Escuro ---
Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.legend.labels.color = 'rgba(255, 255, 255, 0.9)';


// --- 4. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        popularFiltroMontadores();
        popularFiltroStatus(); // Popula o filtro de status

        const reportTypeSelect = document.getElementById('reportType');
        reportTypeSelect.addEventListener('change', alternarFiltros);
        
        // Garante que o filtro correto seja exibido ao carregar
        alternarFiltros(); 

        reportForm.addEventListener('submit', handleGerarRelatorio);
    }
});

// --- 5. Funções de Setup e UI ---

function alternarFiltros() {
    const reportType = document.getElementById('reportType').value;
    const montadorFilter = document.getElementById('montadorFilter');
    const statusFilter = document.getElementById('statusFilter');

    // O padrão agora é 'projeto', então mostramos o filtro de status primeiro
    if (reportType === 'montador') {
        montadorFilter.classList.remove('d-none');
        statusFilter.classList.add('d-none');
    } else { // 'projeto'
        montadorFilter.classList.add('d-none');
        statusFilter.classList.remove('d-none');
    }
}

async function popularFiltroMontadores() {
    const token = localStorage.getItem("authToken");
    const montadorSelect = document.getElementById('montadorSelect');
    if (!token || !montadorSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/montadores`, {
            headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-cache'
        });
        if (!response.ok) throw new Error("Falha ao buscar montadores.");
        const montadores = await response.json();
        
        montadorSelect.innerHTML = '<option value="">Todos os Montadores</option>'; 
        montadores.forEach(montador => {
            const option = document.createElement('option');
            option.value = montador.id;
            option.textContent = montador.nome;
            montadorSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao popular montadores:", error);
        montadorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

function popularFiltroStatus() {
    const statusSelect = document.getElementById('statusSelect');
    statusSelect.innerHTML = `
        <option value="">Todos os Status</option>
        <option value="Pendente">Pendente</option>
        <option value="Em Montagem">Em Montagem</option>
        <option value="Concluído">Concluído</option>
    `;
}

// --- 6. Funções Principais de Geração de Relatório ---

/**
 * Lida com o clique no botão "Gerar", chama a API e renderiza os resultados.
 */
async function handleGerarRelatorio(event) {
    event.preventDefault(); 
    const token = localStorage.getItem("authToken");
    
    const filtros = {
        reportType: document.getElementById('reportType').value,
        montadorId: document.getElementById('montadorSelect').value,
        status: document.getElementById('statusSelect').value,
        startDate: document.getElementById('startDate').value || null,
        endDate: document.getElementById('endDate').value || null
    };

    const visualResults = document.getElementById('visualResults');
    const kpiCardsRow = document.getElementById('kpiCardsRow');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportResults = document.getElementById('reportResults');
    const reportTableBody = document.getElementById('reportTableBody');
    const reportTableHeader = document.getElementById('reportTableHeader');

    // Limpa resultados antigos e mostra carregamento
    reportPlaceholder.classList.add('d-none');
    visualResults.classList.add('d-none'); // Esconde KPIs e Gráfico
    kpiCardsRow.innerHTML = ''; // Limpa KPIs antigos
    reportResults.classList.remove('d-none'); // Mostra a área da tabela
    reportTableHeader.innerHTML = ''; 
    reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50"><span class="spinner-border spinner-border-sm"></span> Gerando relatório...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(filtros)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Erro ao gerar relatório.");
        }

        const data = await response.json(); // Recebe o objeto { statistics, chartData, tableData }

        // Verifica se não há dados na tabela
        if (data.tableData.length === 0) {
            reportTableHeader.innerHTML = '';
            reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum dado encontrado para os filtros selecionados.</td></tr>`;
            return;
        }

        // Exibe os novos elementos visuais
        visualResults.classList.remove('d-none');

        // Renderiza os 3 componentes
        renderizarKPIs(data.statistics, filtros.reportType);
        renderizarGrafico(data.chartData);

        if (filtros.reportType === 'montador') {
            renderizarTabelaMontadores(data.tableData);
        } else {
            renderizarTabelaProjetos(data.tableData);
        }

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        visualResults.classList.add('d-none'); // Esconde visuais em caso de erro
        reportTableHeader.innerHTML = '';
        reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

/**
 * Cria e insere os cards de KPI (métricas).
 * @param {object} statistics - O objeto de estatísticas vindo da API.
 * @param {string} reportType - O tipo de relatório ('projeto' ou 'montador').
 */
function renderizarKPIs(statistics, reportType) {
    const kpiCardsRow = document.getElementById('kpiCardsRow');
    kpiCardsRow.innerHTML = ''; // Limpa cards antigos

    let kpiCardsHTML = '';

    if (reportType === 'projeto') {
        kpiCardsHTML = `
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Total de Projetos', statistics.totalProjetos, 'fa-project-diagram', 'text-primary')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Concluídos', `${statistics.percConcluidos}%`, 'fa-check-circle', 'text-success')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Pendentes', `${statistics.percPendentes}%`, 'fa-hourglass-half', 'text-warning')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Taxa de N/C (sobre concluídos)', `${statistics.percNaoConformes}%`, 'fa-exclamation-triangle', 'text-danger')}
            </div>
        `;
    } else { // 'montador'
        kpiCardsHTML = `
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Montadores no Período', statistics.totalMontadores, 'fa-users', 'text-primary')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Total de Concluídos', statistics.totalProjetosConcluidos, 'fa-check-circle', 'text-success')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Média por Montador', statistics.mediaProjetosPorMontador, 'fa-chart-pie', 'text-info')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Taxa de N/C Geral', `${statistics.taxaNaoConformidadeGeral}%`, 'fa-exclamation-triangle', 'text-danger')}
            </div>
        `;
    }
    
    kpiCardsRow.innerHTML = kpiCardsHTML;
}

/**
 * Helper para criar o HTML de um card de KPI.
 */
function createKpiCard(title, value, icon, colorClass) {
    return `
        <div class="card glass-card h-100">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div class="text-white">
                    <h5 class="card-title opacity-75">${title}</h5>
                    <p class="card-text fs-2 fw-bold">${value}</p>
                </div>
                <i class="fas ${icon} fa-3x ${colorClass} opacity-50"></i>
            </div>
        </div>
    `;
}

/**
 * Renderiza o gráfico (Pizza ou Barras) no canvas com visual melhorado.
 * @param {object} chartData - O objeto chartData vindo da API.
 */
function renderizarGrafico(chartData) {
    if (currentReportChart) {
        currentReportChart.destroy(); // Destrói o gráfico anterior
    }

    const ctx = document.getElementById('reportChart').getContext('2d');
    
    // --- 1. Definição de Cores ---
    // Usando os padrões do Bootstrap 5 (Azul e Vermelho) com transparência
    const corAzul = 'rgba(13, 110, 253, 0.7)';
    const corAzulBorda = 'rgba(13, 110, 253, 1)';
    const corVermelha = 'rgba(220, 53, 69, 0.7)';
    const corVermelhaBorda = 'rgba(220, 53, 69, 1)';
    const corAmarela = 'rgba(255, 206, 86, 0.7)';

    let chartConfig = {
        type: chartData.type, // 'pie' ou 'bar'
        data: {
            labels: chartData.labels,
            datasets: (chartData.type === 'pie') 
                ? [{ // Configuração do Gráfico de Pizza
                    data: chartData.data,
                    backgroundColor: [corAzul, corAmarela, corVermelha],
                    borderColor: 'rgba(33, 37, 41, 0.5)', // Borda escura
                    borderWidth: 2,
                }]
                : chartData.datasets.map((dataset, index) => ({ // Configuração do Gráfico de Barras
                    ...dataset,
                    backgroundColor: index === 0 ? corAzul : corVermelha,
                    borderColor: index === 0 ? corAzulBorda : corVermelhaBorda,
                    borderWidth: 1,
                    borderRadius: 6,         // <-- Cantos arredondados
                    barPercentage: 0.5,      // <-- VALOR ATUALIZADO (barras mais finas)
                    categoryPercentage: 0.7, // <-- VALOR ATUALIZADO (espaço entre grupos)
                }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: (chartData.type === 'pie') ? 'top' : 'bottom',
                },
                // --- 2. Tooltips (Hover) Customizados ---
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 4,
                    displayColors: true,
                }
            }
        }
    };
    
    // --- 3. Customização dos Eixos (Apenas para Gráfico de Barras) ---
    if (chartData.type === 'bar') {
        chartConfig.options.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    precision: 0 // <-- Força o eixo Y a usar números inteiros
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    borderDash: [2, 4], // <-- Linhas tracejadas
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                },
                grid: {
                    display: false, // <-- Remove linhas de grade verticais
                }
            }
        };
    }

    currentReportChart = new Chart(ctx, chartConfig);
}

// ================================================
// ==== BLOCO ADICIONADO PARA CORRIGIR O ERRO ====
// ================================================

/**
 * Renderiza a tabela de desempenho de montadores.
 * @param {Array} data - Os dados da tabela vindos da API.
 */
function renderizarTabelaMontadores(data) {
    const reportTableHeader = document.getElementById('reportTableHeader');
    const reportTableBody = document.getElementById('reportTableBody');

    reportTableHeader.innerHTML = `
        <tr>
            <th>Montador</th>
            <th class="text-center">Projetos Concluídos</th>
            <th class="text-center">Não Conformidades</th>
        </tr>
    `;
    
    reportTableBody.innerHTML = ''; // Limpa o "carregando"
    data.forEach(item => {
        reportTableBody.innerHTML += `
            <tr>
                <td>${item.nome}</td>
                <td class="text-center">${item.projetosConcluidos}</td>
                <td class="text-center text-danger fw-bold">${item.naoConformidades}</td>
            </tr>
        `;
    });
}

/**
 * Renderiza a tabela geral de projetos.
 * @param {Array} data - Os dados da tabela vindos da API.
 */
function renderizarTabelaProjetos(data) {
    const reportTableHeader = document.getElementById('reportTableHeader');
    const reportTableBody = document.getElementById('reportTableBody');

    reportTableHeader.innerHTML = `
        <tr>
            <th>Cód. Projeto</th>
            <th>Empresa</th>
            <th>Montador(es)</th>
            <th class="text-center">Status</th>
            <th>Data Entrega</th>
        </tr>
    `;
    
    reportTableBody.innerHTML = ''; // Limpa o "carregando"
    data.forEach(item => {
        const dataEntrega = new Date(item.data_entrega).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
        const nomesMontadores = item.montadores.map(m => m.nome).join(', ') || 'N/A';
        const badgeClass = getBadgeClass(item.status); // Função importada de common.js
        const naoConformidadeIcone = item.teveNaoConformidade
            ? ' <i class="fas fa-exclamation-circle text-danger ms-1 small" title="Não Conforme"></i>'
            : '';

        reportTableBody.innerHTML += `
            <tr>
                <td>${item.codigo_projeto}</td>
                <td>${item.nome_empresa}</td>
                <td>${nomesMontadores}</td>
                <td class="text-center">
                    <span class="badge rounded-pill ${badgeClass}">${item.status}</span>${naoConformidadeIcone}
                </td>
                <td>${dataEntrega}</td>
            </tr>
        `;
    });
}
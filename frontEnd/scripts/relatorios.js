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
let currentReportChart = null; 

// --- 3. Configurações Globais do Chart.js para Tema Escuro ---
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.legend.labels.color = 'rgba(255, 255, 255, 0.9)';
}


// --- 4. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        popularFiltroMontadores();
        popularFiltroStatus(); 

        const reportTypeSelect = document.getElementById('reportType');
        reportTypeSelect.addEventListener('change', alternarFiltros);
        
        alternarFiltros(); 

        reportForm.addEventListener('submit', handleGerarRelatorio);

        // Listener para o botão de exportar PDF
        document.getElementById('exportPdfButton').addEventListener('click', exportarPDF);
    }
});

// --- 5. Funções de Setup e UI ---

function alternarFiltros() {
    const reportType = document.getElementById('reportType').value;
    const montadorFilter = document.getElementById('montadorFilter');
    const statusFilter = document.getElementById('statusFilter');
    const naoConformidadeFilter = document.getElementById('naoConformidadeFilter');

    if (reportType === 'montador') {
        montadorFilter.classList.remove('d-none');
        statusFilter.classList.add('d-none');
        naoConformidadeFilter.classList.add('d-none'); 
    } else { // 'projeto'
        montadorFilter.classList.add('d-none');
        statusFilter.classList.remove('d-none');
        naoConformidadeFilter.classList.remove('d-none'); 
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
    if (!statusSelect) return;
    statusSelect.innerHTML = `
        <option value="">Todos os Status</option>
        <option value="Pendente">Pendente</option>
        <option value="Em Montagem">Em Montagem</option>
        <option value="Concluído">Concluído</option>
    `;
}

// --- 6. Funções Principais de Geração de Relatório ---

async function handleGerarRelatorio(event) {
    event.preventDefault(); 
    const token = localStorage.getItem("authToken");
    
    const filtros = {
        reportType: document.getElementById('reportType').value,
        montadorId: document.getElementById('montadorSelect').value,
        status: document.getElementById('statusSelect').value,
        teveNaoConformidade: document.getElementById('naoConformidadeSelect').value,
        startDate: document.getElementById('startDate').value || null,
        endDate: document.getElementById('endDate').value || null
    };

    const visualResults = document.getElementById('visualResults');
    const kpiCardsRow = document.getElementById('kpiCardsRow');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportResults = document.getElementById('reportResults');
    const reportTableBody = document.getElementById('reportTableBody');
    const reportTableHeader = document.getElementById('reportTableHeader');
    const chartTitle = document.getElementById('chartTitle');
    const exportButton = document.getElementById('exportPdfButton');

    reportPlaceholder.classList.add('d-none');
    visualResults.classList.add('d-none'); 
    kpiCardsRow.innerHTML = ''; 
    reportResults.classList.remove('d-none'); 
    reportTableHeader.innerHTML = ''; 
    reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50"><span class="spinner-border spinner-border-sm"></span> Gerando relatório...</td></tr>`;
    exportButton.disabled = true; 

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

        const data = await response.json(); 

        if (data.tableData.length === 0) {
            visualResults.classList.add('d-none');
            reportTableHeader.innerHTML = '';
            reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50">Nenhum dado encontrado para os filtros selecionados.</td></tr>`;
            return;
        }

        visualResults.classList.remove('d-none');
        
        renderizarKPIs(data.statistics, filtros.reportType); 
        
        chartTitle.textContent = data.chartData.title; 
        renderizarGrafico(data.chartData);

        if (filtros.reportType === 'montador') {
            renderizarTabelaMontadores(data.tableData);
        } else {
            renderizarTabelaProjetos(data.tableData);
        }

        exportButton.disabled = false; 

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        visualResults.classList.add('d-none'); 
        reportTableHeader.innerHTML = '';
        reportTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

// --- 7. Funções de Renderização (KPIs, Gráficos, Tabelas) ---

function renderizarKPIs(statistics, reportType) {
    const kpiCardsRow = document.getElementById('kpiCardsRow');
    kpiCardsRow.innerHTML = ''; 

    let kpiCardsHTML = '';

    if (reportType === 'projeto') {
        kpiCardsHTML = `
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Concluídos', `${statistics.percConcluidos}%`, 'fa-check-circle', 'text-success')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Em Montagem', `${statistics.percEmMontagem}%`, 'fa-cogs', 'text-primary')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Pendentes', `${statistics.percPendentes}%`, 'fa-hourglass-half', 'text-warning')}
            </div>
            <div class="col-lg-3 col-md-6">
                ${createKpiCard('Taxa de N/C (Concluídos)', `${statistics.percNaoConformes}%`, 'fa-exclamation-triangle', 'text-danger')}
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

function renderizarGrafico(chartData) {
    if (currentReportChart) {
        currentReportChart.destroy(); 
    }

    const ctx = document.getElementById('reportChart').getContext('2d');
    
    const corAzul = 'rgba(13, 110, 253, 0.7)';
    const corAzulBorda = 'rgba(13, 110, 253, 1)';
    const corVermelha = 'rgba(220, 53, 69, 0.7)';
    const corVermelhaBorda = 'rgba(220, 53, 69, 1)';
    const corAmarela = 'rgba(255, 206, 86, 0.7)';
    const corVerde = 'rgba(25, 135, 84, 0.7)'; 

    let chartConfig = {
        type: chartData.type,
        data: {
            labels: chartData.labels,
            datasets: (chartData.type === 'pie') 
                ? [{ 
                    data: chartData.data,
                    backgroundColor: [corVerde, corAzul, corAmarela], 
                    borderColor: 'rgba(33, 37, 41, 0.5)', 
                    borderWidth: 2,
                }]
                : chartData.datasets.map((dataset, index) => ({ 
                    ...dataset,
                    backgroundColor: index === 0 ? corAzul : corVermelha,
                    borderColor: index === 0 ? corAzulBorda : corVermelhaBorda,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.5, 
                    categoryPercentage: 0.7, 
                }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: (chartData.type === 'pie') ? 'top' : 'bottom',
                },
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
    
    if (chartData.type === 'bar') {
        chartConfig.options.indexAxis = 'y'; 
        chartConfig.options.scales = {
            x: { 
                beginAtZero: true,
                ticks: { color: 'rgba(255, 255, 255, 0.7)', precision: 0 },
                grid: { color: 'rgba(255, 255, 255, 0.1)', borderDash: [2, 4] }
            },
            y: { 
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { display: false }
            }
        };
    }

    currentReportChart = new Chart(ctx, chartConfig);
}

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
    
    reportTableBody.innerHTML = ''; 
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
    
    reportTableBody.innerHTML = ''; 
    data.forEach(item => {
        const dataEntrega = new Date(item.data_entrega).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
        const nomesMontadores = item.montadores.map(m => m.nome).join(', ') || 'N/A';
        const badgeClass = getBadgeClass(item.status);
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

// --- 7. FUNÇÃO DE EXPORTAÇÃO DE PDF (COM A VERIFICAÇÃO CORRIGIDA) ---

/**
 * Exporta o conteúdo do relatório para PDF.
 */
async function exportarPDF() {
    
    // ==========================================================
    // ==== ESTA É A LINHA CORRIGIDA ====
    // ==========================================================
    if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
        alert('Erro: As bibliotecas de geração de PDF não foram carregadas. (jsPDF ou html2canvas)');
        return;
    }

    const { jsPDF } = window.jspdf; 
    const exportButton = document.getElementById('exportPdfButton');
    const originalButtonText = exportButton.innerHTML;
    
    exportButton.disabled = true;
    exportButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Preparando...`;

    // 1. Adiciona a classe de exportação
    document.body.classList.add('body-pdf-export');
    
    // Força o Chart.js a se re-renderizar com as cores de impressão (texto preto)
    if (currentReportChart) {
        Chart.defaults.color = '#333';
        currentReportChart.update('none'); // 'none' para evitar animação
    }

    // Delay para garantir que o navegador aplicou os estilos
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        const content = document.getElementById("reportableContent");

        const canvas = await html2canvas(content, {
            scale: 2, 
            backgroundColor: '#ffffff', // Força o fundo branco no canvas
            useCORS: true 
        });

        // 2. Remove a classe e restaura os estilos do gráfico IMEDIATAMENTE após o "print"
        document.body.classList.remove('body-pdf-export');
        if (currentReportChart) {
            Chart.defaults.color = 'rgba(255, 255, 255, 0.7)'; // Restaura cor padrão
            currentReportChart.update('none');
        }
        exportButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Gerando...`;

        const imgData = canvas.toDataURL('image/png');
        
        const pdfWidth = 210; 
        const pageHeight = 297;
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const calculatedHeight = imgHeight / ratio;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        let heightLeft = calculatedHeight;
        let position = 0; 

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, calculatedHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - calculatedHeight; 
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, calculatedHeight);
            heightLeft -= pageHeight;
        }
        
        const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const reportType = document.getElementById('reportType').value;
        const fileName = `Relatorio-${reportType}-${dataHoje}.pdf`;

        pdf.save(fileName);

    } catch (error) {
        console.error("Erro ao exportar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        // 3. Garante a remoção da classe e restaura o botão
        document.body.classList.remove('body-pdf-export');
        if (currentReportChart) {
             Chart.defaults.color = 'rgba(255, 255, 255, 0.7)'; // Restaura cor padrão
             currentReportChart.update('none');
        }
        exportButton.disabled = false;
        exportButton.innerHTML = originalButtonText;
    }
}
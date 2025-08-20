/* ============================================= */
/* SCRIPT PARA A PÁGINA DE PROJETOS              */
/* ============================================= */
const tabelaProjetos = document.getElementById('projetosTabela');
// Garante que o código só rode na página de projetos
if (tabelaProjetos) {
    // Pega os elementos do card de detalhes
    const detailsCard = document.getElementById('projectDetailsCard');
    const projectCodeDetail = document.getElementById('projectCodeDetail');
    const projectCompanyDetail = document.getElementById('projectCompanyDetail');
    const projectDescriptionDetail = document.getElementById('projectDescriptionDetail');
    const projectAssemblerDetail = document.getElementById('projectAssemblerDetail');
    const projectStatusDetail = document.getElementById('projectStatusDetail');

    // Adiciona um evento de clique para cada linha da tabela
    tabelaProjetos.querySelectorAll('tr').forEach(item => {
        item.addEventListener('click', event => {
            // Extrai as informações da linha clicada
            const codigo = item.cells[0].textContent;
            const empresa = item.cells[1].textContent;
            const statusBadge = item.cells[4].innerHTML; // Pega o HTML do badge de status
            
            // Extrai as informações dos atributos data-*
            const montador = item.dataset.montador;
            const descricao = item.dataset.description;

            // Preenche o card de detalhes com as informações
            projectCodeDetail.innerText = `Detalhes do Projeto: ${codigo}`;
            projectCompanyDetail.innerText = empresa;
            projectDescriptionDetail.innerText = descricao;
            projectAssemblerDetail.innerText = montador;
            projectStatusDetail.innerHTML = statusBadge;

            // Mostra o card de detalhes
            detailsCard.classList.remove('d-none');
        });
    });
}


/* ============================================= */
/* SCRIPT PARA A PÁGINA DE MONITORES             */
/* ============================================= */

const tabelaMontadores = document.getElementById('montadoresTabela');
if (tabelaMontadores) {
    const performanceCard = document.getElementById('performanceDetailsCard');
    const performancePlaceholder = document.getElementById('performancePlaceholder');
    const performanceData = document.getElementById('performanceData');
    const nomeMontadorDetalhe = document.getElementById('montadorNomeDetalhe');
    const chartCanvas = document.getElementById('montadorPerformanceChart');
    let montadorChart; 

    tabelaMontadores.querySelectorAll('tr').forEach(item => {
        item.addEventListener('click', event => {
            const nome = item.cells[1].textContent;
            if(performancePlaceholder) performancePlaceholder.classList.add('d-none');
            if(performanceData) performanceData.classList.remove('d-none');
            nomeMontadorDetalhe.textContent = `Desempenho de ${nome}`;
            if (montadorChart) { montadorChart.destroy(); }
            montadorChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: ['Concluídos', 'Em Andamento', 'Pendentes'],
                    datasets: [{
                        label: 'Nº de Projetos',
                        data: [Math.floor(Math.random() * 30), Math.floor(Math.random() * 5), Math.floor(Math.random() * 3)],
                        backgroundColor: ['rgba(25, 135, 84, 0.7)', 'rgba(13, 110, 253, 0.7)', 'rgba(255, 193, 7, 0.7)'],
                        borderColor: ['#198754', '#0d6efd', '#ffc107'],
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } },
                    plugins: { legend: { display: false } }
                }
            });
        });
    });
}


/* ============================================= */
/* SCRIPT PARA A PÁGINA DE RELATÓRIOS            */
/* ============================================= */

const reportForm = document.getElementById('reportForm');
if (reportForm) {
    const reportTypeSelect = document.getElementById('reportType');
    const montadorFilter = document.getElementById('montadorFilter');
    const statusFilter = document.getElementById('statusFilter');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportResults = document.getElementById('reportResults');
    const reportTitle = document.getElementById('reportTitle');
    const reportTableHeader = document.getElementById('reportTableHeader');
    const reportTableBody = document.getElementById('reportTableBody');

    if(reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function() {
            if (this.value === 'montador') {
                montadorFilter.classList.remove('d-none');
                statusFilter.classList.add('d-none');
            } else if (this.value === 'projeto') {
                montadorFilter.classList.add('d-none');
                statusFilter.classList.remove('d-none');
            }
        });
    }

    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();
        reportPlaceholder.classList.add('d-none');
        reportResults.classList.remove('d-none');
        reportTableHeader.innerHTML = '';
        reportTableBody.innerHTML = '';
        const selectedReport = reportTypeSelect.value;
        reportTitle.textContent = `Relatório: ${reportTypeSelect.options[reportTypeSelect.selectedIndex].text}`;
        if (selectedReport === 'montador') {
            reportTableHeader.innerHTML = `<tr><th>Montador</th><th class="text-center">Projetos Concluídos</th><th class="text-center">Média de Tempo / Projeto</th></tr>`;
            reportTableBody.innerHTML = `<tr><td>Carlos Silva</td><td class="text-center">8</td><td class="text-center">3 dias</td></tr><tr><td>João Pereira</td><td class="text-center">4</td><td class="text-center">5 dias</td></tr>`;
        } else if (selectedReport === 'projeto') {
            reportTableHeader.innerHTML = `<tr><th>Cód. Projeto</th><th>Cliente</th><th>Montador</th><th class="text-center">Status</th><th>Data de Conclusão</th></tr>`;
            reportTableBody.innerHTML = `<tr><td>PRJ-105</td><td>Empresa X</td><td>Carlos Silva</td><td class="text-center"><span class="badge text-bg-success">Concluído</span></td><td>01/08/2025</td></tr><tr><td>PRJ-098</td><td>Empresa Y</td><td>João Pereira</td><td class="text-center"><span class="badge text-bg-success">Concluído</span></td><td>03/08/2025</td></tr>`;
        }
    });
}
/* ============================================= */
/* SCRIPT PARA A PÁGINA DE MONITORES             */
/* ============================================= */

const tabelaMontadores = document.getElementById('montadoresTabela');
// A verificação 'if' garante que este código só rodará se o elemento 'tabelaMontadores' existir na página.
if (tabelaMontadores) {
    const performanceCard = document.getElementById('performanceDetailsCard');
    const performancePlaceholder = document.getElementById('performancePlaceholder');
    const performanceData = document.getElementById('performanceData');
    const nomeMontadorDetalhe = document.getElementById('montadorNomeDetalhe');
    const chartCanvas = document.getElementById('montadorPerformanceChart');
    let montadorChart; // Variável para guardar a instância do nosso gráfico

    tabelaMontadores.querySelectorAll('tr').forEach(item => {
        item.addEventListener('click', event => {
            const nome = item.cells[1].textContent; // Pega o nome da segunda célula

            // Esconde o placeholder e mostra a área de dados
            if(performancePlaceholder) performancePlaceholder.classList.add('d-none');
            if(performanceData) performanceData.classList.remove('d-none');
            
            nomeMontadorDetalhe.textContent = `Desempenho de ${nome}`;

            // Se um gráfico já existir, destrua-o antes de criar um novo
            if (montadorChart) {
                montadorChart.destroy();
            }
            
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
// A verificação 'if' garante que este código só rodará se o elemento 'reportForm' existir na página.
if (reportForm) {
    const reportTypeSelect = document.getElementById('reportType');
    const montadorFilter = document.getElementById('montadorFilter');
    const statusFilter = document.getElementById('statusFilter');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const reportResults = document.getElementById('reportResults');
    const reportTitle = document.getElementById('reportTitle');
    const reportTableHeader = document.getElementById('reportTableHeader');
    const reportTableBody = document.getElementById('reportTableBody');

    // Lógica para filtros dinâmicos
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

    // Lógica para gerar o relatório
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
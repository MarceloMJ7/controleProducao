/* ============================================= */
/* ARQUIVO: dashboard.js                         */
/* (Lógica específica da página do Dashboard)    */
/* ============================================= */

// --- 1. Importa o código partilhado ---
import { 
    API_BASE_URL, 
    verificarAutenticacaoECarregarUsuario, 
    setupLogout, 
    calcularTempoAtras 
} from './common.js';

// --- 2. Executa o código da página ---
document.addEventListener("DOMContentLoaded", function () {
    
    // Funções partilhadas que rodam em todas as páginas protegidas
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    // Funções específicas que só rodam nesta página
    if (document.getElementById('dashboard-page')) {
        carregarEstatisticasDashboard();
        carregarProjetosAtencao();
        carregarUltimasAtualizacoes();
        carregarPrazosProximos();
    }
    
    // Listener para botões "Ver Projeto" (só existe no Dashboard)
    document.body.addEventListener('click', function(event) {
        const verButton = event.target.closest('.btn-ver-projeto');
        if (verButton) {
            event.preventDefault();
            const codigoProjeto = verButton.dataset.projetoCodigo;
            if (codigoProjeto) {
                window.location.href = `gerenciador_Projetos.html?codigo=${encodeURIComponent(codigoProjeto)}`;
            }
        }
    });
});

// --- 3. Funções Específicas do Dashboard ---

// Função para carregar os KPIs (cartões de estatísticas)
async function carregarEstatisticasDashboard() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const idsDosCards = ['statsProjetosAtivos', 'statsProjetosPendentes', 'statsProjetosConcluidos', 'statsProjetosMes'];
    idsDosCards.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) { elemento.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`; }
        else { console.warn(`Elemento com ID '${id}' não encontrado (spinner).`); }
    });
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error('Falha ao buscar estatísticas do dashboard.'); }
        const stats = await response.json();
        const statsMap = {
            'statsProjetosAtivos': stats.emMontagem, 'statsProjetosPendentes': stats.pendentes,
            'statsProjetosConcluidos': stats.concluidos, 'statsProjetosMes': stats.projetosMes
        };
        idsDosCards.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) { elemento.textContent = statsMap[id] !== undefined && statsMap[id] !== null ? statsMap[id] : 0; }
            else { console.warn(`Elemento com ID '${id}' não encontrado (valor).`); }
        });
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error.message);
        idsDosCards.forEach(id => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = '!'; });
    }
}

// Função para carregar a lista de projetos que exigem atenção
async function carregarProjetosAtencao() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const listaElement = document.getElementById('listaProjetosAtencao'); if (!listaElement) return;
    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atencao`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error('Falha ao buscar projetos que exigem atenção.'); }
        const projetos = await response.json(); listaElement.innerHTML = '';
        if (projetos.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhum projeto requer atenção especial no momento.</li>'; return; }
        projetos.forEach(projeto => {
            let badgeClass = 'text-bg-secondary'; let motivo = projeto.descricao || 'Sem detalhes adicionais.';
            if (projeto.tipo_atencao === 'Atrasado') { badgeClass = 'text-bg-danger'; motivo = `Prazo expirou em ${new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}.`; }
            const itemHTML = `<li class="list-group-item d-flex justify-content-between align-items-start"> <div> <span class="badge ${badgeClass}">${projeto.tipo_atencao}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="d-block text-white-50 ms-2">${motivo}</small> </div> <a href="#" class="btn btn-sm btn-outline-light mt-1 btn-ver-projeto" data-projeto-codigo="${projeto.codigo_projeto}">Ver</a> </li>`;
            listaElement.innerHTML += itemHTML;
        });
    } catch (error) { console.error("Erro ao carregar projetos com atenção:", error.message); listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar projetos.</li>'; }
}

// Função para carregar a lista de últimas atualizações (projetos recentes)
async function carregarUltimasAtualizacoes() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const listaElement = document.getElementById('listaUltimasAtualizacoes'); if (!listaElement) return;
    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atualizacoes`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error('Falha ao buscar últimas atualizações.'); }
        const projetosRecentes = await response.json(); listaElement.innerHTML = '';
        if (projetosRecentes.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhuma atualização recente.</li>'; return; }
        projetosRecentes.forEach(projeto => {
            let badgeClass = 'text-bg-secondary'; let actionText = 'Cadastrado';
            switch(projeto.status) {
                case 'Concluído': badgeClass = 'text-bg-success'; actionText = 'Concluído'; break;
                case 'Em Montagem': badgeClass = 'text-bg-primary'; actionText = 'Iniciado'; break;
                case 'Pendente': badgeClass = 'text-bg-warning'; actionText = 'Pendente'; break;
            }
            // Usa a função 'calcularTempoAtras' importada do common.js
            const tempoAtras = calcularTempoAtras(projeto.data_cadastro); 
            const itemHTML = `<li class="list-group-item"> <span class="badge ${badgeClass}">${actionText}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="text-white-50 d-block">${tempoAtras}</small> </li>`;
            listaElement.innerHTML += itemHTML;
        });
    } catch (error) { console.error("Erro ao carregar últimas atualizações:", error.message); listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar atualizações.</li>'; }
}

// Função para carregar a tabela de prazos de entrega próximos
async function carregarPrazosProximos() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const tabelaBody = document.getElementById('tabelaPrazosBody'); if (!tabelaBody) return;
    tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50"><span class="spinner-border spinner-border-sm" role="status"></span> Carregando prazos...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/prazos`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error('Falha ao buscar prazos de entrega.'); }
        const projetos = await response.json(); tabelaBody.innerHTML = '';
        if (projetos.length === 0) { tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50">Nenhum prazo de entrega próximo.</td></tr>'; return; }
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        projetos.forEach(projeto => {
            const dataEntrega = new Date(projeto.data_entrega); dataEntrega.setHours(0 - (dataEntrega.getTimezoneOffset() / 60), 0, 0, 0);
            const diffTime = dataEntrega - hoje; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let prazoTexto = `Em ${diffDays} dias`; let prazoClasseBadge = 'border-info text-info';
            if (diffDays < 0) { prazoTexto = 'Atrasado'; prazoClasseBadge = 'border-danger text-danger'; }
             else if (diffDays === 0) { prazoTexto = 'Vence Hoje'; prazoClasseBadge = 'border-danger text-danger'; }
             else if (diffDays <= 3) { prazoTexto = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`; prazoClasseBadge = 'border-warning text-warning'; }
             else if (diffDays <= 7) { prazoTexto = `Em ${diffDays} dias`; prazoClasseBadge = 'border-primary text-primary'; }
            const linhaHTML = `<tr> <td>${projeto.codigo_projeto}</td> <td>${projeto.nome_empresa}</td> <td class="text-end"> <span class="badge rounded-pill ${prazoClasseBadge}">${prazoTexto}</span> </td> </tr>`;
            tabelaBody.innerHTML += linhaHTML;
        });
    } catch (error) { console.error("Erro ao carregar prazos próximos:", error.message); tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar prazos.</td></tr>'; }
}
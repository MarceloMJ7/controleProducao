import { 
    API_BASE_URL, 
    verificarAutenticacaoECarregarUsuario, 
    setupLogout, 
    calcularTempoAtras 
} from './common.js';

document.addEventListener("DOMContentLoaded", function () {
    verificarAutenticacaoECarregarUsuario();
    setupLogout();

    if (document.getElementById('dashboard-page')) {
        carregarEstatisticasDashboard();
        carregarProjetosAtencao();
        carregarUltimasAtualizacoes();
        carregarPrazosProximos();
    }
    
    // Listener Corrigido para Redirecionamento (Funciona Local e Vercel)
    document.body.addEventListener('click', function(event) {
        const verButton = event.target.closest('.btn-ver-projeto');
        if (verButton) {
            event.preventDefault();
            const codigoProjeto = verButton.dataset.projetoCodigo;
            if (codigoProjeto) {
                // Apontando diretamente para o arquivo .html
                window.location.href = `gerenciador_Projetos.html?codigo=${encodeURIComponent(codigoProjeto)}`;
            }
        }
    });
});

async function carregarEstatisticasDashboard() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const idsDosCards = ['statsProjetosAtivos', 'statsProjetosPendentes', 'statsProjetosConcluidos', 'statsProjetosMes'];
    idsDosCards.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) { elemento.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`; }
    });
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        if (!response.ok) { throw new Error('Falha API'); }
        const stats = await response.json();
        
        const elAtivos = document.getElementById('statsProjetosAtivos');
        const elPendentes = document.getElementById('statsProjetosPendentes');
        const elConcluidos = document.getElementById('statsProjetosConcluidos');
        const elMes = document.getElementById('statsProjetosMes');

        if(elAtivos) elAtivos.textContent = stats.emMontagem || 0;
        if(elPendentes) elPendentes.textContent = stats.pendentes || 0;
        if(elConcluidos) elConcluidos.textContent = stats.concluidos || 0;
        if(elMes) elMes.textContent = stats.projetosMes || 0;

    } catch (error) {
        idsDosCards.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '-'; });
    }
}

async function carregarProjetosAtencao() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const listaElement = document.getElementById('listaProjetosAtencao'); if (!listaElement) return;
    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Carregando...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atencao`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        const projetos = await response.json(); listaElement.innerHTML = '';
        if (!response.ok || projetos.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhum projeto requer atenção.</li>'; return; }
        projetos.forEach(projeto => {
            let badgeClass = projeto.tipo_atencao === 'Atrasado' ? 'text-bg-danger' : 'text-bg-secondary';
            let motivo = projeto.tipo_atencao === 'Atrasado' ? `Prazo expirou em ${new Date(projeto.data_entrega).toLocaleDateString('pt-BR')}.` : (projeto.descricao || 'Sem detalhes.');
            listaElement.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-start"> <div> <span class="badge ${badgeClass}">${projeto.tipo_atencao}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="d-block text-white-50 ms-2">${motivo}</small> </div> <a href="#" class="btn btn-sm btn-outline-light mt-1 btn-ver-projeto" data-projeto-codigo="${projeto.codigo_projeto}">Ver</a> </li>`;
        });
    } catch (error) { listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar.</li>'; }
}

async function carregarUltimasAtualizacoes() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const listaElement = document.getElementById('listaUltimasAtualizacoes'); if (!listaElement) return;
    listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Carregando...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/atualizacoes`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        const projetos = await response.json(); listaElement.innerHTML = '';
        if (!response.ok || projetos.length === 0) { listaElement.innerHTML = '<li class="list-group-item text-center text-white-50">Nenhuma atualização recente.</li>'; return; }
        projetos.forEach(projeto => {
            let badgeClass = projeto.status === 'Concluído' ? 'text-bg-success' : (projeto.status === 'Em Montagem' ? 'text-bg-primary' : 'text-bg-warning');
            listaElement.innerHTML += `<li class="list-group-item"> <span class="badge ${badgeClass}">${projeto.status}</span> <strong class="ms-2">${projeto.codigo_projeto} - ${projeto.nome_empresa}</strong> <small class="text-white-50 d-block">${calcularTempoAtras(projeto.data_cadastro)}</small> </li>`;
        });
    } catch (error) { listaElement.innerHTML = '<li class="list-group-item text-center text-danger">Erro ao carregar.</li>'; }
}

async function carregarPrazosProximos() {
    const token = localStorage.getItem("authToken"); if (!token) return;
    const tabelaBody = document.getElementById('tabelaPrazosBody'); if (!tabelaBody) return;
    tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50">Carregando...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/prazos`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-cache' });
        const projetos = await response.json(); tabelaBody.innerHTML = '';
        if (!response.ok || projetos.length === 0) { tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-white-50">Nenhum prazo próximo.</td></tr>'; return; }
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        projetos.forEach(projeto => {
            const dataEntrega = new Date(projeto.data_entrega); dataEntrega.setHours(0 - (dataEntrega.getTimezoneOffset() / 60), 0, 0, 0);
            const diffDays = Math.ceil((dataEntrega - hoje) / (1000 * 60 * 60 * 24));
            let pClass = diffDays < 0 ? 'border-danger text-danger' : (diffDays <= 3 ? 'border-warning text-warning' : 'border-primary text-primary');
            let pText = diffDays < 0 ? 'Atrasado' : (diffDays === 0 ? 'Vence Hoje' : `Em ${diffDays} dias`);
            tabelaBody.innerHTML += `<tr> <td>${projeto.codigo_projeto}</td> <td>${projeto.nome_empresa}</td> <td class="text-end"> <span class="badge rounded-pill ${pClass}">${pText}</span> </td> </tr>`;
        });
    } catch (error) { tabelaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar.</td></tr>'; }
}
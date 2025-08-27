/* ============================================= */
/* LÓGICA GLOBAL (SEGURANÇA E PERSONALIZAÇÃO)    */
/* ============================================= */
// Função que executa assim que a página termina de carregar
document.addEventListener('DOMContentLoaded', function() {
  // Verifica se a página atual NÃO é uma das páginas de acesso
  const paginasDeAcesso = ['login.html', 'cadastro.html', 'esqueci-senha.html'];
  const paginaAtual = window.location.pathname.split('/').pop();

  if (paginasDeAcesso.includes(paginaAtual)) {
      return; // Se for, não faz nada
  }

  // Se for qualquer outra página, tenta carregar os dados do usuário
  carregarDadosUsuario();
});

async function carregarDadosUsuario() {
  const token = localStorage.getItem('authToken');

  if (!token) {
      alert('Você não está logado. Por favor, faça o login.');
      window.location.href = 'login.html';
      return;
  }

  try {
      const response = await fetch('http://localhost:3001/api/usuarios/perfil', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });

      if (response.ok) {
          const usuario = await response.json();
          const elementoNome = document.getElementById('nomeUsuarioLogado');
          if (elementoNome) {
              elementoNome.textContent = usuario.nome;
          }
      } else {
          localStorage.removeItem('authToken');
          window.location.href = 'login.html';
      }
  } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
  }
}


/* ============================================= */
/* LÓGICA DA TELA DE CADASTRO                    */
/* ============================================= */
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
cadastroForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  const nome = document.getElementById('nome').value;
  const numero_registro = document.getElementById('numero_registro').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const confirmarSenha = document.getElementById('confirmarSenha').value;

  if (senha !== confirmarSenha) {
    alert('As senhas não coincidem!');
    return;
  }
  try {
    const response = await fetch('http://localhost:3001/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, numero_registro, email, senha }),
    });
    const data = await response.json();
    if (response.status === 201) {
      alert('Usuário criado com sucesso! Por favor, faça o login.');
      window.location.href = 'login.html';
    } else {
      throw new Error(data.message || 'Erro ao cadastrar usuário.');
    }
  } catch (error) {
    alert(error.message);
  }
});
}


/* ============================================= */
/* LÓGICA DA TELA DE LOGIN                       */
/* ============================================= */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
loginForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  const numero_registro = document.getElementById('numero_registro').value;
  const senha = document.getElementById('senha').value;
  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_registro, senha }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      alert('Login realizado com sucesso!');
      window.location.href = 'dashboard.html';
    } else {
      throw new Error(data.message || 'Erro ao fazer login.');
    }
  } catch (error) {
    alert(error.message);
  }
});
}


/* ============================================= */
/* LÓGICA DA TELA DE PROJETOS (VERSÃO COMPLETA E UNIFICADA) */
/* ============================================= */
const tabelaProjetosCorpo = document.getElementById('projetosTabela');

if (tabelaProjetosCorpo) {
  
  // ----- PARTE 1: Lógica do Painel de Detalhes -----
  tabelaProjetosCorpo.addEventListener('click', function(event) {
      const linhaClicada = event.target.closest('tr');
      if (!linhaClicada || !linhaClicada.dataset.description) return;

      const detailsCard = document.getElementById('projectDetailsCard');
      const projectCodeDetail = document.getElementById('projectCodeDetail');
      const projectCompanyDetail = document.getElementById('projectCompanyDetail');
      const projectDescriptionDetail = document.getElementById('projectDescriptionDetail');
      const projectAssemblerDetail = document.getElementById('projectAssemblerDetail');
      const projectStatusDetail = document.getElementById('projectStatusDetail');

      projectCodeDetail.innerText = `Detalhes do Projeto: ${linhaClicada.cells[0].textContent}`;
      projectCompanyDetail.innerText = linhaClicada.cells[1].textContent;
      projectDescriptionDetail.innerText = linhaClicada.dataset.description;
      projectAssemblerDetail.innerText = linhaClicada.dataset.montador;
      projectStatusDetail.innerHTML = linhaClicada.cells[4].innerHTML;
      detailsCard.classList.remove('d-none');
  });

  // ----- PARTE 2: Lógica para Carregar os Projetos da API -----
  async function carregarProjetos() {
      const token = localStorage.getItem('authToken');
      try {
          const response = await fetch('http://localhost:3001/api/projetos', {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Falha ao buscar projetos.');
          
          const projetos = await response.json();
          tabelaProjetosCorpo.innerHTML = ''; 

          if (projetos.length === 0) {
              tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-white-50">Nenhum projeto cadastrado ainda.</td></tr>`;
              return;
          }

          projetos.forEach(projeto => {
              const dataCadastro = new Date(projeto.data_cadastro).toLocaleDateString('pt-BR');
              const dataEntrega = projeto.data_entrega ? new Date(projeto.data_entrega).toLocaleDateString('pt-BR') : 'N/A';
              
              const novaLinhaHTML = `
                  <tr data-montador="${projeto.montador.nome}" data-description="${projeto.descricao || 'Sem descrição.'}">
                      <td>${projeto.codigo_projeto}</td>
                      <td>${projeto.nome_empresa}</td>
                      <td>${dataCadastro}</td>
                      <td>${dataEntrega}</td>
                      <td class="text-center"><span class="badge rounded-pill border border-primary text-primary">${projeto.status}</span></td>
                      <td class="text-end">
                          <a href="#" class="btn btn-sm btn-outline-light me-2"><i class="fas fa-edit"></i></a>
                          <a href="#" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash-alt"></i></a>
                      </td>
                  </tr>
              `;
              tabelaProjetosCorpo.innerHTML += novaLinhaHTML;
          });
      } catch (error) {
          console.error('Erro:', error);
          tabelaProjetosCorpo.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
      }
  }

  // ----- PARTE 3: Lógica para o Modal de Adicionar Projeto -----
  const addProjectModal = document.getElementById('addProjectModal');
  const addProjectForm = document.getElementById('addProjectForm');
  
  addProjectModal.addEventListener('show.bs.modal', async () => {
      try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('http://localhost:3001/api/montadores', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Falha ao buscar montadores.');
          const montadores = await response.json();
          
          const montadorSelect = document.getElementById('montadorResponsavel');
          montadorSelect.innerHTML = '<option value="">Selecione...</option>';
          montadores.forEach(montador => {
              const option = `<option value="${montador.id}">${montador.nome}</option>`;
              montadorSelect.innerHTML += option;
          });

          const campoDataCadastro = document.getElementById('dataCadastro');
          const hoje = new Date();
          // Formato AAAA-MM-DD
          campoDataCadastro.value = hoje.toISOString().split('T')[0];
      } catch (error) {
          console.error(error);
          alert(error.message);
      }
  });

  addProjectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const dadosDoProjeto = {
          codigo_projeto: document.getElementById('codigoProjeto').value,
          nome_empresa: document.getElementById('nomeEmpresa').value,
          status: document.getElementById('statusInicial').value,
          descricao: document.getElementById('descricao').value,
          data_cadastro: document.getElementById('dataCadastro').value,
          data_entrega: document.getElementById('dataEntrega').value,
          montadorId: document.getElementById('montadorResponsavel').value,
      };
      try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('http://localhost:3001/api/projetos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(dadosDoProjeto)
          });
          if (!response.ok) {
              const erro = await response.json();
              throw new Error(erro.message || 'Erro ao criar projeto.');
          }
          alert('Projeto criado com sucesso!');
          carregarProjetos();
          const modalInstance = bootstrap.Modal.getInstance(addProjectModal);
          modalInstance.hide();
          addProjectForm.reset();
      } catch (error) {
          console.error(error);
          alert(error.message);
      }
  });

  // ----- PARTE 4: O pontapé inicial -----
  carregarProjetos();
}
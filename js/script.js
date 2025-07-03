document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.classList.add('opacity-0');
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.remove();
        }, { once: true });
    }, 2000);

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        let bgColor, iconSvg;
        switch(type) {
            case 'success': bgColor = 'bg-emerald-500'; iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`; break;
            case 'error': bgColor = 'bg-rose-500'; iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>`; break;
            default: bgColor = 'bg-sky-500'; iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        }
        toast.className = `flex items-center gap-4 text-white font-bold p-4 rounded-lg shadow-2xl transition-all duration-300 ${bgColor} toast-enter`;
        toast.innerHTML = `${iconSvg} <span>${message}</span>`;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-enter-active');
        });
        setTimeout(() => {
            toast.classList.remove('toast-enter-active');
            toast.classList.add('toast-exit-active');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }
    
    const allDomRefs = {
        corpoPrincipal: document.getElementById('corpo-principal'),
        conteudoPrincipal: document.getElementById('conteudo-principal'),
        modalContent: document.getElementById('modal-content'),
        uploadInput: document.getElementById('upload-json'),
        salvarBtn: document.getElementById('salvar-json'),
        listaPendentesContainer: document.getElementById('lista-pendentes'),
        listaConcluidasContainer: document.getElementById('lista-concluidas'),
        visaoDetalhe: document.getElementById('visao-detalhe'),
        btnVoltar: document.getElementById('btn-voltar'),
        novoTituloInput: document.getElementById('novo-titulo-atividade'),
        btnAdicionar: document.getElementById('btn-adicionar-atividade'),
        btnNovaLista: document.getElementById('btn-nova-lista'),
        travaConteudoCheckbox: document.getElementById('trava-conteudo'),
        detalheTitulo: document.getElementById('detalhe-titulo'),
        detalheDescricaoInput: document.getElementById('detalhe-descricao-input'),
        detalheRecursosLista: document.getElementById('detalhe-recursos-lista'),
        btnAdicionarRecurso: document.getElementById('btn-adicionar-recurso'),
        formNovoRecurso: document.getElementById('form-novo-recurso'),
        novoRecursoTipoInput: document.getElementById('novo-recurso-tipo'),
        novoRecursoNomeInput: document.getElementById('novo-recurso-nome'),
        novoRecursoUrlInput: document.getElementById('novo-recurso-url'),
        btnRemoverAtividadeDetalhe: document.getElementById('btn-remover-atividade-detalhe'),
    };
    
    let atividadesData = [];
    let listaTravada = false;
    let atividadeSendoEditadaId = null;
    
    function salvarEstadoLocalmente() {
        const estado = {
            travado: listaTravada,
            atividades: atividadesData
        };
        localStorage.setItem('dashboardData', JSON.stringify(estado));
    }

    function carregarEstadoLocal() {
        const dadosSalvos = localStorage.getItem('dashboardData');
        if (dadosSalvos) {
            try {
                const estado = JSON.parse(dadosSalvos);
                atividadesData = estado.atividades || [];
                listaTravada = estado.travado || false;
                allDomRefs.travaConteudoCheckbox.checked = listaTravada;
                renderizarListas();
                showToast('Sua última sessão foi restaurada!', 'success');
            } catch (e) {
                atividadesData = [];
                listaTravada = false;
                renderizarListas();
            }
        } else {
            renderizarListas();
        }
    }
    
    carregarEstadoLocal();
    
    allDomRefs.uploadInput.addEventListener('change', carregarArquivo);
    allDomRefs.salvarBtn.addEventListener('click', salvarAlteracoes);
    allDomRefs.btnAdicionar.addEventListener('click', adicionarNovaAtividade);
    allDomRefs.btnVoltar.addEventListener('click', ocultarDetalhes);
    allDomRefs.btnAdicionarRecurso.addEventListener('click', adicionarNovoRecurso);
    allDomRefs.travaConteudoCheckbox.addEventListener('change', () => { listaTravada = allDomRefs.travaConteudoCheckbox.checked; salvarEstadoLocalmente(); });
    allDomRefs.btnNovaLista.addEventListener('click', (e) => handleConfirmClick(e.currentTarget, criarNovaLista));
    allDomRefs.btnRemoverAtividadeDetalhe.addEventListener('click', (e) => handleConfirmClick(e.currentTarget, () => {
        removerAtividade(atividadeSendoEditadaId);
        ocultarDetalhes();
    }));

    function handleConfirmClick(button, callback) {
        if (listaTravada && !button.id.includes('nova-lista')) {
            showToast('Ações destrutivas estão desabilitadas para listas travadas.', 'error');
            return;
        }
        const iconWrapper = button.querySelector('.icon-wrapper');
        const textWrapper = button.querySelector('.text-wrapper');
        if (!button.dataset.confirming) {
            button.dataset.confirming = 'true';
            if (textWrapper) button.dataset.originalText = textWrapper.textContent;
            if (iconWrapper) button.dataset.originalIcon = iconWrapper.innerHTML;
            const originalClasses = Array.from(button.classList).filter(c => c.startsWith('bg-') || c.startsWith('hover:bg-')).join(' ');
            button.dataset.originalClasses = originalClasses;
            button.className = button.className.replace(originalClasses, 'bg-rose-600 hover:bg-rose-700');
            if (textWrapper) textWrapper.textContent = "Confirmar?";
            if (iconWrapper) iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
            const timeoutId = setTimeout(() => {
                if (button.dataset.confirming === 'true') {
                    delete button.dataset.confirming;
                    button.className = button.className.replace('bg-rose-600 hover:bg-rose-700', button.dataset.originalClasses);
                    if (textWrapper) textWrapper.textContent = button.dataset.originalText;
                    if (iconWrapper) iconWrapper.innerHTML = button.dataset.originalIcon;
                }
            }, 4000);
            button.dataset.timeoutId = timeoutId.toString();
        } else {
            clearTimeout(parseInt(button.dataset.timeoutId));
            delete button.dataset.confirming;
            button.className = button.className.replace('bg-rose-600 hover:bg-rose-700', button.dataset.originalClasses);
            if (textWrapper) textWrapper.textContent = button.dataset.originalText;
            if (iconWrapper) iconWrapper.innerHTML = button.dataset.originalIcon;
            callback();
        }
    }
    
    function criarCardAtividade(atividade) {
        const card = document.createElement('div');
        const recursos = atividade.detalhes.recursos || [];
        const concluidos = recursos.filter(r => r.completado).length;
        const total = recursos.length;
        let progressoHtml = `<div class="text-sm text-slate-500">Sem sub-tarefas</div>`;
        if (total > 0) progressoHtml = `<div class="text-sm font-semibold ${atividade.completada ? 'text-emerald-400' : 'text-sky-400'}">${concluidos} de ${total} concluídos</div>`;
        card.className = `card-atividade bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-lg hover:border-sky-500 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group relative`;
        card.dataset.id = atividade.id;
        card.innerHTML = `<div class="absolute top-2 right-2 campo-editavel"><button class="btn-remover p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><span class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></span></button></div><div class="card-content cursor-pointer"><h4 class="font-bold text-white text-lg mb-2 group-hover:text-sky-400 transition-colors pointer-events-none">${atividade.titulo}</h4><p class="text-sm text-slate-400 mb-4 pointer-events-none">${(atividade.detalhes.descricao || "Sem descrição...").substring(0, 100)}</p></div><div class="flex justify-between items-center mt-2">${progressoHtml}</div>`;
        return card;
    }

    function adicionarListenersAosCards() {
         document.querySelectorAll('.card-atividade').forEach(card => {
            card.addEventListener('click', (e) => {
                const removeButton = e.target.closest('.btn-remover');
                if (removeButton) {
                    e.stopPropagation();
                    if (listaTravada) {
                        showToast('Não é possível remover itens de uma lista travada.', 'error');
                        return;
                    }
                    handleConfirmClick(removeButton, () => removerAtividade(card.dataset.id));
                } else {
                    mostrarDetalhes(card.dataset.id);
                }
            });
        });
    }
    
    function renderizarListas() {
        const avisoExistente = document.getElementById('aviso-travado');
        if(avisoExistente) avisoExistente.remove();
        if(listaTravada) {
            const avisoDiv = document.createElement('div');
            avisoDiv.id = 'aviso-travado';
            avisoDiv.className = 'flex items-center gap-3 p-4 mb-6 text-amber-200 bg-amber-900/50 border-l-4 border-amber-500 rounded-r-lg';
            avisoDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-amber-400"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg><p><span class="font-bold">Modo Leitura:</span> Este material de estudo foi definido como inalterável pelo criador.</p>`;
            allDomRefs.conteudoPrincipal.prepend(avisoDiv);
        }
        atualizarProgressoAtividades();
        const fragmentoPendente = document.createDocumentFragment(), fragmentoConcluido = document.createDocumentFragment();
        atividadesData.forEach(a => {
            const card = criarCardAtividade(a);
            if (a.completada) fragmentoConcluido.appendChild(card);
            else fragmentoPendente.appendChild(card);
        });
        allDomRefs.listaPendentesContainer.innerHTML = '';
        allDomRefs.listaConcluidasContainer.innerHTML = '';
        if (fragmentoPendente.childElementCount === 0) allDomRefs.listaPendentesContainer.innerHTML = `<p class="col-span-full text-slate-500">Nenhuma atividade pendente. Ótimo trabalho!</p>`;
        else allDomRefs.listaPendentesContainer.appendChild(fragmentoPendente);
        if (fragmentoConcluido.childElementCount === 0) allDomRefs.listaConcluidasContainer.innerHTML = `<p class="col-span-full text-slate-500">Nenhuma atividade concluída ainda.</p>`;
        else allDomRefs.listaConcluidasContainer.appendChild(fragmentoConcluido);
        adicionarListenersAosCards();
        atualizarTravaUI();
    }

    function removerAtividade(id) {
        atividadesData = atividadesData.filter(a => a.id != id);
        renderizarListas();
        salvarEstadoLocalmente();
        showToast('Atividade removida.', 'success');
    }

    function atualizarProgressoAtividades() {
        atividadesData.forEach(atividade => {
            const recursos = atividade.detalhes.recursos || [];
            if (recursos.length > 0) atividade.completada = recursos.every(r => r.completado);
            else if (typeof atividade.completada === 'undefined') atividade.completada = false;
        });
    }
    
    function mostrarDetalhes(id) {
        const atividade = atividadesData.find(a => a.id == id);
        if (!atividade) return;
        atividadeSendoEditadaId = id;
        allDomRefs.detalheTitulo.textContent = atividade.titulo;
        allDomRefs.detalheDescricaoInput.value = atividade.detalhes.descricao;
        renderizarListaRecursos();
        allDomRefs.visaoDetalhe.classList.remove('hidden');
        requestAnimationFrame(() => {
            allDomRefs.visaoDetalhe.classList.remove('opacity-0');
            allDomRefs.modalContent.classList.remove('scale-95');
        });
        atualizarTravaUI();
    }

    function ocultarDetalhes() {
        if(atividadeSendoEditadaId) {
            const atividade = atividadesData.find(a => a.id == atividadeSendoEditadaId);
            if (atividade) atividade.detalhes.descricao = allDomRefs.detalheDescricaoInput.value;
        }
        atividadeSendoEditadaId = null;
        allDomRefs.visaoDetalhe.classList.add('opacity-0');
        allDomRefs.modalContent.classList.add('scale-95');
        allDomRefs.visaoDetalhe.addEventListener('transitionend', () => allDomRefs.visaoDetalhe.classList.add('hidden'), { once: true });
        renderizarListas();
        salvarEstadoLocalmente();
    }

    function renderizarListaRecursos() {
        const atividade = atividadesData.find(a => a.id == atividadeSendoEditadaId);
        allDomRefs.detalheRecursosLista.innerHTML = '';
        if (!atividade || !atividade.detalhes.recursos) return;
        atividade.detalhes.recursos.forEach((recurso, index) => {
            const li = document.createElement('li');
            li.className = "bg-slate-700/50 p-3 rounded-md flex items-center justify-between";
            li.innerHTML = `<div class="flex items-center gap-3"><input type="checkbox" data-index="${index}" class="campo-editavel w-5 h-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500" ${recurso.completado ? 'checked' : ''}><div class="flex items-center"><span class="font-semibold text-white">${recurso.nome}</span><span class="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-full ml-2">${recurso.tipo}</span></div></div><a href="${recurso.url}" target="_blank" class="text-sky-400 hover:text-sky-300 font-medium p-1 rounded-full hover:bg-sky-500/10"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25m-4.5 0h4.5m-4.5 0a2.25 2.25 0 01-2.25-2.25V8.25m2.25 2.25a2.25 2.25 0 00-2.25-2.25H6.375c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125h2.25a2.25 2.25 0 002.25-2.25z" /></svg></a>`;
            allDomRefs.detalheRecursosLista.appendChild(li);
        });
        allDomRefs.detalheRecursosLista.querySelectorAll('input[type="checkbox"]').forEach(check => check.addEventListener('change', (e) => toggleRecursoCompletado(e.target.dataset.index)));
    }

    function toggleRecursoCompletado(index) {
        const atividade = atividadesData.find(a => a.id == atividadeSendoEditadaId);
        if (atividade && atividade.detalhes.recursos[index]) {
            atividade.detalhes.recursos[index].completado = !atividade.detalhes.recursos[index].completado;
            salvarEstadoLocalmente();
        }
    }

    function carregarArquivo(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dadosCarregados = JSON.parse(e.target.result);
                if (dadosCarregados && typeof dadosCarregados === 'object' && Array.isArray(dadosCarregados.atividades)) {
                    atividadesData = dadosCarregados.atividades;
                    listaTravada = dadosCarregados.travado || false;
                    allDomRefs.travaConteudoCheckbox.checked = listaTravada;
                    renderizarListas();
                    salvarEstadoLocalmente();
                    showToast('Lista carregada com sucesso!', 'success');
                } else { throw new Error("Formato do JSON inválido."); }
            } catch (error) { showToast("Erro ao ler o arquivo: " + error.message, 'error'); }
        };
        reader.readAsText(file);
    }

    function salvarAlteracoes() {
        salvarEstadoLocalmente();
        const dataParaSalvar = { travado: listaTravada, atividades: atividadesData };
        const jsonString = JSON.stringify(dataParaSalvar, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'atividades_dashboard.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast("Arquivo salvo e download iniciado!", 'success');
    }

    function adicionarNovaAtividade() {
        const titulo = allDomRefs.novoTituloInput.value.trim();
        if (titulo === "") { showToast("Digite um título para a atividade.", 'error'); return; }
        atividadesData.push({ id: Date.now(), titulo: titulo, completada: false, detalhes: { descricao: "", recursos: [] } });
        renderizarListas();
        salvarEstadoLocalmente();
        allDomRefs.novoTituloInput.value = "";
        allDomRefs.novoTituloInput.focus();
        showToast(`Atividade "${titulo}" adicionada.`, 'info');
    }
    
    function criarNovaLista() {
        atividadesData = [];
        listaTravada = false;
        allDomRefs.travaConteudoCheckbox.checked = false;
        allDomRefs.uploadInput.value = "";
        renderizarListas();
        localStorage.removeItem('dashboardData');
        showToast('Nova lista criada.', 'info');
    }

    function adicionarNovoRecurso() {
        const tipo = allDomRefs.novoRecursoTipoInput.value.trim();
        const nome = allDomRefs.novoRecursoNomeInput.value.trim();
        const url = allDomRefs.novoRecursoUrlInput.value.trim();
        if (!tipo || !nome || !url) { showToast("Preencha todos os campos do recurso.", 'error'); return; }
        const atividade = atividadesData.find(a => a.id == atividadeSendoEditadaId);
        if (atividade) {
            if(!atividade.detalhes.recursos) atividade.detalhes.recursos = [];
            atividade.detalhes.recursos.push({ tipo, nome, url, completado: false });
            renderizarListaRecursos();
            salvarEstadoLocalmente();
            allDomRefs.novoRecursoTipoInput.value = ''; allDomRefs.novoRecursoNomeInput.value = ''; allDomRefs.novoRecursoUrlInput.value = '';
        }
    }
    
    function atualizarTravaUI() {
        const isTravado = listaTravada;
        document.querySelectorAll('.campo-editavel').forEach(el => {
            el.querySelectorAll('input, textarea, button').forEach(child => { child.disabled = isTravado; });
        });
        allDomRefs.formNovoRecurso.classList.toggle('hidden', isTravado);
    }
});

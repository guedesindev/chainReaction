/**
 * Tutorial.js
 * 
 * Responsabilidade: Gerenciar os slides do tutorial interativo,
 * controle de navegação e persistência de visualização no localStorage.
 */

export default class Tutorial {
    constructor() {
        this.STORAGE_KEY = 'chain_reaction_tutorial_seen';
        this.currentSlideIndex = 0;

        // Definição dos conteúdos explicativos de cada slide
        this.slides = [
            {
                title: "🎯 Objetivo do Jogo",
                text: "O seu objetivo é **dominar o tabuleiro inteiro** eliminando todas as esferas do adversário através de reações em cadeia!",
                demoHTML: `
          <div class="demo-box">
            <div class="orb red" style="width:24px; height:24px;"></div>
            <span style="color:#94a3b8;">VS</span>
            <div class="orb blue" style="width:24px; height:24px;"></div>
          </div>
        `
            },
            {
                title: "💥 Capacidade das Células",
                text: "Cada casa tem um limite antes de explodir:<br>• <b>Cantos:</b> Explodem com 2 esferas.<br>• <b>Bordas:</b> Explodem com 3 esferas.<br>• <b>Centro:</b> Explodem com 4 esferas.",
                demoHTML: `
          <div class="demo-box" style="font-size: 0.85rem; color: #38bdf8;">
            <div>📐 Canto: máx 1</div>
            <div>↔️ Borda: máx 2</div>
            <div>➕ Centro: máx 3</div>
          </div>
        `
            },
            {
                title: "⚡ Reação em Cadeia!",
                text: "Quando uma casa explode, ela **esvazia** e envia esferas para as casas vizinhas, **convertendo as esferas inimigas** para a sua cor!",
                demoHTML: `
          <div class="demo-box">
            <div class="orb red" style="width:20px; height:20px;"></div>
            <span style="color:#ef4444; font-weight:bold;">➔ EXPLODE ➔</span>
            <div class="orb red" style="width:20px; height:20px;"></div>
            <div class="orb red" style="width:20px; height:20px;"></div>
          </div>
        `
            }
        ];

        this.cacheDOM();
    }

    /**
     * Mapeia os elementos do DOM necessários para o tutorial.
     */
    cacheDOM() {
        this.modal = document.getElementById('tutorial-modal');
        this.slideContainer = document.getElementById('tutorial-slide-container');
        this.dotsContainer = document.getElementById('tutorial-dots');
        this.btnPrev = document.getElementById('btn-prev-slide');
        this.btnNext = document.getElementById('btn-next-slide');
        this.btnClose = document.getElementById('btn-close-tutorial');
        this.btnHelp = document.getElementById('btn-help');
    }

    /**
     * Inicializa os escutadores de evento do tutorial.
     */
    init() {
        if (!this.modal) return;

        this.btnHelp.addEventListener('click', () => this.open());
        this.btnClose.addEventListener('click', () => this.close());

        this.btnPrev.addEventListener('click', () => this.prevSlide());
        this.btnNext.addEventListener('click', () => this.nextSlide());

        // Se for a primeira visita do jogador, abre o tutorial automaticamente!
        if (!this.hasSeenTutorial()) {
            this.open();
        }
    }

    /**
     * Verifica se o usuário já visualizou o tutorial no passado.
     * @returns {boolean}
     */
    hasSeenTutorial() {
        return localStorage.getItem(this.STORAGE_KEY) === 'true';
    }

    /**
     * Marca no localStorage que o usuário já viu o tutorial.
     */
    markAsSeen() {
        localStorage.setItem(this.STORAGE_KEY, 'true');
    }

    /**
     * Abre o modal do tutorial.
     */
    open() {
        this.currentSlideIndex = 0;
        this.renderSlide();
        this.modal.classList.remove('hidden');
    }

    /**
     * Esconde o modal do tutorial e grava a preferência.
     */
    close() {
        this.modal.classList.add('hidden');
        this.markAsSeen();
    }

    /**
     * Avança para o próximo slide ou conclui o tutorial.
     */
    nextSlide() {
        if (this.currentSlideIndex < this.slides.length - 1) {
            this.currentSlideIndex++;
            this.renderSlide();
        } else {
            this.close(); // Se estava no último slide, fecha o tutorial
        }
    }

    /**
     * Volta para o slide anterior.
     */
    prevSlide() {
        if (this.currentSlideIndex > 0) {
            this.currentSlideIndex--;
            this.renderSlide();
        }
    }

    /**
     * Renderiza o conteúdo do slide atual e atualiza os botões e pontos.
     */
    renderSlide() {
        const slide = this.slides[this.currentSlideIndex];

        this.slideContainer.innerHTML = `
      <div class="tutorial-slide">
        <h3 class="slide-title">${slide.title}</h3>
        ${slide.demoHTML}
        <p class="slide-text">${slide.text}</p>
      </div>
    `;

        // Atualiza estado dos botões
        this.btnPrev.style.visibility = this.currentSlideIndex === 0 ? 'hidden' : 'visible';
        this.btnNext.textContent = this.currentSlideIndex === this.slides.length - 1 ? 'Começar Jogo!' : 'Próximo';

        // Renderiza os pontos de paginação (dots)
        this.renderDots();
    }

    /**
     * Renderiza os pontos indicadores da página atual.
     */
    renderDots() {
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (index === this.currentSlideIndex) dot.classList.add('active');
            this.dotsContainer.appendChild(dot);
        });
    }
}
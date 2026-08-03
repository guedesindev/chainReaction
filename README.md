# ⚛️ Chain Reaction Web (Reação em Cadeia)

Um jogo de estratégia e tática para navegador, desenvolvido em **JavaScript Vanilla**, com foco em alta performance, arquitetura orientada a eventos e uma experiência de usuário imersiva (*Game Juice*).

![Status do Projeto](https://img.shields.io/badge/Status-Conclu%C3%ADdo-brightgreen)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue)

👉 **[Clique aqui para Jogar Agora (GitHub Pages)](https://guedesindev.github.io/chainReaction/)**

---

## 📖 Sobre o Jogo

O **Chain Reaction** é um jogo de tabuleiro baseado em turnos para dois jogadores. O objetivo é dominar o tabuleiro eliminando todas as esferas do adversário por meio de **reações em cadeia**.

### 🎮 Regras Básicas

1. Cada célula possui uma **capacidade crítica** de esferas (calculada com base em seus vizinhos adjacentes):
   - **Cantos:** Capacidade 1 (explode ao atingir 2).
   - **Bordas:** Capacidade 2 (explode ao atingir 3).
   - **Centro:** Capacidade 3 (explode ao atingir 4).
2. Ao atingir o limite, a célula **explode**, distribuindo esferas para as quatro células vizinhas e convertendo o domínio das células afetadas para o jogador atual.
3. Vence o jogador que eliminar todas as peças do oponente!

---

## ✨ Destaques de UX & Game Juice

Para proporcionar uma experiência tátil e responsiva (especialmente em dispositivos móveis), o projeto conta com:

- 🎓 **Tutorial Interativo Modal:** Apresentação dinâmica passo a passo armazenada no `localStorage` do navegador para novos jogadores.
- 🔊 **Efeitos Sonoros Sintetizados (Web Audio API):** Som de "Pop" e "Explosão" gerados nativamente via código sem carregamento de arquivos externos, além de uma fanfarra de vitória!
- 📳 **Resposta Tátil (Web Vibration API):** Microvibrações no dispositivo a cada jogada e padrões compostos durante explosões e vitórias.
- 📱 **Design Mobile-First Responsivo:** Layout adaptável em CSS Grid e Flexbox com feedbacks visuais dinâmicos de turno.
- 🫨 **Screen Shake FX:** Impacto visual da tela durante reações em cadeia intensas.

---

## 🏗️ Arquitetura do Sistema

O projeto foi construído do zero utilizando **JavaScript Moderno (ES6+)** com separação clara de responsabilidades:

```
                  [EventManager] (Pub/Sub)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    [Board.js]       [UIManager.js]     [AudioManager.js]
(Regra de Negócio)    (Render/DOM)      (Áudio & Vibração)
```

- **Publisher/Subscriber (`EventManager.js`):** Desacoplamento total entre o motor do jogo (Engine) e a camada de interface visual (DOM).
- **Processamento Assíncrono (`Board.js`):** Loop de explosões controlado via `async/await` e `Promises`, permitindo animações suaves sem travar a renderização.
- **Armazenamento Local (`Tutorial.js`):** Controle de preferências do usuário sem necessidade de backend.

---

## 📁 Estrutura de Arquivos

```text

├── index.html          # Estrutura HTML principal e modais
├── style.css           # Estilização responsiva, variáveis CSS e animações
├── scripts
    ├── main.js             # Ponto de entrada do jogo (bootstrap)
    ├── EventManager.js     # Barramento central de eventos (Pub/Sub)
    ├── Board.js            # Lógica das células, matriz e reações em cadeia
    ├── AudioManager.js     # Gerenciamento de efeitos sonoros e vibração tátil
    └── Tutorial.js          # Controle da experiência interativa de onboarding
```

# 🚀 Como Executar Localmente

Como o projeto utiliza módulos nativos do ES6 (import/export), basta rodar um servidor HTTP simples localmente:

Clone o repositório:

```Bash
git clone git@github.com:guedesindev/chainReaction.git

cd chainReaction
```

Execute um servidor local:

Com a extensão Live Server no VS Code, abra o index.html e clique em Go Live.

Ou via terminal com Python:

```bash
python -m http.server 8000
```

Abra o navegador em <http://localhost:8000>.

# 📄 Licença

Este projeto está sob a licença MIT. Sinta-se à vontade para estudar, clonar e aprimorar!

Desenvolvido por 👩🏽‍💻 **NandoGuedes** como parte da jornada de desenvolvimento Full-Stack.

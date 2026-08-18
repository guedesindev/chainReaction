/**
 * AudioManager.js
 * 
 * Responsabilidade: Gerenciar efeitos sonoros via Web Audio API
 * e respostas táticas de vibração via Web Vibration API.
 */

export default class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.isMuted = false;
        this.bgmElement = null;
    }

    /**
     * Tocar música de fundo, arquivo estático em loop
     * @param {string} src - caminho para o arquivo de áudio
     * @param {number} volume - volume entre 0 e 1
     */
    playBackgroundMusic(src, volume = 0.15) {
        if (!this.bgmElement) {
            this.bgmElement = new Audio(src);
            this.bgmElement.loop = true;
            this.bgmElement.volume = volume;
        }

        if (this.isMuted) return;

        this.bgmElement.play().catch(e => {
            console.warn('[⚠️ BGM] Aguardando interação do usuário para iniciar a música. ', e)
        });
    }

    stopBackgroundMusic() {
        if (this.bgmElement) {
            this.bgmElement.pause();
            this.bgmElement.currentTime = 0;
        }
    }

    toogleMute() {
        this.isMuted = !this.isMuted;
        if (this.bgmElement) {
            this.bgmElement.muted = this.isMuted;
        }
        return this.isMuted;
    }

    /**
     * Inicializa e garante o desbloqueio do AudioContext no navegador.
     * @return {Promise} Garantir que o contexto esteja ativo antes de tocar.
     */
    async ensureAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try {
                await this.audioCtx.resume();
            } catch (e) {
                console.warn('Aguardando interação do usuário para ativar o áudio.', e);
            }
        }

        return this.audioCtx;
    }

    /**
     * Toca o som "Pop" ao colocar uma esfera.
     */
    async playPopSound() {
        if (this.isMuted) return;
        const ctx = await this.ensureAudioContext();
        if (!ctx || ctx.state !== 'running') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    /**
     * Toca o som de "Explosão" nas reações em cadeia.
     */
    async playExplosionSound() {
        if (this.isMuted) return;
        const ctx = await this.ensureAudioContext();
        if (!ctx || ctx.state !== 'running') return;

        const now = ctx.currentTime;

        // --------------------------------------------------
        // PARAMETROS DE VARIABILIDADE (Randomização)
        // --------------------------------------------------
        // Helper para gerar número aleatório em um intervalo
        const random = (min, max) => Math.random() * (max - min) + min;

        // 1. Variação de Duração: entre 0.35s e 0.55s
        const duration = random(0.35, 0.55);

        // 2. Variação de Pitch do Sub-Bass: frequência inicial varia entre 120Hz e 190Hz
        const startFreq = random(120, 190);

        // 3. Variação de Filtro do Ruído: frequência inicial entre 600Hz e 1100Hz
        const filterFreq = random(600, 1100);

        // 4. Variação na velocidade de reprodução do ruído (altera o pitch do chiado)
        const noisePlaybackRate = random(0.85, 1.15);

        // --------------------------------------------------
        // 1. CAMADA DE RUÍDO (Randomizada)
        // --------------------------------------------------
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.playbackRate.value = noisePlaybackRate; // Aplica variação de velocidade no ruído

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now); // Frequência inicial aleatória
        filter.frequency.exponentialRampToValueAtTime(20, now + duration);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // --------------------------------------------------
        // 2. CAMADA DE SUB-BASS (Randomizada)
        // --------------------------------------------------
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, now); // Pitch inicial aleatório
        osc.frequency.exponentialRampToValueAtTime(10, now + duration);

        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);

        // Dispara as duas camadas
        noise.start(now);
        osc.start(now);

        noise.stop(now + duration);
        osc.stop(now + duration);
    }

    /**
     * Função assíncrona para garantir sincronia no servidor remoto.
     * Som de 3 notas no acorde C (C, E, G) em arpejo.
     */
    async playVictorySound() {
        if (this.isMuted) return;

        const ctx = await this.ensureAudioContext();
        if (!ctx) return;

        // Frequências das notas: Dó (C5), Mi (E5), Sol (G5)
        const notes = [523.25, 659.25, 783.99];
        const now = ctx.currentTime;

        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + index * 0.12; // Toca uma nota a cada 120ms
            const duration = 0.25;

            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }

    async playDefeatSound() {
        if (this.isMuted) return;

        const ctx = await this.ensureAudioContext();
        if (!ctx) return;

        const notes = [392.00, 349.23, 293.66]; // Sol, Fá, Ré
        const now = ctx.currentTime;

        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            const startTime = now + index * 0.18;
            const duration = 0.35;

            gain.gain.setValueAtTime(0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        })
    }

    vibrateDefeat() {
        this.vibrate([150, 50, 100, 50, 300]);
    }

    /**
     * Vibração no dispositivo móvel.
     * @param {number|Array<number>} pattern 
     */
    vibrate(pattern) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn('[⚠️ Vibração] Erro ao disparar vibração.', e)
            }
        }
    }

    vibrateMove() {
        this.vibrate(25);
    }

    vibrateExplosion() {
        this.vibrate([40, 30, 80]);
    }

    vibrateVictory() {
        this.vibrate([200, 50, 100, 50, 300]);
    }
}

export const audioManager = new AudioManager();
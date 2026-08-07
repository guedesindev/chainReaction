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

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.2);
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
        this.vibrate(12);
    }

    vibrateExplosion() {
        this.vibrate([30, 20, 30]);
    }

    vibrateVictory() {
        this.vibrate([100, 50, 100, 50, 200]);
    }
}

export const audioManager = new AudioManager();
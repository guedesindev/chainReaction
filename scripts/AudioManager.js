class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.isMuted = false;
    }

    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass()
            }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playPopSound() {
        if (this.isMuted) return;
        this.initAudioContext();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

        osc.connect(gain)
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    playExplosionSound() {
        if (this.isMuted) return;
        this.initAudioContext();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
    }

    playVictorySound() {
        if (this.isMuted) return;
        this.initAudioContext();
        if (!this.audioCtx) return;

        // Frequências das notas: Dó (C5), Mi (E5), Sol (G5)
        const notes = [523.25, 659.25, 783.99];
        const now = this.audioCtx.currentTime;

        notes.forEach((freq, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + index * 0.12; // Toca uma nota a cada 120ms
            const duration = 0.25;

            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignora silenciosamente se o dispositivo/navegador proibir vibração
            }
        }
    }

    vibrateMove() {
        this.vibrate(15);
    }

    vibrateExplosion() {
        this.vibrate([40, 30, 40]);
    }

    vibrateVictory() {
        this.vibrate([100, 50, 100, 50, 200])
    }
}

export const audioManager = new AudioManager();
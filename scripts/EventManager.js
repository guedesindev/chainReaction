class EventManager {
    constructor() {
        this.events = {}
    }

    /**
     * Inscreve uma função para ouvir determinado evento
     * @param {string} eventName - Nome do evento
     * @param {Function} fn - Função a ser executada quando o evento for publicado
     */
    subscribe(eventName, fn) {
        if (typeof fn !== 'function') {
            console.warn(`[⚠️ EventManager] O inscrito no evento "${eventName}" precisa ser uma função.`)
            return
        }

        if (!this.events[eventName]) {
            this.events[eventName] = []
        }

        const alreadySubscribed = this.events[eventName].includes(fn)
        if (alreadySubscribed) {
            console.log(`[⚠️ EventManager subscribe] Função já está inscrita no evento ${eventName}`)
            return
        }
        this.events[eventName].push(fn)
    }

    /**
     * Cancela a inscrição de uma função específica de um evento
     * @param {string} eventname - O nome do evento
     * @param {Function} fn - Função que deve ser removida
     */
    unsubscribe(eventname, fn) {
        if (!this.events[eventName]) return;

        this.events[eventName] = this.events[eventName].filter(
            (subscribedFn) => subscribedFn !== fn
        )
    }

    /**
     * Dispara um evento, executando todas as funções inscritas nele.
     * @param {string} eventName - Nome do evento a ser emitido
     * @param {*} data - Os dados que serão passados para as funções inscritas obs.: pode ser null
     */
    publish(eventName, data) {
        if (!this.events[eventName]) {
            console.warn(`[⚠️ EventManger ] O evento ${eventName} não possui inscritos.`)
            return
        }

        this.events[eventName].forEach((fn) => { fn(data) })
    }

    reset(eventName = null) {
        if (eventName) {
            delete this.events[eventName]
        } else {
            this.events = {}
        }
    }
}

const eventManager = new EventManager()
export default eventManager
import { database, set, ref, get } from "./FirebaseConfig.js";

export default class Firebase {
    constructor() {
        this.db = database;
        this.ref = ref;
        this.set = set;
        this.get = get;
    }

    async criarDocumento(referencia, data) {
        await set(referencia, data)
    }

    async obterDados(referencia) {
        const snapshot = await get(referencia)
        if (snapsthot.exists()) {
            return snapshot.val()
        }
        return null;
    }
}
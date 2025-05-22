// Chiavi per il localStorage
const USERS_KEY = 'vibeshare_users';
const CURRENT_USER_KEY = 'vibeshare_current_user';

// Oggetto storage per gestire i dati dell'applicazione
const storage = {
    // Gestione utenti
    getUsers() {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : [];
    },

    setUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    },

    // Gestione utente corrente
    getCurrentUser() {
        const user = localStorage.getItem(CURRENT_USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    },

    // Funzioni di utilità
    clearStorage() {
        localStorage.removeItem(USERS_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}; 
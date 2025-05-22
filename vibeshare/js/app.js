// Funzione per mostrare messaggi di feedback
function showFeedbackMessage(message, type = 'error') {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `feedback-message ${type}`;
    feedbackDiv.textContent = message;
    
    // Rimuovi eventuali messaggi di feedback precedenti
    const oldFeedback = document.querySelector('.feedback-message');
    if (oldFeedback) {
        oldFeedback.remove();
    }
    
    // Inserisci il nuovo messaggio dopo il form del post
    const postForm = document.querySelector('.post-form');
    if (postForm) {
        postForm.insertAdjacentElement('afterend', feedbackDiv);
    }
    
    // Rimuovi il messaggio dopo 3 secondi
    setTimeout(() => {
        feedbackDiv.remove();
    }, 3000);
}

// Funzioni per la gestione della fotocamera
function openCamera(onCapture) {
    const cameraContainer = document.createElement('div');
    cameraContainer.className = 'camera-container';
    cameraContainer.innerHTML = `
        <div class="camera-preview">
            <video id="camera-video" autoplay playsinline></video>
            <canvas id="camera-canvas" style="display: none;"></canvas>
            <button class="camera-close" onclick="closeCamera()">×</button>
        </div>
        <div class="camera-controls">
            <button class="camera-button" onclick="switchCamera()">
                <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 20H5C3.3 20 2 18.7 2 17V7C2 5.3 3.3 4 5 4H7L9 2H15L17 4H19C20.7 4 22 5.3 22 7V13H20V7H4V17H12V20ZM19 18L21.25 20.25L19.75 21.75L17.5 19.5V18H19Z"/>
                </svg>
            </button>
            <button class="camera-button" onclick="capturePhoto()">
                <svg viewBox="0 0 24 24">
                    <circle fill="currentColor" cx="12" cy="12" r="3.2"/>
                    <path fill="currentColor" d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z"/>
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(cameraContainer);

    // Inizializza la fotocamera
    initCamera();

    // Salva la callback per quando la foto viene scattata
    window.currentCameraCallback = onCapture;
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }, 
            audio: false 
        });
        const video = document.getElementById('camera-video');
        video.srcObject = stream;
        window.currentStream = stream;
    } catch (err) {
        console.error('Errore accesso fotocamera:', err);
        showFeedbackMessage('Impossibile accedere alla fotocamera', 'error');
        closeCamera();
    }
}

function switchCamera() {
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
    }
    
    const currentFacingMode = window.currentFacingMode || 'environment';
    window.currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: window.currentFacingMode },
        audio: false
    }).then(stream => {
        const video = document.getElementById('camera-video');
        video.srcObject = stream;
        window.currentStream = stream;
    }).catch(err => {
        console.error('Errore switch camera:', err);
        showFeedbackMessage('Impossibile cambiare fotocamera', 'error');
    });
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    // Imposta le dimensioni del canvas per mantenere l'aspect ratio
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Disegna il frame corrente del video sul canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converti il canvas in base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Chiama la callback salvata con l'immagine
    if (window.currentCameraCallback) {
        window.currentCameraCallback(imageData);
    }

    closeCamera();
}

function closeCamera() {
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
    }
    const container = document.querySelector('.camera-container');
    if (container) {
        container.remove();
    }
    window.currentCameraCallback = null;
    window.currentStream = null;
}

// Funzione per la creazione dei post
function createPost(event) {
    event.preventDefault();

    const currentUser = storage.getCurrentUser();
    if (!currentUser) {
        showFeedbackMessage('Devi essere loggato per pubblicare un post', 'error');
        return false;
    }

    const form = event.target;
    const contentTextarea = form.querySelector('textarea');
    const content = contentTextarea?.value?.trim() || '';
    const songUrl = form.dataset.songUrl || '';
    const previewContainer = form.querySelector('.post-preview');
    const imageData = previewContainer?.querySelector('img')?.src;

    if (!content && !imageData && !songUrl) {
        showFeedbackMessage('Inserisci del testo, un\'immagine o una canzone', 'error');
        return false;
    }

    try {
    const post = {
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
            content: content,
            songLink: songUrl,
            image: imageData,
        timestamp: new Date().toISOString(),
        likes: [],
        comments: []
    };

        // Recupera gli utenti e aggiorna i post
        const users = storage.getUsers() || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex === -1) {
            showFeedbackMessage('Errore durante la pubblicazione del post', 'error');
            return false;
        }

        // Inizializza l'array dei post se non esiste
        if (!Array.isArray(users[userIndex].posts)) {
            users[userIndex].posts = [];
        }

        // Aggiungi il nuovo post all'inizio dell'array
        users[userIndex].posts.unshift(post);
        
        // Salva le modifiche
        storage.setUsers(users);

        // Pulisci il form
        contentTextarea.value = '';
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        form.dataset.songUrl = '';

        // Aggiorna la visualizzazione
        displayPosts();
        showFeedbackMessage('Post pubblicato con successo!', 'success');
        
        return false;
    } catch (error) {
        console.error('Errore durante la pubblicazione del post:', error);
        showFeedbackMessage('Errore durante la pubblicazione del post', 'error');
        return false;
    }
}

// Funzione per visualizzare i post
function displayPosts() {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;

    const users = storage.getUsers();
    const allPosts = [];
    
    users.forEach(user => {
        // Verifica che l'utente abbia un array di post valido
        if (Array.isArray(user.posts)) {
        // Includi i post dell'utente corrente
        if (user.id === currentUser.id) {
            allPosts.push(...user.posts.map(post => ({
                ...post,
                isOwner: true
            })));
        }
        // Includi i post degli utenti seguiti
            else if (Array.isArray(currentUser.following) && currentUser.following.includes(user.id)) {
            allPosts.push(...user.posts.map(post => ({
                ...post,
                isOwner: false
            })));
            }
        }
    });

    // Ordina i post per data (più recenti prima)
    allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const container = document.getElementById('posts-container');
    if (!container) {
        console.error('Container dei post non trovato');
        return;
    }
    
    container.innerHTML = '';

    if (allPosts.length === 0) {
        container.innerHTML = '<p class="no-posts">Nessun post da visualizzare. Segui altri utenti per vedere i loro contenuti!</p>';
        return;
    }

    allPosts.forEach(post => {
        try {
        const postElement = createPostElement(post);
        container.appendChild(postElement);
        } catch (error) {
            console.error('Errore nella creazione dell\'elemento post:', error);
        }
    });
}

// Funzione per creare l'elemento HTML del post
function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post';
    
    const user = storage.getUsers().find(u => u.id === post.userId);
    const profileImage = user?.profileImage || 'default-avatar.png';
    
    let postContent = `
        <div class="post-header">
            <div class="user-info">
                <img src="${profileImage}" alt="${post.username}" class="profile-image">
                <strong class="username clickable" onclick="showUserProfile('${post.userId}')">${post.username}</strong>
            </div>
            <span class="timestamp">${formatDate(post.timestamp)}</span>
            ${post.isOwner ? `
                <button onclick="deletePost('${post.id}')" class="delete-button">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            ` : ''}
        </div>
        <div class="post-content">${post.content}</div>
    `;

    if (post.image) {
        postContent += `<img src="${post.image}" alt="Immagine del post" class="post-image">`;
    }

    if (post.songLink) {
        postContent += `
            <div class="song-link">
                <a href="${post.songLink}" target="_blank">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    Ascolta la canzone
                </a>
            </div>
        `;
    }

    postContent += `
        <div class="post-actions">
            <button onclick="toggleLike('${post.id}')" class="like-button ${post.likes.includes(storage.getCurrentUser().id) ? 'liked' : ''}">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>${post.likes.length}</span>
            </button>
            <button onclick="toggleComments('${post.id}')" class="comment-button">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                </svg>
                <span>${post.comments.length}</span>
            </button>
        </div>
        <div class="comments-section hidden" id="comments-${post.id}">
            <div class="comments-list">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <strong class="username clickable" onclick="showUserProfile('${comment.userId}')">${comment.username}</strong>
                        <span class="comment-content">${comment.content}</span>
                        <span class="timestamp">${formatDate(comment.timestamp)}</span>
                    </div>
                `).join('')}
            </div>
            <form onsubmit="return addComment(event, '${post.id}')" class="comment-form">
                <input type="text" placeholder="Aggiungi un commento..." required>
                <button type="submit">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </form>
        </div>
    `;

    div.innerHTML = postContent;
    return div;
}

function deletePost(postId) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex !== -1) {
        users[userIndex].posts = users[userIndex].posts.filter(post => post.id !== postId);
        storage.setUsers(users);
        displayPosts();
    }
}

function toggleLike(postId) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    
    // Trova il post
    let postFound = false;
    let postOwner = null;
    users.forEach(user => {
        const post = user.posts.find(p => p.id === postId);
        if (post) {
            const likeIndex = post.likes.indexOf(currentUser.id);
            if (likeIndex === -1) {
                post.likes.push(currentUser.id);
                // Crea una notifica solo se non è il proprio post
                if (user.id !== currentUser.id) {
                    createNotification.call(user, 'like', {
                        userId: currentUser.id,
                        targetId: postId
                    });
                }
            } else {
                post.likes.splice(likeIndex, 1);
            }
            postFound = true;
            postOwner = user;
        }
    });

    if (postFound) {
        storage.setUsers(users);
        displayPosts();
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.classList.toggle('hidden');
}

function addComment(event, postId) {
    event.preventDefault();
    const currentUser = storage.getCurrentUser();
    const commentContent = event.target.querySelector('input').value;
    const users = storage.getUsers();
    
    // Trova il post e aggiungi il commento
    let postFound = false;
    let postOwner = null;
    users.forEach(user => {
        const post = user.posts.find(p => p.id === postId);
        if (post) {
            post.comments.push({
                id: Date.now().toString(),
                userId: currentUser.id,
                username: currentUser.username,
                content: commentContent,
                timestamp: new Date().toISOString()
            });
            postFound = true;
            postOwner = user;

            // Crea una notifica solo se non è il proprio post
            if (user.id !== currentUser.id) {
                createNotification.call(user, 'comment', {
                    userId: currentUser.id,
                    targetId: postId,
                    comment: commentContent
                });
            }
        }
    });

    if (postFound) {
        storage.setUsers(users);
        displayPosts();
    }

    event.target.reset();
    return false;
}

// Ricerca utenti e gestione following
function searchUsers(event) {
    const searchTerm = event.target.value.toLowerCase();
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    
    if (searchTerm.length < 2) {
        document.getElementById('search-results').classList.add('hidden');
        return;
    }

    const filteredUsers = users
        .filter(user => 
            user.id !== currentUser.id && 
            (user.username.toLowerCase().includes(searchTerm) || 
             user.email.toLowerCase().includes(searchTerm)))
        .slice(0, 5);

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (filteredUsers.length > 0) {
        filteredUsers.forEach(user => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            const isFollowing = currentUser.following && currentUser.following.includes(user.id);
            div.innerHTML = `
                <span class="username clickable" onclick="showUserProfile('${user.id}'); document.getElementById('search-results').classList.add('hidden');">${user.username}</span>
                <div class="user-actions">
                <button onclick="toggleFollow('${user.id}')" class="follow-button ${isFollowing ? 'following' : ''}">
                    ${isFollowing ? 'Smetti di seguire' : 'Segui'}
                </button>
                    <button onclick="startChat('${user.id}')" class="chat-button">
                        <svg class="action-icon" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                        </svg>
                        Messaggio
                    </button>
                </div>
            `;
            resultsContainer.appendChild(div);
        });
        resultsContainer.classList.remove('hidden');
    } else {
        resultsContainer.classList.add('hidden');
    }
}

function toggleFollow(userId) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const currentUserIndex = users.findIndex(u => u.id === currentUser.id);

    if (currentUserIndex === -1) return;

    if (!currentUser.following) {
        currentUser.following = [];
    }

    const followingIndex = currentUser.following.indexOf(userId);
    if (followingIndex === -1) {
        // Inizia a seguire
        currentUser.following.push(userId);
        showFeedbackMessage('Hai iniziato a seguire questo utente', 'success');

        // Crea una notifica per l'utente seguito
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
            createNotification.call(targetUser, 'follow', {
                followerId: currentUser.id,
                targetId: userId
            });
        }
    } else {
        // Smetti di seguire
        currentUser.following.splice(followingIndex, 1);
        showFeedbackMessage('Hai smesso di seguire questo utente', 'success');
    }

    // Aggiorna lo storage
    users[currentUserIndex] = currentUser;
    storage.setUsers(users);
    storage.setCurrentUser(currentUser);

    // Aggiorna l'interfaccia
    searchUsers({ target: document.getElementById('user-search') });
    displayPosts();
}

// Gestione chat
function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post';
    
    let postContent = `
        <div class="post-header">
            <strong class="username clickable" onclick="showUserProfile('${post.userId}')">${post.username}</strong>
            <span class="timestamp">${formatDate(post.timestamp)}</span>
            ${post.isOwner ? `<button onclick="deletePost('${post.id}')" class="delete-button">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>` : ''}
        </div>
        <div class="post-content">${post.content}</div>
    `;

    if (post.image) {
        postContent += `<img src="${post.image}" alt="Immagine del post" class="post-image">`;
    }

    if (post.songLink) {
        postContent += `
            <div class="song-link">
                <a href="${post.songLink}" target="_blank">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    Ascolta la canzone
                </a>
            </div>
        `;
    }

    postContent += `
        <div class="post-actions">
            <button onclick="toggleLike('${post.id}')" class="like-button ${post.likes.includes(storage.getCurrentUser().id) ? 'liked' : ''}">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>${post.likes.length}</span>
            </button>
            <button onclick="toggleComments('${post.id}')" class="comment-button">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                </svg>
                <span>${post.comments.length}</span>
            </button>
        </div>
        <div class="comments-section hidden" id="comments-${post.id}">
            <div class="comments-list">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <strong class="username clickable" onclick="showUserProfile('${comment.userId}')">${comment.username}</strong>
                        <span class="comment-content">${comment.content}</span>
                        <span class="timestamp">${formatDate(comment.timestamp)}</span>
                    </div>
                `).join('')}
            </div>
            <form onsubmit="return addComment(event, '${post.id}')" class="comment-form">
                <input type="text" placeholder="Aggiungi un commento..." required>
                <button type="submit">
                    <svg class="action-icon" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </form>
        </div>
    `;

    div.innerHTML = postContent;
    return div;
}

// Gestione delle chat multiple
let activeChats = new Map();

function startChat(userId) {
    // Nascondi i risultati della ricerca
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('user-search').value = '';
    
    // Mostra la sezione messaggi
    showMessages();
    
    // Apri la chat con l'utente
    openChat(userId);
}

function showMessages() {
    document.getElementById('feed-section').classList.add('hidden');
    document.getElementById('profile-section').classList.add('hidden');
    document.getElementById('invite-section').classList.add('hidden');
    
    const messagesSection = document.getElementById('messages-section');
    messagesSection.classList.remove('hidden');
    
    // Inizializza il container delle chat se non esiste
    if (!messagesSection.querySelector('.messages-container')) {
        messagesSection.innerHTML = `
            <div class="messages-container">
                <div class="chats-list"></div>
                <div class="active-chats"></div>
            </div>
        `;
    }
    
    // Aggiorna la lista delle chat
    updateChatsList();
}

function updateChatsList() {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const chatsList = document.querySelector('.chats-list');
    
    // Trova tutte le chat dell'utente
    const userChats = new Set();
    if (currentUser.messages) {
        Object.keys(currentUser.messages).forEach(chatId => {
            const [user1, user2] = chatId.split('-');
            const otherUserId = user1 === currentUser.id ? user2 : user1;
            userChats.add(otherUserId);
        });
    }
    
    // Crea la lista delle chat
    chatsList.innerHTML = `
        <div class="chat-search">
            <input type="text" placeholder="Cerca nelle chat..." oninput="filterChats(event)">
        </div>
    `;
    
    const chatItems = document.createElement('div');
    chatItems.className = 'chat-items';
    
    Array.from(userChats).forEach(userId => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const chatId = [currentUser.id, userId].sort().join('-');
        const messages = currentUser.messages[chatId] || [];
        const lastMessage = messages[messages.length - 1];
        
        const div = document.createElement('div');
        div.className = 'chat-preview';
        div.onclick = () => openChat(userId);
        div.innerHTML = `
            <img src="${user.profileImage || 'default-avatar.png'}" alt="${user.username}" class="profile-image">
            <div class="chat-info">
                <strong class="username">${user.username}</strong>
                <span class="last-message">${lastMessage ? lastMessage.content || '📷 Immagine' : 'Nessun messaggio'}</span>
            </div>
            <div class="chat-meta">
                <span class="timestamp">${lastMessage ? formatDate(lastMessage.timestamp) : ''}</span>
            </div>
        `;
        
        chatItems.appendChild(div);
    });
    
    chatsList.appendChild(chatItems);
}

function openChat(userId) {
    if (activeChats.has(userId)) {
        // Se la chat è già aperta, la porta in primo piano
        const chatWindow = activeChats.get(userId);
        chatWindow.style.zIndex = getMaxZIndex() + 1;
        return;
    }
    
    const users = storage.getUsers();
    const otherUser = users.find(u => u.id === userId);
    if (!otherUser) return;
    
    const chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window';
    chatWindow.style.zIndex = getMaxZIndex() + 1;
    
    chatWindow.innerHTML = `
        <div class="chat-header">
            <img src="${otherUser.profileImage || 'default-avatar.png'}" alt="${otherUser.username}" class="profile-image">
            <strong>${otherUser.username}</strong>
            <div class="chat-controls">
                <button class="minimize-chat" onclick="minimizeChat('${userId}')">_</button>
                <button class="minimize-chat" onclick="closeChat('${userId}')">×</button>
            </div>
        </div>
        <div class="chat-messages" id="chat-messages-${userId}"></div>
        <div class="chat-input">
            <input type="text" placeholder="Scrivi un messaggio..." id="message-input-${userId}">
            <button type="button" class="camera-button" onclick="openChatCamera('${userId}')">
                <svg class="action-icon" viewBox="0 0 24 24">
                    <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/>
                    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                </svg>
            </button>
            <button onclick="sendMessage('${userId}')">Invia</button>
        </div>
    `;

    document.querySelector('.active-chats').appendChild(chatWindow);
    activeChats.set(userId, chatWindow);
    
    loadChatMessages(userId);
    
    // Focus sull'input
    document.getElementById(`message-input-${userId}`).focus();
}

function minimizeChat(userId) {
    const chatWindow = activeChats.get(userId);
    if (chatWindow) {
        chatWindow.classList.toggle('minimized');
    }
}

function closeChat(userId) {
    const chatWindow = activeChats.get(userId);
    if (chatWindow) {
        chatWindow.remove();
        activeChats.delete(userId);
    }
}

function getMaxZIndex() {
    return Math.max(
        ...Array.from(document.querySelectorAll('.chat-window'))
            .map(el => parseInt(getComputedStyle(el).zIndex) || 0)
    );
}

function filterChats(event) {
    const query = event.target.value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-preview');
    
    chatItems.forEach(item => {
        const username = item.querySelector('.username').textContent.toLowerCase();
        const lastMessage = item.querySelector('.last-message').textContent.toLowerCase();
        
        if (username.includes(query) || lastMessage.includes(query)) {
            item.style.display = '';
    } else {
            item.style.display = 'none';
        }
        });
    }

// Funzioni per la gestione persistente delle chat
function getMessagesKey(userId1, userId2) {
    return `messages_${[userId1, userId2].sort().join('-')}`;
}

function loadChatMessages(userId) {
    const currentUser = storage.getCurrentUser();
    const chatId = [currentUser.id, userId].sort().join('-');
    
    // Carica i messaggi dal localStorage
    const messagesKey = getMessagesKey(currentUser.id, userId);
    let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    
    // Aggiorna anche l'oggetto utente se necessario
    if (!currentUser.messages) currentUser.messages = {};
    if (!currentUser.messages[chatId]) {
        currentUser.messages[chatId] = messages;
        storage.setCurrentUser(currentUser);
    }

    const container = document.getElementById(`chat-messages-${userId}`);
    if (!container) return;
    
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = '<p class="no-messages">Nessun messaggio</p>';
        return;
    }

    messages.forEach(message => {
        const div = document.createElement('div');
        div.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
        
        let messageContent = '';
        if (message.image) {
            messageContent = `<img src="${message.image}" alt="Immagine" style="max-width: 200px; border-radius: 8px;">`;
        }
        if (message.content) {
            messageContent += `<p>${message.content}</p>`;
        }
        
        div.innerHTML = `
            <div class="message-content">
                ${messageContent}
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
        container.appendChild(div);
    });

    // Scorri alla fine della chat
    container.scrollTop = container.scrollHeight;
}

function saveMessageToStorage(message, userId1, userId2) {
    const messagesKey = getMessagesKey(userId1, userId2);
    const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    messages.push(message);
    localStorage.setItem(messagesKey, JSON.stringify(messages));
}

// Aggiorna la funzione sendMessage per utilizzare il localStorage
function sendMessage(userId, imageData = null) {
    const input = document.getElementById(`message-input-${userId}`);
    const content = input?.value?.trim() || '';
    
    if (!content && !imageData) return;

    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const otherUser = users.find(u => u.id === userId);
    
    if (!otherUser) return;

    // Inizializza l'array dei messaggi se non esiste
    if (!currentUser.messages) currentUser.messages = {};
    if (!otherUser.messages) otherUser.messages = {};
    
    const chatId = [currentUser.id, userId].sort().join('-');
    if (!currentUser.messages[chatId]) currentUser.messages[chatId] = [];
    if (!otherUser.messages[chatId]) otherUser.messages[chatId] = [];

    // Crea il messaggio
    const message = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        content: content,
        image: imageData,
        timestamp: new Date().toISOString()
    };

    // Salva il messaggio nel localStorage
    saveMessageToStorage(message, currentUser.id, userId);

    // Aggiungi il messaggio a entrambi gli utenti
    currentUser.messages[chatId].push(message);
    otherUser.messages[chatId].push(message);

    // Aggiorna lo storage degli utenti
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    const otherUserIndex = users.findIndex(u => u.id === userId);
    users[userIndex] = currentUser;
    users[otherUserIndex] = otherUser;
    storage.setUsers(users);
    storage.setCurrentUser(currentUser);

    // Pulisci l'input e aggiorna la chat
    if (input) {
        input.value = '';
    }
    
    // Aggiorna la visualizzazione dei messaggi
    const chatMessages = document.getElementById(`chat-messages-${userId}`);
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        
        let messageContent = '';
        if (imageData) {
            messageContent = `<img src="${imageData}" alt="Immagine" style="max-width: 200px; border-radius: 8px;">`;
        }
        if (content) {
            messageContent += `<p>${content}</p>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${messageContent}
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Funzione per cercare canzoni su Spotify
async function searchSongs(query) {
    const clientId = 'YOUR_SPOTIFY_CLIENT_ID'; // Da sostituire con il tuo client ID
    const clientSecret = 'YOUR_SPOTIFY_CLIENT_SECRET'; // Da sostituire con il tuo client secret

    try {
        // Ottieni il token di accesso
        const authResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
            },
            body: 'grant_type=client_credentials'
        });

        const authData = await authResponse.json();
        const accessToken = authData.access_token;

        // Cerca le canzoni
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const searchData = await searchResponse.json();
        return searchData.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            image: track.album.images[2].url,
            spotifyUrl: track.external_urls.spotify,
            appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}`
        }));
    } catch (error) {
        console.error('Errore nella ricerca delle canzoni:', error);
        return [];
    }
}

// Inizializzazione base dell'app
document.addEventListener('DOMContentLoaded', () => {
    setupPostForm();
    displayPosts();
});

// Setup del form per i post
function setupPostForm() {
    const mainApp = document.getElementById('main-app');
    if (!mainApp) return;

    // Crea il form dei post se non esiste
    let postForm = document.querySelector('.post-form');
    if (!postForm) {
        postForm = document.createElement('div');
        postForm.className = 'post-form';
        mainApp.insertBefore(postForm, mainApp.firstChild);
    }

    // Imposta il contenuto del form
    postForm.innerHTML = `
        <form id="post-creation-form">
            <textarea placeholder="Cosa vuoi condividere?" required></textarea>
            <div class="form-actions">
                <div class="media-actions">
                    <input type="file" id="post-image" accept="image/*" style="display: none">
                    <button type="button" onclick="document.getElementById('post-image').click()">
                        Aggiungi foto
                    </button>
                </div>
                <button type="submit">Pubblica</button>
            </div>
            <div class="post-preview"></div>
        </form>
    `;

    // Aggiungi gli event listener
    const form = document.getElementById('post-creation-form');
    const fileInput = document.getElementById('post-image');

    // Gestione del submit del form
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        publishPost(form);
    });

    // Gestione del caricamento immagini
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.querySelector('.post-preview');
                preview.innerHTML = `
                    <div class="image-preview">
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" onclick="clearPreview()">×</button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Funzione per pubblicare un post
function publishPost(form) {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) {
        showFeedbackMessage('Devi essere loggato per pubblicare', 'error');
        return;
    }

    const content = form.querySelector('textarea').value.trim();
    const imagePreview = form.querySelector('.post-preview img');
    const imageData = imagePreview ? imagePreview.src : null;

    if (!content && !imageData) {
        showFeedbackMessage('Inserisci del testo o un\'immagine', 'error');
        return;
    }

    // Crea il post
    const post = {
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
        content: content,
        image: imageData,
        timestamp: new Date().toISOString(),
        likes: [],
        comments: []
    };

    // Salva il post
    try {
        const users = storage.getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex === -1) {
            throw new Error('Utente non trovato');
        }

        // Inizializza l'array dei post se non esiste
        if (!Array.isArray(users[userIndex].posts)) {
            users[userIndex].posts = [];
        }

        // Aggiungi il nuovo post
        users[userIndex].posts.unshift(post);
        storage.setUsers(users);

        // Pulisci il form
        form.reset();
        clearPreview();

        // Aggiorna la visualizzazione
        displayPosts();
        showFeedbackMessage('Post pubblicato con successo!', 'success');
    } catch (error) {
        console.error('Errore durante la pubblicazione:', error);
        showFeedbackMessage('Errore durante la pubblicazione del post', 'error');
    }
}

// Funzione per pulire l'anteprima dell'immagine
function clearPreview() {
    const preview = document.querySelector('.post-preview');
    if (preview) {
        preview.innerHTML = '';
    }
    const fileInput = document.getElementById('post-image');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Funzione per mostrare i post
function displayPosts() {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;

    const users = storage.getUsers();
    const allPosts = [];

    // Raccogli tutti i post rilevanti
    users.forEach(user => {
        if (Array.isArray(user.posts)) {
            if (user.id === currentUser.id || 
                (Array.isArray(currentUser.following) && 
                 currentUser.following.includes(user.id))) {
                allPosts.push(...user.posts.map(post => ({
                    ...post,
                    isOwner: user.id === currentUser.id
                })));
            }
        }
    });

    // Ordina i post per data
    allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const container = document.getElementById('posts-container');
    if (!container) return;

    // Mostra i post
    if (allPosts.length === 0) {
        container.innerHTML = '<p class="no-posts">Nessun post da visualizzare</p>';
        return;
    }

    container.innerHTML = allPosts.map(post => `
        <div class="post">
            <div class="post-header">
                <div class="user-info">
                    <img src="${getUserProfileImage(post.userId)}" alt="${post.username}" class="profile-image">
                    <span class="username">${post.username}</span>
                </div>
                <span class="timestamp">${formatDate(post.timestamp)}</span>
            </div>
            <div class="post-content">${post.content}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
            <div class="post-actions">
                <button onclick="toggleLike('${post.id}')" class="like-button ${post.likes.includes(currentUser.id) ? 'liked' : ''}">
                    <span>${post.likes.length}</span> Mi piace
                </button>
                <button onclick="toggleComments('${post.id}')" class="comment-button">
                    <span>${post.comments.length}</span> Commenti
                </button>
            </div>
        </div>
    `).join('');
}

// Funzione helper per ottenere l'immagine del profilo
function getUserProfileImage(userId) {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    return user?.profileImage || 'default-avatar.png';
}

// Funzione per formattare la data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openChatCamera(userId) {
    openCamera((imageData) => {
        sendMessage(userId, imageData);
    });
}

function showFeed() {
    hideAllSections();
    document.getElementById('feed-section').classList.remove('hidden');
    displayPosts();
}

function showProfile() {
    hideAllSections();
    document.getElementById('profile-section').classList.remove('hidden');
    displayProfile();
}

function showInvite() {
    hideAllSections();
    document.getElementById('invite-section').classList.remove('hidden');
    generateInviteLink();
}

function hideAllSections() {
    document.getElementById('feed-section').classList.add('hidden');
    document.getElementById('messages-section').classList.add('hidden');
    document.getElementById('profile-section').classList.add('hidden');
    document.getElementById('notifications-section').classList.add('hidden');
    document.getElementById('invite-section').classList.add('hidden');
}

function generateInviteLink() {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;
    
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteLink = `${baseUrl}?invite=${currentUser.id}`;
    
    const inviteLinkInput = document.getElementById('invite-link');
    if (inviteLinkInput) {
        inviteLinkInput.value = inviteLink;
    }
}

function copyInviteLink() {
    const inviteLinkInput = document.getElementById('invite-link');
    if (inviteLinkInput) {
        inviteLinkInput.select();
        document.execCommand('copy');
        showFeedbackMessage('Link copiato negli appunti!', 'success');
    }
}

// Aggiungi questa funzione se non è già presente
function initializeApp() {
    const currentUser = storage.getCurrentUser();
    if (currentUser) {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        showFeed();
    }
}

// Aggiorna l'event listener per DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeApp);

function toggleMusicSearch() {
    const musicSearch = document.querySelector('.music-search');
    musicSearch.classList.toggle('hidden');
    if (!musicSearch.classList.contains('hidden')) {
        musicSearch.querySelector('input').focus();
    }
}

function displayProfile(userId = null) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const user = userId ? users.find(u => u.id === userId) : currentUser;
    
    if (!user) return;

    const followers = users.filter(u => u.following && u.following.includes(user.id));
    const following = user.following || [];

    const profileSection = document.getElementById('profile-section');
    profileSection.innerHTML = `
        <div class="profile-header">
            <div class="profile-image-container">
                <img src="${user.profileImage || 'default-avatar.png'}" alt="${user.username}" class="profile-image">
                ${user.id === currentUser.id ? `
                    <button class="change-profile-image" onclick="openProfileImageUpload()">
                        <svg viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            <div class="profile-info">
                <div class="profile-name">
                    <h2>${user.username}</h2>
                    ${user.id === currentUser.id ? `
                        <button class="edit-profile" onclick="openProfileEdit()">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Modifica profilo
                        </button>
                    ` : ''}
                </div>
                <p class="profile-description">${user.description || 'Nessuna descrizione'}</p>
                <p class="profile-email">${user.email}</p>
            </div>
        </div>
        <div class="profile-stats">
            <div class="stat">
                <span class="stat-value">${user.posts?.length || 0}</span>
                <span class="stat-label">Post</span>
        </div>
            <div class="stat clickable" onclick="showFollowersModal('${user.id}')">
                <span class="stat-value">${followers.length}</span>
                <span class="stat-label">Followers</span>
            </div>
            <div class="stat clickable" onclick="showFollowingModal('${user.id}')">
                <span class="stat-value">${following.length}</span>
                <span class="stat-label">Following</span>
            </div>
        </div>
        <div id="user-posts" class="user-posts"></div>
    `;

    // Mostra i post dell'utente
    displayUserPosts(user.id);
}

function openProfileImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showFeedbackMessage('L\'immagine è troppo grande. Dimensione massima: 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Ridimensiona se l'immagine è troppo grande
                    const maxSize = 800;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round(height * maxSize / width);
                            width = maxSize;
    } else {
                            width = Math.round(width * maxSize / height);
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressedImage = canvas.toDataURL('image/jpeg', 0.8);
                    
                    // Aggiorna l'immagine del profilo
                    const currentUser = storage.getCurrentUser();
                    const users = storage.getUsers();
                    const userIndex = users.findIndex(u => u.id === currentUser.id);
                    
                    if (userIndex !== -1) {
                        users[userIndex].profileImage = compressedImage;
                        currentUser.profileImage = compressedImage;
                        
                        storage.setUsers(users);
                        storage.setCurrentUser(currentUser);
                        
                        // Aggiorna immediatamente l'interfaccia
                        const profileImages = document.querySelectorAll('.profile-image');
                        profileImages.forEach(img => {
                            if (img.closest('.profile-image-container')) {
                                img.src = compressedImage;
                            }
                        });
                        
                        showFeedbackMessage('Immagine del profilo aggiornata con successo!', 'success');
                        displayProfile();
                    }
                };
                img.src = event.target.result;
            };
            reader.onerror = function() {
                showFeedbackMessage('Errore durante la lettura dell\'immagine', 'error');
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
}

function openProfileEdit() {
    const currentUser = storage.getCurrentUser();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Modifica profilo</h2>
            <form id="edit-profile-form">
                <div class="form-group">
                    <label for="username">Nome utente</label>
                    <input type="text" id="username" value="${currentUser.username}" required>
                </div>
                <div class="form-group">
                    <label for="description">Descrizione</label>
                    <textarea id="description" rows="3">${currentUser.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="closeModal()">Annulla</button>
                    <button type="submit">Salva</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('edit-profile-form').onsubmit = (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const description = document.getElementById('description').value.trim();
        
        updateProfile(username, description);
        closeModal();
        return false;
    };
}

function updateProfile(username, description) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        const oldUsername = users[userIndex].username;
        
        // Aggiorna il nome utente e la descrizione nell'oggetto utente
        users[userIndex].username = username;
        users[userIndex].description = description;
        currentUser.username = username;
        currentUser.description = description;
        
        // Aggiorna il nome utente in tutti i post dell'utente
        if (Array.isArray(users[userIndex].posts)) {
            users[userIndex].posts.forEach(post => {
                post.username = username;
            });
        }
        
        // Aggiorna il nome utente nei commenti di tutti i post di tutti gli utenti
        users.forEach(user => {
            if (Array.isArray(user.posts)) {
                user.posts.forEach(post => {
                    if (Array.isArray(post.comments)) {
                        post.comments.forEach(comment => {
                            if (comment.userId === currentUser.id) {
                                comment.username = username;
                            }
                        });
                    }
                });
            }
        });

        // Aggiorna il nome utente nelle chat
        users.forEach(user => {
            if (user.messages) {
                Object.keys(user.messages).forEach(chatId => {
                    const messages = user.messages[chatId];
                    if (Array.isArray(messages)) {
                        messages.forEach(message => {
                            if (message.senderId === currentUser.id) {
                                message.username = username;
                            }
                        });
                    }
                });
            }
        });

        // Aggiorna il nome utente nelle notifiche
        users.forEach(user => {
            if (Array.isArray(user.notifications)) {
                user.notifications.forEach(notification => {
                    if (notification.userId === currentUser.id) {
                        notification.username = username;
                    }
                });
            }
        });
        
        // Salva le modifiche
        storage.setUsers(users);
        storage.setCurrentUser(currentUser);
        
        // Aggiorna l'interfaccia
        displayProfile();
        displayPosts();
        showFeedbackMessage('Profilo aggiornato con successo!', 'success');
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function displayUserPosts(userId) {
    const currentUser = storage.getCurrentUser();
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return;

    const postsContainer = document.getElementById('user-posts');
    postsContainer.innerHTML = '';

    if (user.posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-posts">Nessun post da visualizzare.</p>';
        return;
    }

    user.posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

// Funzioni per la ricerca e visualizzazione di followers/following
function showFollowersModal(userId) {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const followers = users.filter(u => u.following && u.following.includes(userId));
    showUsersModal('Followers', followers);
}

function showFollowingModal(userId) {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user || !user.following) return;

    const following = users.filter(u => user.following.includes(u.id));
    showUsersModal('Following', following);
}

function showUsersModal(title, users) {
    // Rimuovi eventuali modal esistenti
    const existingModal = document.querySelector('.users-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'users-modal modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button type="button" class="close-button" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="search-container">
                    <input type="text" class="user-search" placeholder="Cerca utenti..." oninput="filterUsers(event)">
                </div>
                <div class="users-list"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    displayUsersList(users);
}

function displayUsersList(users) {
    const usersList = document.querySelector('.users-list');
    if (!usersList) return;

    if (users.length === 0) {
        usersList.innerHTML = '<p class="no-results">Nessun utente trovato</p>';
        return;
    }

    const currentUser = storage.getCurrentUser();
    usersList.innerHTML = users.map(user => `
        <div class="user-item" data-username="${user.username.toLowerCase()}">
            <div class="user-info">
                <img src="${user.profileImage || 'default-avatar.png'}" alt="${user.username}" class="profile-image">
                <div class="user-details">
                    <span class="username clickable" onclick="showUserProfile('${user.id}')">${user.username}</span>
                    ${user.description ? `<p class="user-description">${user.description}</p>` : ''}
                </div>
            </div>
            <div class="user-actions">
                ${user.id !== currentUser.id ? `
                    <button onclick="toggleFollow('${user.id}')" class="follow-button ${currentUser.following && currentUser.following.includes(user.id) ? 'following' : ''}">
                        ${currentUser.following && currentUser.following.includes(user.id) ? 'Smetti di seguire' : 'Segui'}
                    </button>
                    <button onclick="startChat('${user.id}')" class="chat-button">
                        <svg class="action-icon" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                        </svg>
                        Messaggio
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterUsers(event) {
    const searchTerm = event.target.value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const username = item.dataset.username;
        if (username.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Aggiungi stili CSS per il modal
const styleSheet = document.createElement('style');
styleSheet.textContent = `
.users-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.users-modal .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.users-modal .modal-header {
    padding: 1rem;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.users-modal .modal-body {
    padding: 1rem;
    overflow-y: auto;
}

.users-modal .search-container {
    margin-bottom: 1rem;
}

.users-modal .user-search {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
}

.users-modal .users-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.users-modal .user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem;
    border-radius: 8px;
    transition: background-color 0.2s;
}

.users-modal .user-item:hover {
    background-color: #f8f9fa;
}

.users-modal .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.users-modal .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.users-modal .user-description {
    font-size: 0.9rem;
    color: #666;
}

.users-modal .user-actions {
    display: flex;
    gap: 0.5rem;
}

.users-modal .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    color: #666;
    transition: color 0.3s;
}

.users-modal .close-button:hover {
    color: #333;
}

.users-modal .no-results {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-style: italic;
}
`;
document.head.appendChild(styleSheet); 
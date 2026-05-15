/**
 * Lumina Image Gallery Script
 * Handles filtering, search, lightbox, auth, uploads, and admin
 * Migrated to Realtime Database (RTDB) for maximum reliability in Asia-SE1
 */

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getDatabase, ref as dRef, set, push, onValue, remove, query as dbQuery, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase Configuration (Direct from your console)
const firebaseConfig = {
  apiKey: "AIzaSyCJRmce7aIWdgDW79NN74dNnmuN_2MMEHM",
  authDomain: "codealpha-image-gallery.firebaseapp.com",
  databaseURL: "https://codealpha-image-gallery-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "codealpha-image-gallery",
  storageBucket: "codealpha-image-gallery.firebasestorage.app",
  messagingSenderId: "13240440194",
  appId: "1:13240440194:web:b58f9bdb01456ada906b9b",
  measurementId: "G-83DH5RREQ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const auth = getAuth(app);

// FORCED REGIONAL CONNECTION (Asia-SE1)
const db = getDatabase(app, "https://codealpha-image-gallery-default-rtdb.asia-southeast1.firebasedatabase.app");

const ADMIN_EMAIL = "anik.da@gmail.com";
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryGrid = document.getElementById('gallery');
    const searchInput = document.getElementById('searchInput');
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const toggleAuth = document.getElementById('toggleAuth');
    const authForm = document.getElementById('authForm');
    const userProfile = document.getElementById('userProfile');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const myUploadsBtn = document.getElementById('myUploadsBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const uploadForm = document.getElementById('uploadForm');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeLightbox = document.querySelector('.close-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    let currentIndex = 0;

    // Debug Log to UI
    const logToUI = (msg) => {
        const debugLog = document.getElementById('debugLog') || createDebugLog();
        debugLog.innerHTML += `<div>> ${msg}</div>`;
        debugLog.scrollTop = debugLog.scrollHeight;
    };

    function createDebugLog() {
        const div = document.createElement('div');
        div.id = 'debugLog';
        div.style.cssText = 'position:fixed;bottom:10px;left:10px;width:300px;height:100px;background:rgba(0,0,0,0.85);color:#0f0;font-family:monospace;font-size:10px;padding:10px;overflow-y:auto;z-index:9999;border:1px solid #333;border-radius:5px;pointer-events:none;';
        document.body.appendChild(div);
        return div;
    }

    logToUI("Engine: Realtime Database (RTDB)");

    // =============================================
    // GALLERY CORE
    // =============================================
    function getAllGalleryItems() {
        return Array.from(document.querySelectorAll('.gallery-item'));
    }

    function getVisibleItems() {
        return getAllGalleryItems().filter(item => item.style.display !== 'none');
    }

    function filterItems(category, search = '') {
        getAllGalleryItems().forEach(item => {
            const itemCategory = (item.getAttribute('data-category') || '').toLowerCase();
            const itemTitle = (item.getAttribute('data-title') || '').toLowerCase();
            const matchesCategory = category === 'all' || itemCategory === category;
            const matchesSearch = !search || itemTitle.includes(search) || itemCategory.includes(search);
            item.style.display = (matchesCategory && matchesSearch) ? 'block' : 'none';
        });
    }

    searchInput.addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.filter-btn.active');
        filterItems(activeFilter?.getAttribute('data-filter') || 'all', e.target.value.toLowerCase());
    });

    function updateDynamicFilters() {
        const categories = new Set(['all']);
        getAllGalleryItems().forEach(item => {
            const cat = item.getAttribute('data-category');
            if (cat) categories.add(cat);
        });

        const filterContainer = document.querySelector('.filter-buttons');
        if (!filterContainer) return;
        const activeFilter = filterContainer.querySelector('.active')?.getAttribute('data-filter') || 'all';
        
        filterContainer.querySelectorAll('.filter-btn.dynamic').forEach(btn => btn.remove());

        categories.forEach(cat => {
            if (['all', 'nature', 'tech', 'cars', 'animals'].includes(cat)) return;
            const btn = document.createElement('button');
            btn.className = 'filter-btn dynamic';
            btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            btn.setAttribute('data-filter', cat);
            if (cat === activeFilter) btn.classList.add('active');
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterItems(cat, searchInput.value.toLowerCase());
            });
            filterContainer.appendChild(btn);
        });
    }

    // Heartbeat to keep connection alive and show status
    setInterval(() => {
        logToUI("Heartbeat: Active ❤️");
    }, 30000);

    // Initial filter run
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterItems(button.getAttribute('data-filter'), searchInput.value.toLowerCase());
        });
    });

    // =============================================
    // AUTHENTICATION
    // =============================================
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            document.getElementById('authContainer').classList.add('hidden');
            userProfile.classList.remove('hidden');
            userEmailDisplay.textContent = user.email;
        } else {
            document.getElementById('authContainer').classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
        refreshGallery();
    });

    loginBtn.addEventListener('click', () => { setAuthMode(false); authModal.classList.add('active'); });
    signupBtn.addEventListener('click', () => { setAuthMode(true); authModal.classList.add('active'); });
    
    function setAuthMode(isSignUp) {
        authForm.dataset.mode = isSignUp ? 'signup' : 'login';
        const titleEl = document.getElementById('authTitle');
        const submitBtnText = document.getElementById('authBtnText');
        const switchText = document.getElementById('authSwitchText');
        const toggleLink = document.getElementById('toggleAuth');

        if (titleEl) titleEl.innerHTML = isSignUp ? 'Create <span class="gradient-text">Account</span>' : 'Welcome <span class="gradient-text">Back</span>';
        if (submitBtnText) submitBtnText.textContent = isSignUp ? 'Sign Up' : 'Login';
        if (switchText) switchText.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
        if (toggleLink) toggleLink.textContent = isSignUp ? 'Login' : 'Sign Up';
    }

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        try {
            if (authForm.dataset.mode === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
            authModal.classList.remove('active');
            authForm.reset();
        } catch (error) { alert(error.message); }
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    // =============================================
    // UPLOAD & SYNC (RTDB)
    // =============================================
    uploadBtn.addEventListener('click', () => currentUser ? uploadModal.classList.add('active') : alert("Login first!"));

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('imageFile').files[0];
        const title = document.getElementById('imageTitle').value.trim();
        const category = document.getElementById('imageCategory').value.trim();
        if (!file || !title || !category) return alert("Fill all fields!");

        btnText.textContent = 'Uploading...';
        btnLoader.classList.remove('hidden');
        document.getElementById('submitUpload').disabled = true;

        try {
            logToUI("Uploading image...");
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const snapshot = await uploadBytes(sRef(storage, `gallery/${fileName}`), file);
            const url = await getDownloadURL(snapshot.ref);

            logToUI("Saving to RTDB...");
            const newRef = push(dRef(db, 'gallery'));
            await set(newRef, {
                title, category, url, fileName,
                ownerId: currentUser.uid,
                ownerEmail: currentUser.email,
                timestamp: Date.now()
            });

            logToUI("Success!");
            uploadForm.reset();
            uploadModal.classList.remove('active');
            alert("Visual added!");
            window.location.reload();
        } catch (error) {
            logToUI("Fail: " + error.message);
            alert(error.message);
        } finally {
            btnText.textContent = 'Post to Gallery';
            btnLoader.classList.add('hidden');
            document.getElementById('submitUpload').disabled = false;
        }
    });

    // Real-time listener with 100-item limit to prevent "infinite" loading issues
    const galleryQuery = dbQuery(dRef(db, 'gallery'), limitToLast(100));
    onValue(galleryQuery, (snapshot) => {
        logToUI("Status: SYNCED ✅");
        // Hide loader once we get a response
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');

        document.querySelectorAll('.gallery-item[id^="item-"]').forEach(el => el.remove());
        const data = snapshot.val();
        if (data) {
            // Reverse so newest are first
            Object.keys(data).reverse().forEach(id => createGalleryItem(id, data[id]));
        }
        if (typeof updateDynamicFilters === 'function') updateDynamicFilters();
    }, (error) => {
        logToUI("DB Error: " + error.message);
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
    });

    function createGalleryItem(id, data) {
        const item = document.createElement('div');
        item.className = `gallery-item ${data.category.toLowerCase().trim()}`;
        item.id = `item-${id}`;
        item.setAttribute('data-category', data.category.toLowerCase());
        item.setAttribute('data-title', data.title);
        
        item.innerHTML = `
            <div class="image-box">
                <img src="${data.url}" alt="${data.title}">
                <button class="delete-btn">🗑️</button>
                <div class="overlay"><span>${data.category}</span></div>
            </div>
        `;

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete?")) handleDelete(id, data.fileName);
        });

        item.addEventListener('click', () => openLightbox(item));
        galleryGrid.prepend(item);
        updateDeleteVisibility(item);
    }

    async function handleDelete(id, fileName) {
        try {
            await remove(dRef(db, `gallery/${id}`));
            await deleteObject(sRef(storage, `gallery/${fileName}`));
        } catch (error) { alert(error.message); }
    }

    function updateDeleteVisibility(item) {
        const btn = item.querySelector('.delete-btn');
        if (btn) btn.classList.toggle('can-delete', currentUser && currentUser.email === ADMIN_EMAIL);
    }

    function refreshGallery() {
        document.querySelectorAll('.gallery-item').forEach(updateDeleteVisibility);
    }

    // =============================================
    // LIGHTBOX
    // =============================================
    function openLightbox(item) {
        const img = item.querySelector('img');
        if (!img || !lightboxImg || !lightboxCaption) return;
        
        lightboxImg.src = img.src;
        const title = item.getAttribute('data-title') || 'Untitled';
        const category = item.getAttribute('data-category') || 'General';
        
        lightboxCaption.innerHTML = `<h3>${title}</h3><p>${category}</p>`;
        lightbox.classList.add('active');
        
        const visible = getVisibleItems();
        currentIndex = visible.indexOf(item);
    }

    closeLightbox.addEventListener('click', () => lightbox.classList.remove('active'));
    
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const visible = getVisibleItems();
        if (visible.length === 0) return;
        currentIndex = (currentIndex - 1 + visible.length) % visible.length;
        openLightbox(visible[currentIndex]);
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const visible = getVisibleItems();
        if (visible.length === 0) return;
        currentIndex = (currentIndex + 1) % visible.length;
        openLightbox(visible[currentIndex]);
    });

    // Modal Helpers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.classList.remove('active');
            uploadModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.classList.remove('active');
        if (e.target === uploadModal) uploadModal.classList.remove('active');
        if (e.target === lightbox) lightbox.classList.remove('active');
    });

    // ATTACH LISTENERS TO STATIC IMAGES (Crucial Fix)
    function initStaticItems() {
        document.querySelectorAll('.gallery-item').forEach(item => {
            // Only attach if not already dynamic
            if (!item.id.startsWith('item-')) {
                item.addEventListener('click', () => openLightbox(item));
                updateDeleteVisibility(item);
            }
        });
    }
    
    initStaticItems();
    updateDynamicFilters();
});

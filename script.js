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
    const myDashboardBtn = document.getElementById('myDashboardBtn');
    const dashboardModal = document.getElementById('dashboardModal');

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeLightbox = document.querySelector('.close-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    let currentIndex = 0;

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
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
        const categories = new Set(['all']);
        if (isAdmin) categories.add('pending'); // Add pending filter for admin

        getAllGalleryItems().forEach(item => {
            const cat = item.getAttribute('data-category');
            if (cat) categories.add(cat);
        });

        const filterContainer = document.querySelector('.filter-buttons');
        if (!filterContainer) return;
        const activeFilter = filterContainer.querySelector('.active')?.getAttribute('data-filter') || 'all';
        
        filterContainer.querySelectorAll('.filter-btn.dynamic').forEach(btn => btn.remove());

        categories.forEach(cat => {
            if (cat === 'all' || ['nature', 'tech', 'cars', 'animals'].includes(cat)) {
                if (cat === 'pending' && !isAdmin) return; // Skip pending for non-admin
                if (cat !== 'pending') return; 
            }
            
            const btn = document.createElement('button');
            btn.className = `filter-btn dynamic ${cat === 'pending' ? 'review-btn' : ''}`;
            btn.textContent = cat === 'pending' ? 'Pending Review 🔍' : cat.charAt(0).toUpperCase() + cat.slice(1);
            btn.setAttribute('data-filter', cat);
            if (cat === activeFilter) btn.classList.add('active');
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (cat === 'pending') {
                    getAllGalleryItems().forEach(item => {
                        item.style.display = item.classList.contains('pending-item') ? 'block' : 'none';
                    });
                } else {
                    filterItems(cat, searchInput.value.toLowerCase());
                }
            });
            filterContainer.appendChild(btn);
        });
    }

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
            if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();
        } else {
            document.getElementById('authContainer').classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
        refreshGallery();
    });

    // Toggle User Dropdown on Click (More stable than hover)
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.querySelector('.user-dropdown');
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => userDropdown.classList.remove('active'));
    }

    if (myDashboardBtn) {
        myDashboardBtn.addEventListener('click', () => {
            if (!currentUser) return;
            dashboardModal.classList.add('active');
            updateDashboardStats();
        });
    }

    async function updateDashboardStats() {
        const uploads = document.getElementById('statUploads');
        const score = document.getElementById('statScore');
        const rupees = document.getElementById('statRupees');
        
        if (currentUser.email === ADMIN_EMAIL) {
            if (uploads) uploads.textContent = "ADMIN";
            if (score) score.textContent = "N/A";
            if (rupees) rupees.textContent = "MODERATOR";
            return;
        }

        // Use once listener for the dashboard stats
        onValue(dRef(db, 'gallery'), (snapshot) => {
            const data = snapshot.val();
            let count = 0;
            if (data) {
                Object.values(data).forEach(item => {
                    if (item.ownerId === currentUser.uid && item.status === 'approved') count++;
                });
            }
            const totalPoints = count * 10;
            const totalRupees = (totalPoints / 1000).toFixed(2); 
            
            if (uploads) uploads.textContent = count;
            if (score) score.textContent = totalPoints;
            if (rupees) rupees.textContent = `₹${totalRupees}`;
        }, { onlyOnce: true });
    }

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

    logoutBtn.addEventListener('click', async () => {
        try {
            logoutBtn.textContent = "Logging out...";
            await signOut(auth);
            // Force reload to clear all states and prevent "stuck" UI
            window.location.reload();
        } catch (error) {
            alert("Logout failed: " + error.message);
        }
    });

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
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const snapshot = await uploadBytes(sRef(storage, `gallery/${fileName}`), file);
            const url = await getDownloadURL(snapshot.ref);

            const newRef = push(dRef(db, 'gallery'));
            await set(newRef, {
                title, category, url, fileName,
                ownerId: currentUser.uid,
                ownerEmail: currentUser.email,
                timestamp: Date.now(),
                status: 'pending' // Default to pending
            });

            uploadForm.reset();
            uploadModal.classList.remove('active');
            alert("Visual added!");
            window.location.reload();
        } catch (error) {
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
        const isApproved = data.status === 'approved';
        const isOwner = currentUser && data.ownerId === currentUser.uid;
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

        // Hide pending items from the public
        if (!isApproved && !isOwner && !isAdmin) return;

        const item = document.createElement('div');
        item.className = `gallery-item ${data.category.toLowerCase().trim()} ${!isApproved ? 'pending-item' : ''}`;
        item.id = `item-${id}`;
        item.setAttribute('data-category', data.category.toLowerCase());
        item.setAttribute('data-title', data.title);
        
        item.innerHTML = `
            <div class="image-box">
                <img src="${data.url}" alt="${data.title}">
                <div class="admin-actions">
                    ${isAdmin && !isApproved ? `<button class="approve-btn">Approve ✅</button>` : ''}
                    <button class="delete-btn">🗑️</button>
                </div>
                <div class="overlay">
                    <span>${data.category}</span>
                    ${!isApproved ? `<small class="pending-label">${isAdmin ? '⚠️ NEEDS APPROVAL' : '(Pending Review)'}</small>` : ''}
                </div>
            </div>
        `;

        const approveBtn = item.querySelector('.approve-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleApprove(id);
            });
        }

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete?")) handleDelete(id, data.fileName);
        });

        item.addEventListener('click', () => openLightbox(item));
        galleryGrid.prepend(item);
        updateDeleteVisibility(item);
    }

    async function handleApprove(id) {
        try {
            await set(dRef(db, `gallery/${id}/status`), 'approved');
            alert("Photo Approved! Points awarded.");
        } catch (error) { alert(error.message); }
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
            if (contactModal) contactModal.classList.remove('active');
            if (dashboardModal) dashboardModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.classList.remove('active');
        if (e.target === uploadModal) uploadModal.classList.remove('active');
        if (e.target === contactModal) contactModal.classList.remove('active');
        if (e.target === dashboardModal) dashboardModal.classList.remove('active');
        if (e.target === lightbox) lightbox.classList.remove('active');
    });

    // =============================================
    // CONTACT SYSTEM (RTDB)
    // =============================================
    const contactBtn = document.getElementById('contactBtn');
    const contactBtnUser = document.getElementById('contactBtnUser');
    const contactModal = document.getElementById('contactModal');
    const contactForm = document.getElementById('contactForm');
    const adminContactEdit = document.getElementById('adminContactEdit');

    const openContact = () => {
        contactModal.classList.add('active');
        if (currentUser && currentUser.email === ADMIN_EMAIL) {
            adminContactEdit.classList.remove('hidden');
        } else {
            adminContactEdit.classList.add('hidden');
        }
    };

    if (contactBtn) contactBtn.addEventListener('click', openContact);
    if (contactBtnUser) contactBtnUser.addEventListener('click', openContact);

    // Sync Contact Info
    onValue(dRef(db, 'site_contact'), (snapshot) => {
        const data = snapshot.val() || { email: 'contact@lumina.com' };
        const dEmail = document.getElementById('displayEmail');
        if (dEmail) dEmail.textContent = data.email;
        
        // Pre-fill edit form
        const eEmail = document.getElementById('editEmail');
        if (eEmail) eEmail.value = data.email;
    });

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await set(dRef(db, 'site_contact'), {
                    email: document.getElementById('editEmail').value
                });
                alert("Contact Email Updated!");
            } catch (error) { alert(error.message); }
        });
    }

    initStaticItems();
    updateDynamicFilters();
});

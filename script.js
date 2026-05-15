/**
 * Lumina Image Gallery Script
 * Handles filtering, search, lightbox, auth, uploads, and admin
 */

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJRmce7aIWdgDW79NN74dNnmuN_2MMEHM",
  authDomain: "codealpha-image-gallery.firebaseapp.com",
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
const db = getFirestore(app);
const auth = getAuth(app);

// Admin Configuration
const ADMIN_EMAIL = "anik.da@gmail.com";
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryGrid = document.getElementById('gallery');
    const searchInput = document.getElementById('searchInput');
    const loader = document.getElementById('loader');
    
    // Auth Elements
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const toggleAuth = document.getElementById('toggleAuth');
    const authForm = document.getElementById('authForm');
    const authContainer = document.getElementById('authContainer');
    const userProfile = document.getElementById('userProfile');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const myUploadsBtn = document.getElementById('myUploadsBtn');
    
    // Upload Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const uploadForm = document.getElementById('uploadForm');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    
    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.querySelector('.close-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    let currentIndex = 0;

    // Close modal buttons — use querySelectorAll to get ALL close buttons
    const closeAuthModal = document.querySelector('.close-auth-modal');
    const closeUploadModal = uploadModal.querySelector('.close-modal');

    // =============================================
    // 1. LOADER
    // =============================================
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 800);
    });

    // =============================================
    // 2. FILTERING & SEARCH (works on ALL items)
    // =============================================
    function getAllGalleryItems() {
        return document.querySelectorAll('.gallery-item');
    }

    function getVisibleItems() {
        return Array.from(getAllGalleryItems()).filter(item => item.style.display !== 'none');
    }

    function filterItems(category, search) {
        getAllGalleryItems().forEach(item => {
            const itemCategory = item.getAttribute('data-category');
            const itemTitle = (item.getAttribute('data-title') || '').toLowerCase();
            
            const matchesCategory = category === 'all' || itemCategory === category;
            const matchesSearch = !search || itemTitle.includes(search) || (itemCategory && itemCategory.includes(search));

            if (matchesCategory && matchesSearch) {
                item.style.display = 'block';
                item.style.animation = 'fadeIn 0.5s ease backwards';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Search input handler
    searchInput.addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.filter-btn.active');
        const category = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        filterItems(category, e.target.value.toLowerCase());
    });

    // Static filter buttons (initial ones from HTML)
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterItems(button.getAttribute('data-filter'), searchInput.value.toLowerCase());
        });
    });

    // =============================================
    // 3. DYNAMIC FILTER GENERATION
    // =============================================
    function updateDynamicFilters() {
        const categories = new Set(['all']);
        // Collect from static items
        getAllGalleryItems().forEach(item => {
            const cat = item.getAttribute('data-category');
            if (cat) categories.add(cat);
        });

        const filterContainer = document.querySelector('.filter-buttons');
        const activeFilter = filterContainer.querySelector('.active')?.getAttribute('data-filter') || 'all';
        filterContainer.innerHTML = '';

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `filter-btn ${cat === activeFilter ? 'active' : ''}`;
            btn.setAttribute('data-filter', cat);
            btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterItems(cat, searchInput.value.toLowerCase());
            });
            filterContainer.appendChild(btn);
        });
    }

    // =============================================
    // 4. LIGHTBOX
    // =============================================
    function openLightbox(item) {
        const img = item.querySelector('img');
        const title = item.getAttribute('data-title');
        
        lightboxImg.src = img.src;
        lightboxCaption.textContent = title;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showNext() {
        const visible = getVisibleItems();
        if (visible.length === 0) return;
        currentIndex = (currentIndex + 1) % visible.length;
        updateLightboxContent(visible);
    }

    function showPrev() {
        const visible = getVisibleItems();
        if (visible.length === 0) return;
        currentIndex = (currentIndex - 1 + visible.length) % visible.length;
        updateLightboxContent(visible);
    }

    function updateLightboxContent(visible) {
        const nextItem = visible[currentIndex];
        if (!nextItem) return;
        const img = nextItem.querySelector('img');
        const title = nextItem.getAttribute('data-title');
        
        lightboxImg.style.opacity = '0';
        setTimeout(() => {
            lightboxImg.src = img.src;
            lightboxCaption.textContent = title;
            lightboxImg.style.opacity = '1';
        }, 200);
    }

    // Attach lightbox click to static items
    getAllGalleryItems().forEach(item => {
        item.addEventListener('click', () => {
            const visible = getVisibleItems();
            currentIndex = visible.indexOf(item);
            openLightbox(item);
        });
    });

    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });

    // =============================================
    // 5. AUTHENTICATION
    // =============================================
    let isLoginMode = true;

    const toggleAuthMode = () => {
        isLoginMode = !isLoginMode;
        document.getElementById('authTitle').innerHTML = isLoginMode 
            ? 'Welcome <span class="gradient-text">Back</span>' 
            : 'Create <span class="gradient-text">Account</span>';
        document.getElementById('authBtnText').textContent = isLoginMode ? 'Login' : 'Sign Up';
        document.getElementById('authSwitchText').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuth.textContent = isLoginMode ? 'Sign Up' : 'Login';
    };

    loginBtn.addEventListener('click', () => { 
        isLoginMode = true; 
        toggleAuthMode(); 
        toggleAuthMode(); // double-toggle to reset to login
        authModal.classList.add('active'); 
    });
    signupBtn.addEventListener('click', () => { 
        isLoginMode = false; 
        toggleAuthMode(); 
        toggleAuthMode(); // double-toggle to reset to signup
        authModal.classList.add('active'); 
    });
    toggleAuth.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });
    closeAuthModal.addEventListener('click', () => authModal.classList.remove('active'));

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        
        document.getElementById('authBtnLoader').classList.remove('hidden');
        document.getElementById('authSubmit').disabled = true;

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            authModal.classList.remove('active');
            authForm.reset();
        } catch (error) {
            alert(error.message);
        } finally {
            document.getElementById('authBtnLoader').classList.add('hidden');
            document.getElementById('authSubmit').disabled = false;
        }
    });

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            authContainer.classList.add('hidden');
            userProfile.classList.remove('hidden');
            userEmailDisplay.textContent = user.email;
            document.getElementById('userAvatar').textContent = user.email.charAt(0).toUpperCase();
        } else {
            authContainer.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
        // Refresh delete buttons on all Firebase items
        refreshGallery();
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    // =============================================
    // 6. UPLOAD
    // =============================================
    uploadBtn.addEventListener('click', () => uploadModal.classList.add('active'));
    closeUploadModal.addEventListener('click', () => uploadModal.classList.remove('active'));
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Please login to upload!");

        const file = document.getElementById('imageFile').files[0];
        const title = document.getElementById('imageTitle').value;
        const category = document.getElementById('imageCategory').value;
        
        btnText.textContent = 'Uploading...';
        btnLoader.classList.remove('hidden');
        document.getElementById('submitUpload').disabled = true;

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `gallery/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "gallery"), {
                title,
                category,
                url: downloadURL,
                fileName: fileName,
                ownerId: currentUser.uid,
                ownerEmail: currentUser.email,
                timestamp: serverTimestamp()
            });

            uploadForm.reset();
            uploadModal.classList.remove('active');
        } catch (error) {
            alert(error.message);
        } finally {
            btnText.textContent = 'Post to Gallery';
            btnLoader.classList.add('hidden');
            document.getElementById('submitUpload').disabled = false;
        }
    });

    // Close modals when clicking outside
    authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.remove('active'); });
    uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) uploadModal.classList.remove('active'); });

    // =============================================
    // 7. REAL-TIME FIRESTORE LISTENER
    // =============================================
    const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                createGalleryItem(change.doc);
            } else if (change.type === "removed") {
                const item = document.getElementById(`item-${change.doc.id}`);
                if (item) item.remove();
            }
        });
        updateDynamicFilters();
    });

    function createGalleryItem(docSnap) {
        const data = docSnap.data();
        const id = docSnap.id;
        const cleanCategory = data.category.toLowerCase().trim();
        
        const item = document.createElement('div');
        item.className = `gallery-item ${cleanCategory}`;
        item.id = `item-${id}`;
        item.setAttribute('data-category', cleanCategory);
        item.setAttribute('data-title', data.title);
        item.setAttribute('data-owner', data.ownerId || '');
        
        item.innerHTML = `
            <div class="image-box">
                <img src="${data.url}" alt="${data.title}" loading="lazy">
                <button class="delete-btn" title="Delete">🗑️</button>
                <div class="overlay">
                    <span>${data.category}</span>
                </div>
            </div>
        `;

        // Handle Delete click
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this visual?")) {
                handleDelete(id, data.fileName);
            }
        });

        // Handle lightbox click
        item.addEventListener('click', () => {
            const visible = getVisibleItems();
            currentIndex = visible.indexOf(item);
            openLightbox(item);
        });

        galleryGrid.prepend(item);
        updateDeleteVisibility(item, data.ownerId);
    }

    // =============================================
    // 8. DELETE LOGIC (Admin + Owner)
    // =============================================
    async function handleDelete(docId, fileName) {
        try {
            await deleteDoc(doc(db, "gallery", docId));
            const storageRef = ref(storage, `gallery/${fileName}`);
            await deleteObject(storageRef);
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    }

    function updateDeleteVisibility(item, ownerId) {
        const deleteBtn = item.querySelector('.delete-btn');
        if (!deleteBtn) return;

        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
        const isOwner = currentUser && currentUser.uid === ownerId;
        
        if (isAdmin || isOwner) {
            deleteBtn.classList.add('can-delete');
        } else {
            deleteBtn.classList.remove('can-delete');
        }
    }

    function refreshGallery() {
        document.querySelectorAll('.gallery-item[id^="item-"]').forEach(item => {
            const ownerId = item.getAttribute('data-owner');
            updateDeleteVisibility(item, ownerId);
        });
    }

    // =============================================
    // 9. MY UPLOADS FILTER
    // =============================================
    myUploadsBtn.addEventListener('click', () => {
        if (!currentUser) return;
        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        
        getAllGalleryItems().forEach(item => {
            const ownerId = item.getAttribute('data-owner');
            item.style.display = (ownerId === currentUser.uid) ? 'block' : 'none';
        });
    });
});

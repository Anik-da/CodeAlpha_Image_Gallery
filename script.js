/**
 * Lumina Image Gallery Script
 * Handles filtering, search, and lightbox functionality
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
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
const ADMIN_EMAIL = "anik.da@gmail.com"; // Change this to your actual email
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryGrid = document.getElementById('gallery');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
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
    const closeModal = document.querySelector('.close-modal');
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
    let visibleItems = Array.from(galleryItems);

    // Initial filter setup
    updateDynamicFilters();

    // 1. Hide Loader
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 800); // Small delay for premium feel
    });

    // 2. Filtering Logic
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');
            
            filterItems(filterValue, searchInput.value.toLowerCase());
        });
    });

    // 3. Search Logic
    searchInput.addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        const searchTerm = e.target.value.toLowerCase();
        
        filterItems(activeFilter, searchTerm);
    });

    function filterItems(category, search) {
        galleryItems.forEach(item => {
            const itemCategory = item.getAttribute('data-category');
            const itemTitle = item.getAttribute('data-title').toLowerCase();
            
            const matchesCategory = category === 'all' || itemCategory === category;
            const matchesSearch = itemTitle.includes(search) || itemCategory.includes(search);

            if (matchesCategory && matchesSearch) {
                item.style.display = 'block';
                // Trigger animation
                item.style.animation = 'fadeIn 0.5s ease backwards';
            } else {
                item.style.display = 'none';
            }
        });

        // Update visible items for lightbox navigation
        updateVisibleItems();
    }

    function updateVisibleItems() {
        visibleItems = Array.from(galleryItems).filter(item => item.style.display !== 'none');
    }

    // 4. Lightbox Logic
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = visibleItems.indexOf(item);
            openLightbox(item);
        });
    });

    function openLightbox(item) {
        const img = item.querySelector('img');
        const title = item.getAttribute('data-title');
        
        lightboxImg.src = img.src;
        lightboxCaption.textContent = title;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % visibleItems.length;
        updateLightboxContent();
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
        updateLightboxContent();
    }

    function updateLightboxContent() {
        const nextItem = visibleItems[currentIndex];
        const img = nextItem.querySelector('img');
        const title = nextItem.getAttribute('data-title');
        
        // Add a small fade effect during transition
        lightboxImg.style.opacity = '0';
        setTimeout(() => {
            lightboxImg.src = img.src;
            lightboxCaption.textContent = title;
            lightboxImg.style.opacity = '1';
        }, 200);
    }

    // Event Listeners for Lightbox
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // 5. Auth Logic
    let isLoginMode = true;

    const toggleAuthMode = () => {
        isLoginMode = !isLoginMode;
        document.getElementById('authTitle').innerHTML = isLoginMode ? 'Welcome <span class="gradient-text">Back</span>' : 'Create <span class="gradient-text">Account</span>';
        document.getElementById('authBtnText').textContent = isLoginMode ? 'Login' : 'Sign Up';
        document.getElementById('authSwitchText').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuth.textContent = isLoginMode ? 'Sign Up' : 'Login';
    };

    loginBtn.addEventListener('click', () => { isLoginMode = true; toggleAuthMode(); authModal.classList.add('active'); });
    signupBtn.addEventListener('click', () => { isLoginMode = false; toggleAuthMode(); authModal.classList.add('active'); });
    toggleAuth.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });
    document.querySelector('.close-auth-modal').addEventListener('click', () => authModal.classList.remove('active'));

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
        // Refresh gallery to show/hide delete buttons
        refreshGallery();
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    // 6. Upload Functionality
    uploadBtn.addEventListener('click', () => uploadModal.classList.add('active'));
    closeModal.addEventListener('click', () => uploadModal.classList.remove('active'));
    
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
        updateVisibleItems();
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
        item.setAttribute('data-owner', data.ownerId);
        
        item.innerHTML = `
            <div class="image-box">
                <img src="${data.url}" alt="${data.title}" loading="lazy">
                <button class="delete-btn" title="Delete">🗑️</button>
                <div class="overlay">
                    <span>${data.category}</span>
                </div>
            </div>
        `;

        // Handle Delete
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this visual?")) {
                handleDelete(id, data.fileName);
            }
        });

        item.addEventListener('click', () => {
            currentIndex = visibleItems.indexOf(item);
            openLightbox(item);
        });

        galleryGrid.prepend(item);
        updateDeleteVisibility(item, data.ownerId);
    }

    function updateDynamicFilters() {
        const categories = new Set(['all']);
        document.querySelectorAll('.gallery-item').forEach(item => {
            categories.add(item.getAttribute('data-category'));
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
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
        const isOwner = currentUser && currentUser.uid === ownerId;
        
        if (isAdmin || isOwner) {
            deleteBtn.style.display = 'flex';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    function refreshGallery() {
        document.querySelectorAll('.gallery-item[id^="item-"]').forEach(item => {
            const ownerId = item.getAttribute('data-owner');
            updateDeleteVisibility(item, ownerId);
        });
    }

    myUploadsBtn.addEventListener('click', () => {
        if (!currentUser) return;
        galleryItems.forEach(item => item.style.display = 'none');
        document.querySelectorAll('.gallery-item[id^="item-"]').forEach(item => {
            const ownerId = item.getAttribute('data-owner');
            item.style.display = (ownerId === currentUser.uid) ? 'block' : 'none';
        });
        updateVisibleItems();
    });
});

/**
 * Lumina Image Gallery Script
 * Handles filtering, search, and lightbox functionality
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryGrid = document.getElementById('gallery');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const loader = document.getElementById('loader');
    
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

    // 5. Upload Functionality
    uploadBtn.addEventListener('click', () => uploadModal.classList.add('active'));
    closeModal.addEventListener('click', () => uploadModal.classList.remove('active'));
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = document.getElementById('imageFile').files[0];
        const title = document.getElementById('imageTitle').value;
        const category = document.getElementById('imageCategory').value;
        
        if (!file) return;

        // Start Loading
        btnText.textContent = 'Uploading...';
        btnLoader.classList.remove('hidden');
        document.getElementById('submitUpload').disabled = true;

        try {
            // 1. Upload to Storage
            const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // 2. Save Metadata to Firestore
            await addDoc(collection(db, "gallery"), {
                title,
                category,
                url: downloadURL,
                timestamp: serverTimestamp()
            });

            // Success
            uploadForm.reset();
            uploadModal.classList.remove('active');
            alert('Visual shared successfully!');
        } catch (error) {
            console.error("Upload failed:", error);
            alert('Upload failed. Please check your Firebase rules.');
        } finally {
            btnText.textContent = 'Post to Gallery';
            btnLoader.classList.add('hidden');
            document.getElementById('submitUpload').disabled = false;
        }
    });

    // 6. Real-time Firestore Listener
    const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        // Clear previous dynamic items if any (or just append)
        // For simplicity, we'll append new ones
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                createGalleryItem(data);
            }
        });
        updateVisibleItems();
    });

    function createGalleryItem(data) {
        const item = document.createElement('div');
        item.className = `gallery-item ${data.category}`;
        item.setAttribute('data-category', data.category);
        item.setAttribute('data-title', data.title);
        
        item.innerHTML = `
            <div class="image-box">
                <img src="${data.url}" alt="${data.title}" loading="lazy">
                <div class="overlay">
                    <span>${data.category}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            currentIndex = visibleItems.indexOf(item);
            openLightbox(item);
        });

        galleryGrid.prepend(item);
    }
});

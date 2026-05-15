/**
 * Lumina Image Gallery Script
 * Handles filtering, search, and lightbox functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryItems = document.querySelectorAll('.gallery-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const loader = document.getElementById('loader');
    
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

    // Close on click outside
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });
});

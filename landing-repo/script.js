// 1. Blob Interaction
const blobs = document.querySelectorAll('.blob');
window.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    blobs.forEach((blob, index) => {
        const offset = (index + 1) * 20;
        blob.style.transform = `translate(${x * offset}px, ${y * offset}px)`;
    });
});

// 2. Smooth Scroll Reveal
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add revealing animation to cards
document.querySelectorAll('.card').forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = `all 0.8s ease ${index * 0.1}s`;

    // Create a simple animation class via CSS in script if needed
    // But easier to just observe
    observer.observe(card);
});

// Implementation of the visible class
const style = document.createElement('style');
style.innerHTML = `
    .card.visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// 3. Mockup Tilt Effect
const mockup = document.querySelector('.mockup');
if (mockup) {
    mockup.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = mockup.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;

        mockup.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });

    mockup.addEventListener('mouseleave', () => {
        mockup.style.transform = `perspective(1000px) rotateY(0deg) rotateX(10deg)`;
    });
}

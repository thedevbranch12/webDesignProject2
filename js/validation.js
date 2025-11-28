// JavaScript Requirements:
// Validate required fields
// Validate email format
// Ensure role and destination selected
// Save astronaut data to localStorage
// Redirect to roster page -->
 
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('astronautForm');
    // Dynamic scaling: scale the form so it fits the viewport (useful on short mobile screens)
    (function setupDynamicScaling(){
        const frame = document.querySelector('.form-frame');
        const inner = document.querySelector('.form-inner');
        if (!frame || !inner || !form) return;

        function adjustFormScale(){
            // measurements
            const header = document.querySelector('header');
            const headerH = header ? header.getBoundingClientRect().height : 0;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            // available space for the form (leave small margins)
            const availableW = Math.max(240, viewportW - 40);
            const availableH = Math.max(240, viewportH - headerH - 80);

            // reset transform to measure natural size
            inner.style.transform = 'none';
            const naturalW = form.scrollWidth || form.offsetWidth;
            const naturalH = form.scrollHeight || form.offsetHeight;

            let scale = 1;
            if (naturalW > availableW || naturalH > availableH) {
                const sx = availableW / naturalW;
                const sy = availableH / naturalH;
                scale = Math.max(0.5, Math.min(sx, sy, 1));
            }

            inner.style.transform = `scale(${scale})`;
        }

        // debounce resize events
        let resizeTimer = null;
        function debouncedAdjust(){
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { adjustFormScale(); resizeTimer = null; }, 100);
        }

        // run initially and on resize/orientation change
        adjustFormScale();
        window.addEventListener('resize', debouncedAdjust);
        window.addEventListener('orientationchange', debouncedAdjust);

        // also adjust after fonts/images load (small delay helps)
        setTimeout(adjustFormScale, 250);
    })();
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        // Validate form fields
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const role = document.getElementById('role').value;
        const destination = document.getElementById('destination').value;
        const experienceEl = document.querySelector('input[name="experience"]:checked');
        const experience = experienceEl ? experienceEl.value : '';
        if (!name || !email || !role || !destination || !experience) {
            alert('Please fill in all required fields (including experience).');
            return;
        }
        const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
        if (!email.match(emailPattern)) {
            alert('Please enter a valid email address.');
            return;
        }
        // optional fields
        const snack = document.getElementById('snack') ? document.getElementById('snack').value.trim() : '';
        const motto = document.getElementById('motto') ? document.getElementById('motto').value.trim() : '';

        // Save data to localStorage
        const astronaut = { name, email, role, destination, experience, snack, motto };
        let astronauts = JSON.parse(localStorage.getItem('astronauts')) || [];
        astronauts.push(astronaut);
        localStorage.setItem('astronauts', JSON.stringify(astronauts));
        // Redirect to roster page
        window.location.href = 'roster.html';
    });
});
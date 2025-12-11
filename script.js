/* script.js — Clean, robust version for the premium site
   - Guarded DOM access (no crashes)
   - LocalStorage gallery & posts
   - Lightbox with download & delete
   - Admin demo panel
   - EmailJS integration ready (values inserted)
*/

/* ---------- Helpers ---------- */
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------- App init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initYear();
    initPreloader();
    initCursor();
    initThemeToggle();
    initMenuToggle();
    initParallax();
    initTimelineReveal();
    initGallery();
    initUploadHandlers();
    initAdminModal();
    initTestimonialSlider();
    initContactForm();
    loadPostsFromStorage();
  } catch (err) {
    console.error('Init error:', err);
  }
});

/* ---------- Year ---------- */
function initYear() {
  const el = qs('#yearSpan');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- PRELOADER ---------- */
function initPreloader() {
  const pre = qs('#preloader');
  if (!pre) return;
  setTimeout(() => {
    pre.style.transition = 'opacity .45s ease';
    pre.style.opacity = '0';
    setTimeout(() => {
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    }, 480);
  }, 350);
}

/* ---------- Animated cursor ---------- */
function initCursor() {
  const cursor = qs('#cursor');
  if (!cursor) return;

  let lastMove = 0;
  document.addEventListener('mousemove', (e) => {
    if (Date.now() - lastMove < 16) return; // throttle ~60fps
    lastMove = Date.now();
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  const interactors = ['a', 'button', 'input', 'textarea', '.btn'];
  interactors.forEach((sel) => {
    qsa(sel).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'translate(-50%,-50%) scale(1.6)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      });
    });
  });
}

/* ---------- Theme toggle ---------- */
function initThemeToggle() {
  const btn = qs('#themeToggle');
  if (!btn) return;

  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.classList.add('light-mode');
  updateThemeIcon(btn);

  btn.addEventListener('click', () => {
    document.documentElement.classList.toggle('light-mode');
    const mode = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', mode);
    updateThemeIcon(btn);
  });

  function updateThemeIcon(button) {
    if (!button) return;
    button.innerHTML = document.documentElement.classList.contains('light-mode')
      ? '<i class="fa fa-sun"></i>'
      : '<i class="fa fa-moon"></i>';
  }
}

/* ---------- Mobile menu toggle ---------- */
function initMenuToggle() {
  const menuBtn = qs('#menuBtn');
  const navLinks = qs('#navLinks');
  if (!menuBtn || !navLinks) return;

  menuBtn.addEventListener('click', () => {
    navLinks.style.display =
      getComputedStyle(navLinks).display === 'flex' ? 'none' : 'flex';
  });

  qsa('#navLinks a').forEach((a) =>
    a.addEventListener('click', () => {
      if (window.innerWidth <= 760) navLinks.style.display = 'none';
    })
  );
}

/* ---------- Parallax ---------- */
function initParallax() {
  const layers = qsa('.hero-layers .layer');
  if (!layers.length) return;

  window.addEventListener('scroll', () => {
    const sc = window.scrollY;
    layers.forEach((l, i) => {
      const factor = 0.02 + i * 0.02;
      l.style.transform = `translateY(${sc * factor}px)`;
    });
  });
}

/* ---------- Timeline reveal ---------- */
function initTimelineReveal() {
  const items = qsa('.timeline-item');
  if (!items.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((it) => obs.observe(it));
}

/* ---------- Gallery (localStorage) ---------- */
const GALLERY_KEY = 'ters_gallery_images';

function initGallery() {
  loadGalleryFromStorage();
}

function loadGalleryFromStorage() {
  const raw = localStorage.getItem(GALLERY_KEY);
  const grid = qs('#galleryGrid');
  if (!grid) return;

  grid.innerHTML = '';
  if (!raw) return;

  try {
    const arr = JSON.parse(raw);
    arr.slice().reverse().forEach((dataUrl) => appendImageToGrid(dataUrl));
  } catch (err) {
    console.error('Gallery parse error:', err);
  }
}

function appendImageToGrid(dataUrl) {
  const grid = qs('#galleryGrid');
  if (!grid) return;

  const fig = document.createElement('figure');
  fig.innerHTML = `
    <img src="${dataUrl}" alt="gallery-image" loading="lazy">
    <figcaption>Click to open</figcaption>
  `;

  const imgEl = fig.querySelector('img');
  if (imgEl) {
    imgEl.addEventListener('click', () => openLightbox(dataUrl));
  }
  grid.prepend(fig);
}

/* ---------- Upload ---------- */
function initUploadHandlers() {
  const uploadInput = qs('#uploadInput');
  const addBtn = qs('#addImageBtn');
  const clearBtn = qs('#clearGalleryBtn');

  if (addBtn && uploadInput) addBtn.addEventListener('click', () => uploadInput.click());

  if (uploadInput) {
    uploadInput.addEventListener('change', (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) return alert('Please choose an image');
      if (file.size > 5 * 1024 * 1024) return alert('Image too large (max 5MB)');

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string') {
            console.error('Unexpected FileReader result type');
            return;
          }
          const arr = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
          arr.push(dataUrl);
          localStorage.setItem(GALLERY_KEY, JSON.stringify(arr));
          loadGalleryFromStorage();
        } catch (err) {
          console.error('Save failed:', err);
        }
      };

      reader.readAsDataURL(file);
      uploadInput.value = '';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all gallery images?')) {
        localStorage.removeItem(GALLERY_KEY);
        loadGalleryFromStorage();
      }
    });
  }
}

/* ---------- Lightbox ---------- */
function openLightbox(dataUrl) {
  const popup = document.createElement('div');
  popup.className = 'popup-view';

  popup.innerHTML = `
    <div class="popup-content" role="dialog" aria-modal="true">
      <img src="${dataUrl}" alt="preview">
      <div class="popup-actions">
        <button class="btn small closePopup">Close</button>
        <button class="btn small ghost downloadImg">Download</button>
        <button class="btn small deleteImg" style="background:#b91c1c;color:white">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const closeBtn = qs('.closePopup', popup);
  const downloadBtn = qs('.downloadImg', popup);
  const deleteBtn = qs('.deleteImg', popup);

  if (closeBtn) closeBtn.onclick = () => popup.remove();

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'image';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }

  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (!confirm('Delete this image?')) return;
      try {
        const arr = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
        const idx = arr.indexOf(dataUrl);
        if (idx > -1) {
          arr.splice(idx, 1);
          localStorage.setItem(GALLERY_KEY, JSON.stringify(arr));
          loadGalleryFromStorage();
          popup.remove();
        } else {
          const foundIdx = arr.findIndex((d) => d && d.endsWith(dataUrl.slice(-50)));
          if (foundIdx > -1) {
            arr.splice(foundIdx, 1);
            localStorage.setItem(GALLERY_KEY, JSON.stringify(arr));
            loadGalleryFromStorage();
            popup.remove();
          } else {
            alert('Image not found in gallery');
          }
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    };
  }
}

/* ---------- Blog storage ---------- */
const POSTS_KEY = 'ters_blog_posts';

function loadPostsFromStorage() {
  const raw = localStorage.getItem(POSTS_KEY);
  const wrap = qs('#posts');
  if (!wrap) return;

  wrap.innerHTML = '';
  if (!raw) return;

  try {
    const arr = JSON.parse(raw).slice().reverse();
    arr.forEach((p) => {
      const el = document.createElement('article');
      el.className = 'post';
      el.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.content)}</p>
        <div><small>Saved: ${new Date(p.time).toLocaleString()}</small></div>
      `;
      wrap.appendChild(el);
    });
  } catch (err) {
    console.error('Posts parse failed:', err);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

/* ---------- Admin Panel ---------- */
function initAdminModal() {
  const adminBtn = qs('#adminBtn');
  const modal = qs('#adminModal');
  const closeBtn = qs('#closeAdmin');

  const loginBtn = qs('#loginAdminBtn');
  const logoutBtn = qs('#logoutAdminBtn');
  const adminPass = qs('#adminPass');
  const adminPanel = qs('#adminPanel');
  const adminLogin = qs('#adminLogin');

  const adminNewPostBtn = qs('#adminNewPostBtn');
  const adminAddBtn = qs('#adminAddBtn'); // triggers uploadInput
  const adminClearBtn = qs('#adminClearBtn'); // clears gallery

  if (!adminBtn || !modal) return;

  adminBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  if (closeBtn) closeBtn.onclick = () => (modal.style.display = 'none');

  if (loginBtn) {
    loginBtn.onclick = () => {
      const pass = adminPass?.value?.trim() || '';
      if (pass === 'password123') {
        if (adminLogin) adminLogin.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        window.isAdmin = true;
        alert('Admin logged in');
      } else {
        alert('Wrong password — demo password: password123');
      }
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (adminLogin) adminLogin.style.display = 'block';
      if (adminPanel) adminPanel.style.display = 'none';
      window.isAdmin = false;
      alert('Logged out');
    };
  }

  if (adminNewPostBtn) {
    adminNewPostBtn.onclick = () => {
      const title = prompt('Post title:');
      const content = prompt('Post content:');
      if (!title || !content) return;

      try {
        const arr = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
        arr.push({ title, content, time: Date.now() });
        localStorage.setItem(POSTS_KEY, JSON.stringify(arr));
        loadPostsFromStorage();
        alert('Post saved');
      } catch (err) {
        console.error('Saving post failed:', err);
        alert('Save failed');
      }
    };
  }

  if (adminAddBtn) {
    adminAddBtn.onclick = () => {
      const uploadInput = qs('#uploadInput');
      if (uploadInput) uploadInput.click();
    };
  }

  if (adminClearBtn) {
    adminClearBtn.onclick = () => {
      if (confirm('Clear all gallery images?')) {
        localStorage.removeItem(GALLERY_KEY);
        loadGalleryFromStorage();
      }
    };
  }

  // main New Post button behavior
  const mainNewPost = qs('#newPostBtn');
  if (mainNewPost) {
    mainNewPost.onclick = () => {
      if (window.isAdmin) {
        if (adminNewPostBtn) adminNewPostBtn.click();
      } else {
        alert('Open the Admin panel to create posts (demo).');
        if (modal) modal.style.display = 'block';
      }
    };
  }
}

/* ---------- Contact Form (EmailJS) ---------- */
function initContactForm() {
  const form = qs('#contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameEl = qs('#name');
    const emailEl = qs('#email');
    const messageEl = qs('#message');

    const from_name = nameEl?.value?.trim() || '';
    const from_email = emailEl?.value?.trim() || '';
    const message = messageEl?.value?.trim() || '';

    if (!from_name || !from_email || !message) {
      return alert('Please fill in name, email and message');
    }

    if (!/^\S+@\S+\.\S+$/.test(from_email)) {
      return alert('Please provide a valid email address');
    }

    const params = { from_name, from_email, message };

    // EmailJS service & template IDs inserted as requested
    // SERVICE ID: service_jj973is
    // TEMPLATE ID: Template_98zp8in
    const EMAILJS_SERVICE_ID = 'service_jj973is';
    const EMAILJS_TEMPLATE_ID = 'Template_98zp8in';

    if (typeof window.emailjs?.send !== 'function') {
      console.warn('emailjs not loaded - form submission skipped');
      return alert('Email service not available');
    }

    window.emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
      .then(() => {
        const msgEl = qs('#contactMsg');
        if (msgEl) {
          msgEl.textContent = 'Message sent! Thank you.';
          setTimeout(() => (msgEl.textContent = ''), 4000);
        } else {
          alert('Message sent!');
        }
      })
      .catch((err) => {
        console.error('EmailJS send failed:', err);
        alert('Send failed');
      });
  });
}

/* ---------- Testimonials slider ---------- */
function initTestimonialSlider() {
  const container = qs('#testimonialContainer');
  if (!container) return;

  const items = qsa('.testimonial', container);
  if (!items.length) return;

  let idx = 0;
  items.forEach((el, i) => (el.style.display = i === 0 ? 'block' : 'none'));

  setInterval(() => {
    if (!items[idx]) return;
    items[idx].style.display = 'none';
    idx = (idx + 1) % items.length;
    if (items[idx]) items[idx].style.display = 'block';
  }, 5000);
}
// Smooth scrolling for nav links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Fade-in animation on scroll
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll(".section, .service-card, .gallery-item, .post-card, .testimonial").forEach(el => {
  observer.observe(el);
});

// Placeholder for future Firebase features
console.log("Site loaded. Firebase will be connected soon.");

// AUTH MODAL LOGIC
const authModal = document.getElementById("authModal");
const openAuth = document.getElementById("openAuth");
const closeAuth = document.getElementById("closeAuth");
const authTitle = document.getElementById("authTitle");
const authActionBtn = document.getElementById("authActionBtn");
const switchToLogin = document.getElementById("switchToLogin");

let isLogin = false;

openAuth.addEventListener("click", () => {
  authModal.style.display = "flex";
});

closeAuth.addEventListener("click", () => {
  authModal.style.display = "none";
});

// Switch between login and signup
switchToLogin.addEventListener("click", () => {
  isLogin = !isLogin;

  if (isLogin) {
    authTitle.textContent = "Login";
    authActionBtn.textContent = "Login";
    switchToLogin.textContent = "Create Account";
  } else {
    authTitle.textContent = "Create Account";
    authActionBtn.textContent = "Sign Up";
    switchToLogin.textContent = "Login";
  }
});// -----------------------------
// AUTH ACTION (LOGIN / SIGNUP)
// -----------------------------
authActionBtn.addEventListener("click", () => {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  if (isLogin) {
    // LOGIN
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        alert("Logged in successfully");
        authModal.style.display = "none";
      })
      .catch(err => alert(err.message));
  } else {
    // SIGNUP
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        alert("Account created successfully");
        authModal.style.display = "none";
      })
      .catch(err => alert(err.message));
  }
});

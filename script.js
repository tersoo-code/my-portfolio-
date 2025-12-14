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
});const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    alert("Logged out");
  });
});

auth.onAuthStateChanged(user => {
  if (user) {
    logoutBtn.style.display = "inline-block";
  } else {
    logoutBtn.style.display = "none";
  }
});// PROFILE MODAL LOGIC
const profileModal = document.getElementById("profileModal");
const openProfile = document.getElementById("openProfile");
const closeProfile = document.getElementById("closeProfile");

openProfile.addEventListener("click", () => {
  profileModal.style.display = "flex";
});

closeProfile.addEventListener("click", () => {
  profileModal.style.display = "none";
});const saveProfileBtn = document.getElementById("saveProfileBtn");

saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");

  const username = document.getElementById("profileUsername").value;
  const bio = document.getElementById("profileBio").value;
  const imageFile = document.getElementById("profileImage").files[0];

  let photoURL = null;

  // Upload profile picture if selected
  if (imageFile) {
    const storageRef = storage.ref(`profiles/${user.uid}`);
    await storageRef.put(imageFile);
    photoURL = await storageRef.getDownloadURL();
  }

  // Save profile data to Firestore
  await db.collection("users").doc(user.uid).set({
    username,
    bio,
    photoURL
  }, { merge: true });

  alert("Profile updated!");
  profileModal.style.display = "none";
});auth.onAuthStateChanged(user => {
  if (user) {
    openAuth.style.display = "none";
    openProfile.style.display = "inline-block"; // show profile button
  } else {
    openAuth.style.display = "inline-block";
    openProfile.style.display = "none"; // hide profile button
  }
});





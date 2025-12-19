// ---------- SMOOTH SCROLLING ----------
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// ---------- FADE-IN ANIMATION ----------
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.2 }
);
document
  .querySelectorAll(".section, .service-card, .gallery-item, .post-card, .testimonial")
  .forEach(el => observer.observe(el));

// ---------- FIREBASE SERVICES (initialized in index.html) ----------
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ---------- UI ELEMENTS ----------
const authModal = document.getElementById("authModal");
const openAuth = document.getElementById("openAuth");
const closeAuth = document.getElementById("closeAuth");
const authTitle = document.getElementById("authTitle");
const authActionBtn = document.getElementById("authActionBtn");
const switchToLogin = document.getElementById("switchToLogin");
const logoutBtn = document.getElementById("logoutBtn");

const profileModal = document.getElementById("profileModal");
const openProfile = document.getElementById("openProfile");
const closeProfile = document.getElementById("closeProfile");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const postModal = document.getElementById("postModal");
const openPost = document.getElementById("openPost");
const closePost = document.getElementById("closePost");
const uploadPostBtn = document.getElementById("uploadPostBtn");

const feedContainer = document.getElementById("feedContainer");
const notifIcon = document.getElementById("notifIcon");
const notifDropdown = document.getElementById("notifDropdown");

// ---------- AUTH MODAL LOGIC ----------
let isLogin = false;
openAuth?.addEventListener("click", () => (authModal.style.display = "flex"));
closeAuth?.addEventListener("click", () => (authModal.style.display = "none"));

switchToLogin?.addEventListener("click", () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? "Login" : "Create Account";
  authActionBtn.textContent = isLogin ? "Login" : "Sign Up";
  switchToLogin.textContent = isLogin ? "Create Account" : "Login";
});

authActionBtn?.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  if (!email || !password) return alert("Please enter email and password");

  try {
    if (isLogin) {
      await auth.signInWithEmailAndPassword(email, password);
      alert("Logged in successfully");
    } else {
      const res = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection("users").doc(res.user.uid).set({
        email,
        username: email.split("@")[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        following: []
      });
      alert("Account created successfully");
    }
    authModal.style.display = "none";
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  alert("Logged out");
});

// ---------- AUTH STATE HANDLING ----------
auth.onAuthStateChanged(async user => {
  if (user) {
    logoutBtn?.style.setProperty("display", "inline-block");
    openAuth?.style.setProperty("display", "none");
    openProfile?.style.setProperty("display", "inline-block");
    openPost?.style.setProperty("display", "inline-block");

    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      await userRef.set({
        email: user.email,
        username: user.email.split("@")[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        following: []
      });
    }

    userRef
      .update({
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch(() => {});

    window.addEventListener("beforeunload", () => {
      userRef
        .update({
          online: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(() => {});
    });

    window.addEventListener("offline", () => {
      userRef
        .update({
          online: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(() => {});
    });

    window.addEventListener("online", () => {
      userRef.update({ online: true }).catch(() => {});
    });

    // These functions must exist somewhere below or in another script
    if (typeof loadFeedForUser === "function") {
      loadFeedForUser(user.uid);
    }
    if (typeof loadNotifications === "function") {
      loadNotifications(user.uid);
    }
  } else {
    logoutBtn?.style.setProperty("display", "none");
    openAuth?.style.setProperty("display", "inline-block");
    openProfile?.style.setProperty("display", "none");
    openPost?.style.setProperty("display", "none");

    if (feedContainer) {
      feedContainer.innerHTML = `<p style="text-align:center; margin-top:20px;">Log in to see your personalized feed.</p>`;
    }
    if (notifDropdown) notifDropdown.innerHTML = "";
    if (typeof loadAllPostsFallback === "function") {
      loadAllPostsFallback();
    }
  }
});

// ---------- PROFILE MODAL ----------
openProfile?.addEventListener("click", async () => {
  profileModal.style.display = "flex";
  const user = auth.currentUser;
  if (!user) return;
  const doc = await db.collection("users").doc(user.uid).get();
  if (doc.exists) {
    const data = doc.data();
    document.getElementById("profileUsername").value = data.username || "";
    document.getElementById("profileBio").value = data.bio || "";
  }
});
closeProfile?.addEventListener("click", () => (profileModal.style.display = "none"));

saveProfileBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");
  const username = document.getElementById("profileUsername").value.trim();
  const bio = document.getElementById("profileBio").value.trim();
  const imageFile = document.getElementById("profileImage").files[0];

  let photoURL = null;
  try {
    if (imageFile) {
      const storageRef = storage.ref(`profiles/${user.uid}/${Date.now()}_${imageFile.name}`);
      await storageRef.put(imageFile);
      photoURL = await storageRef.getDownloadURL();
    }
    await db.collection("users").doc(user.uid).set({ username, bio, photoURL }, { merge: true });
    alert("Profile updated!");
    profileModal.style.display = "none";
  } catch (err) {
    alert(err.message);
  }
});

// ---------- POST MODAL ----------
openPost?.addEventListener("click", () => (postModal.style.display = "flex"));
closePost?.addEventListener("click", () => (postModal.style.display = "none"));

uploadPostBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");
  const imageFile = document.getElementById("postImage").files[0];
  const caption = document.getElementById("postCaption").value.trim();
  if (!imageFile) return alert("Please select an image");

  try {
    const storageRef = storage.ref(`posts/${user.uid}/${Date.now()}_${imageFile.name}`);
    await storageRef.put(imageFile);
    const imageURL = await storageRef.getDownloadURL();

    await db.collection("posts").add({
      userId: user.uid,
      caption,
      imageURL,
      likes: [],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Post uploaded!");
    postModal.style.display = "none";
    document.getElementById("postCaption").value = "";
    document.getElementById("postImage").value = "";
  } catch (err) {
    alert(err.message);
  }
});
console.log("main-v2.js loaded. Social features initialized (v8).");


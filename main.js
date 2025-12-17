// Smooth scrolling for nav links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// Fade-in animation on scroll
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll(".section, .service-card, .gallery-item, .post-card, .testimonial")
  .forEach(el => observer.observe(el));

// ---------- FIREBASE CONFIG (v8 style) ----------
// Make sure your HTML includes the v8 CDN scripts and the firebase.initializeApp(firebaseConfig) block.
// The firebaseConfig below is included for clarity but should be initialized in your HTML before this file runs.
const firebaseConfig = {
  apiKey: "AIzaSyBwIpkPvU8tlswKKuZnWHyv31ERuaBbH2U",
  authDomain: "nexthub-ng.firebaseapp.com",
  projectId: "nexthub-ng",
  storageBucket: "nexthub-ng.firebasestorage.app",
  messagingSenderId: "852092143024",
  appId: "1:852092143024:web:fa8f2767bf7a3aa4628275",
  measurementId: "G-16DGRQJHT2"
};
// If you already initialize in HTML, the following lines are safe no-ops.
// If not initialized in HTML, uncomment the next two lines:
// firebase.initializeApp(firebaseConfig);
// firebase.analytics();

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

if (openAuth) openAuth.addEventListener("click", () => authModal.style.display = "flex");
if (closeAuth) closeAuth.addEventListener("click", () => authModal.style.display = "none");

if (switchToLogin) switchToLogin.addEventListener("click", () => {
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
});

// Auth action (signup/login)
if (authActionBtn) authActionBtn.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  if (!email || !password) return alert("Please enter email and password");

  try {
    if (isLogin) {
      await auth.signInWithEmailAndPassword(email, password);
      alert("Logged in successfully");
    } else {
      const res = await auth.createUserWithEmailAndPassword(email, password);
      // create basic user doc
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

// Logout
if (logoutBtn) logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  alert("Logged out");
});

// ---------- AUTH STATE HANDLING ----------
auth.onAuthStateChanged(async user => {
  if (user) {
    // UI updates
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (openAuth) openAuth.style.display = "none";
    if (openProfile) openProfile.style.display = "inline-block";
    if (openPost) openPost.style.display = "inline-block";

    // Ensure user doc exists
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

    // Mark online
    userRef.update({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    // beforeunload -> mark offline
    window.addEventListener("beforeunload", () => {
      userRef.update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    });

    // offline/online events
    window.addEventListener("offline", () => {
      userRef.update({ online: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    });
    window.addEventListener("online", () => {
      userRef.update({ online: true }).catch(() => {});
    });

    // load feed for this user
    loadFeedForUser(user.uid);
    loadNotifications(user.uid);
  } else {
    // UI updates
    if (logoutBtn) logoutBtn.style.display = "none";
    if (openAuth) openAuth.style.display = "inline-block";
    if (openProfile) openProfile.style.display = "none";
    if (openPost) openPost.style.display = "none";

    // show generic feed (or empty)
    feedContainer.innerHTML = `<p style="text-align:center; margin-top:20px;">Log in to see your personalized feed.</p>`;
    notifDropdown.innerHTML = "";
  }
});

// ---------- PROFILE MODAL ----------
if (openProfile) openProfile.addEventListener("click", async () => {
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
if (closeProfile) closeProfile.addEventListener("click", () => profileModal.style.display = "none");

if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
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
    await db.collection("users").doc(user.uid).set({
      username,
      bio,
      photoURL
    }, { merge: true });
    alert("Profile updated!");
    profileModal.style.display = "none";
  } catch (err) {
    alert(err.message);
  }
});

// ---------- POST MODAL ----------
if (openPost) openPost.addEventListener("click", () => postModal.style.display = "flex");
if (closePost) closePost.addEventListener("click", () => postModal.style.display = "none");

if (uploadPostBtn) uploadPostBtn.addEventListener("click", async () => {
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

// ---------- FEED (posts from people you follow) ----------
let postsUnsubscribe = null;

async function loadFeedForUser(uid) {
  // detach previous listener
  if (postsUnsubscribe) postsUnsubscribe();

  const userDoc = await db.collection("users").doc(uid).get();
  const following = (userDoc.exists && userDoc.data().following) ? userDoc.data().following : [];

  if (!following || following.length === 0) {
    feedContainer.innerHTML = `
      <p style="text-align:center; margin-top:20px;">
        You’re not following anyone yet.<br>
        Follow users to see their posts.
      </p>
    `;
    return;
  }

  // Firestore 'in' supports up to 10 items; if following > 10, fetch in batches or fallback to all posts.
  const chunks = [];
  for (let i = 0; i < following.length; i += 10) {
    chunks.push(following.slice(i, i + 10));
  }

  // We'll merge results from multiple listeners (simple approach)
  feedContainer.innerHTML = `<p style="text-align:center; margin-top:20px;">Loading feed...</p>`;
  const listeners = [];

  // Clear container and attach listeners for each chunk
  feedContainer.innerHTML = "";
  chunks.forEach(chunk => {
    const q = db.collection("posts")
      .where("userId", "in", chunk)
      .orderBy("timestamp", "desc");

    const unsub = q.onSnapshot(snapshot => {
      // Build a map of posts by id to avoid duplicates
      const postsMap = {};
      // collect existing posts currently in DOM by data-id
      document.querySelectorAll(".post-card").forEach(el => {
        const id = el.getAttribute("data-id");
        if (id) postsMap[id] = true;
      });

      snapshot.forEach(doc => {
        const post = doc.data();
        const id = doc.id;
        // If post already exists in DOM, update counts only
        const existing = document.querySelector(`.post-card[data-id="${id}"]`);
        if (existing) {
          const likeCount = existing.querySelector(".likeCount");
          if (likeCount) likeCount.textContent = `${(post.likes || []).length} likes`;
          return;
        }

        // Render new post
        const postHTML = renderPostHTML(post, id);
        feedContainer.insertAdjacentHTML("afterbegin", postHTML);
      });
    });

    listeners.push(unsub);
  });

  // combine unsubscribes
  postsUnsubscribe = () => listeners.forEach(u => u());
}

// Helper to render a post
function renderPostHTML(post, docId) {
  const caption = post.caption ? escapeHtml(post.caption) : "";
  const likesCount = (post.likes && Array.isArray(post.likes)) ? post.likes.length : 0;
  const html = `
    <div class="post-card" data-id="${docId}">
      <img src="${post.imageURL}" class="post-image" alt="post image">
      <div class="post-content">
        <p class="post-caption">${caption}</p>
        <button class="followBtn" data-user="${post.userId}">Follow</button>
        <div class="post-actions">
          <button class="likeBtn" data-id="${docId}">❤️ Like</button>
          <span class="likeCount">${likesCount} likes</span>
        </div>
        <div class="comment-section">
          <input type="text" class="commentInput" placeholder="Write a comment...">
          <button class="commentBtn" data-id="${docId}">Post</button>
          <div class="commentList"></div>
        </div>
      </div>
    </div>
  `;
  return html;
}

// Simple HTML escape for captions/comments
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- COMMENTS LISTENER (delegated) ----------
document.addEventListener("click", async (e) => {
  // Like button
  if (e.target.classList.contains("likeBtn")) {
    const postId = e.target.getAttribute("data-id");
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in");
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return;
    let likes = postDoc.data().likes || [];
    if (likes.includes(user.uid)) {
      likes = likes.filter(id => id !== user.uid);
    } else {
      likes.push(user.uid);
      // add notification
      db.collection("notifications").add({
        type: "like",
        fromUser: user.uid,
        toUser: postDoc.data().userId,
        postId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    await postRef.update({ likes });
  }

  // Comment button
  if (e.target.classList.contains("commentBtn")) {
    const postId = e.target.getAttribute("data-id");
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in");
    const input = e.target.previousElementSibling;
    const commentText = input.value.trim();
    if (!commentText) return;
    const comment = {
      userId: user.uid,
      text: commentText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("posts").doc(postId).collection("comments").add(comment);
    // notification
    const postDoc = await db.collection("posts").doc(postId).get();
    if (postDoc.exists) {
      db.collection("notifications").add({
        type: "comment",
        fromUser: user.uid,
        toUser: postDoc.data().userId,
        postId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    input.value = "";
  }

  // Follow/unfollow
  if (e.target.classList.contains("followBtn")) {
    const targetUserId = e.target.getAttribute("data-user");
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in");
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    let following = (userDoc.exists && userDoc.data().following) ? userDoc.data().following : [];
    if (following.includes(targetUserId)) {
      following = following.filter(id => id !== targetUserId);
      e.target.textContent = "Follow";
    } else {
      following.push(targetUserId);
      e.target.textContent = "Following";
      // add notification
      db.collection("notifications").add({
        type: "follow",
        fromUser: user.uid,
        toUser: targetUserId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    await userRef.update({ following });
  }
});

// ---------- COMMENTS RENDERING (real-time per post) ----------
const commentListeners = {};
function attachCommentsListener(postId) {
  if (commentListeners[postId]) return;
  const commentsRef = db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc");
  commentListeners[postId] = commentsRef.onSnapshot(snapshot => {
    const postElement = document.querySelector(`.post-card[data-id="${postId}"]`);
    if (!postElement) return;
    const commentList = postElement.querySelector(".commentList");
    if (!commentList) return;
    commentList.innerHTML = "";
    snapshot.forEach(c => {
      const data = c.data();
      const text = escapeHtml(data.text || "");
      commentList.innerHTML += `<div class="commentItem">${text}</div>`;
    });
  });
}

// Observe feed container for new posts and attach comment listeners
const feedObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType === 1 && node.classList.contains("post-card")) {
        const id = node.getAttribute("data-id");
        if (id) attachCommentsListener(id);
      }
    });
  });
});
if (feedContainer) feedObserver.observe(feedContainer, { childList: true });

// ---------- NOTIFICATIONS ----------
function loadNotifications(uid) {
  if (!uid) return;
  db.collection("notifications")
    .where("toUser", "==", uid)
    .orderBy("timestamp", "desc")
    .limit(20)
    .onSnapshot(async snapshot => {
      notifDropdown.innerHTML = "";
      for (const doc of snapshot.docs) {
        const notif = doc.data();
        let fromUserName = "Someone";
        try {
          const fromUserDoc = await db.collection("users").doc(notif.fromUser).get();
          if (fromUserDoc.exists) fromUserName = fromUserDoc.data().username || fromUserName;
        } catch (e) {}
        let text = "";
        if (notif.type === "like") text = `${fromUserName} liked your post`;
        else if (notif.type === "comment") text = `${fromUserName} commented on your post`;
        else if (notif.type === "follow") text = `${fromUserName} started following you`;
        notifDropdown.innerHTML += `<div class="notif-item">${escapeHtml(text)}</div>`;
      }
    });
}

// Toggle notifications dropdown
if (notifIcon) notifIcon.addEventListener("click", () => {
  if (notifDropdown) notifDropdown.classList.toggle("hidden");
});

// ---------- UTILITY: load initial feed for anonymous or fallback ----------
async function loadAllPostsFallback() {
  // show recent posts from all users (fallback)
  const q = db.collection("posts").orderBy("timestamp", "desc").limit(30);
  q.onSnapshot(snapshot => {
    feedContainer.innerHTML = "";
    snapshot.forEach(doc => {
      const post = doc.data();
      feedContainer.innerHTML += renderPostHTML(post, doc.id);
    });
  });
}

// If no user is logged in, show fallback
auth.onAuthStateChanged(user => {
  if (!user) {
    loadAllPostsFallback();
  }
});

// ---------- END ----------
console.log("main.js loaded. Social features initialized (v8).");
   

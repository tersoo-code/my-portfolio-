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
});openProfile.addEventListener("click", async () => {
  profileModal.style.display = "flex";

  const user = auth.currentUser;
  const doc = await db.collection("users").doc(user.uid).get();

  if (doc.exists) {
    const data = doc.data();
    document.getElementById("profileUsername").value = data.username || "";
    document.getElementById("profileBio").value = data.bio || "";
  }
});
// POST MODAL LOGIC
const postModal = document.getElementById("postModal");
const openPost = document.getElementById("openPost");
const closePost = document.getElementById("closePost");

openPost.addEventListener("click", () => {
  postModal.style.display = "flex";
});

closePost.addEventListener("click", () => {
  postModal.style.display = "none";
});
const uploadPostBtn = document.getElementById("uploadPostBtn");

uploadPostBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");

  const imageFile = document.getElementById("postImage").files[0];
  const caption = document.getElementById("postCaption").value;

  if (!imageFile) return alert("Please select an image");

  // Upload image to Firebase Storage
  const storageRef = storage.ref(`posts/${user.uid}/${Date.now()}`);
  await storageRef.put(imageFile);
  const imageURL = await storageRef.getDownloadURL();

  // Save post data to Firestore
  await db.collection("posts").add({
    userId: user.uid,
    caption,
    imageURL,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Post uploaded!");
  postModal.style.display = "none";
});
const feedContainer = document.getElementById("feedContainer");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const userDoc = await db.collection("users").doc(user.uid).get();
  const following = userDoc.data().following || [];

  // If user follows nobody
  if (following.length === 0) {
    feedContainer.innerHTML = `
      <p style="text-align:center; margin-top:20px;">
        You’re not following anyone yet.<br>
        Follow users to see their posts.
      </p>
    `;
    return;
  }

  // Load posts ONLY from followed users
  db.collection("posts")
    .where("userId", "in", following)
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      feedContainer.innerHTML = "";

      snapshot.forEach(doc => {
        const post = doc.data();

        const postHTML = `
          <div class="post-card">
            <img src="${post.imageURL}" class="post-image">

            <div class="post-content">const postHTML = `
  <div class="post-card">
    <img src="${post.imageURL}" class="post-image">

    <div class="post-content">
      <p class="post-caption">${post.caption}</p>

      <button class="followBtn" data-user="${post.userId}">Follow</button>

      <div class="post-actions">
        <button class="likeBtn" data-id="${doc.id}">❤️ Like</button>
        <span class="likeCount">${post.likes?.length || 0} likes</span>
      </div>

      <div class="comment-section">
        <input type="text" class="commentInput" placeholder="Write a comment...">
        <button class="commentBtn" data-id="${doc.id}">Post</button>
        <div class="commentList"></div>
      </div>
    </div>
  </div>
`;
              <p class="post-caption">${post.caption}</p>

              <button class="followBtn" data-user="${post.userId}">Follow</button>

              <div class="post-actions">
                <button class="likeBtn" data-id="${doc.id}">❤️ Like</button>
                <span class="likeCount">${post.likes?.length || 0} likes</span>
              </div>

              <div class="comment-section">
                <input type="text" class="commentInput" placeholder="Write a comment...">
                <button class="commentBtn" data-id="${doc.id}">Post</button>
                <div class="commentList"></div>
              </div>
            </div>
          </div>
        `;

        feedContainer.innerHTML += postHTML;
      });
    });
});
    snapshot.forEach(doc => {
      const post = doc.data();

  const postHTML = `
  <div class="post-card">
    <img src="${post.imageURL}" class="post-image">

    <div class="post-content">
      <p class="post-caption">${post.caption}</p>

      <div class="post-actions">
        <button class="likeBtn" data-id="${doc.id}">❤️ Like</button>
        <span class="likeCount">${post.likes?.length || 0} likes</span>
      </div>

      <div class="comment-section">
        <input type="text" class="commentInput" placeholder="Write a comment...">
        <button class="commentBtn" data-id="${doc.id}">Post</button>

        <div class="commentList"></div>
      </div>
    </div>
  </div>

        
          

  


      feedContainer.innerHTML += postHTML;
    });
  });
// Load comments
db.collection("posts").doc(doc.id).collection("comments")
  .orderBy("timestamp", "asc")
  .onSnapshot(commentSnap => {
    const commentList = postElement.querySelector(".commentList");
    commentList.innerHTML = "";
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const userDoc = await db.collection("users").doc(user.uid).get();
  const following = userDoc.data().following || [];

  document.querySelectorAll(".followBtn").forEach(btn => {
    const targetUser = btn.getAttribute("data-user");
    if (following.includes(targetUser)) {
      btn.textContent = "Following";
    }
  });
});
    commentSnap.forEach(c => {
      const data = c.data();
      commentList.innerHTML += `
        <div class="commentItem">${data.text}</div>
      `;
    });
  });
auth.onAuthStateChanged(user => {
  if (user) {
    openPost.style.display = "inline-block";
  } else {
    openPost.style.display = "none";
  }
});
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("likeBtn")) {
    const postId = e.target.getAttribute("data-id");
    const user = auth.currentUser;

    if (!user) return alert("You must be logged in");

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();
    const postData = postDoc.data();

    let likes = postData.likes || [];

    if (likes.includes(user.uid)) {
      // Unlike
      likes = likes.filter(id => id !== user.uid);
    } else {
      // Like
      likes.push(user.uid);
    }

    await postRef.update({ likes });
  }
});
document.addEventListener("click", async (e) => {
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
      timestamp: Date.now()
    };

    await db.collection("posts").doc(postId).collection("comments").add(comment);

    input.value = "";
  }
});
const postHTML = `
  <div class="post-card">
    <img src="${post.imageURL}" class="post-image">

    <div class="post-content">
      <p class="post-caption">${post.caption}</p>

      <button class="followBtn" data-user="${post.userId}">Follow</button>

      <div class="post-actions">
        <button class="likeBtn" data-id="${doc.id}">❤️ Like</button>
        <span class="likeCount">${post.likes?.length || 0} likes</span>
      </div>

      <div class="comment-section">
        <input type="text" class="commentInput" placeholder="Write a comment...">
        <button class="commentBtn" data-id="${doc.id}">Post</button>
        <div class="commentList"></div>
      </div>
    </div>
  </div>
`;
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("followBtn")) {
    const targetUserId = e.target.getAttribute("data-user");
    const user = auth.currentUser;

    if (!user) return alert("You must be logged in");

    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    let following = userData.following || [];

    if (following.includes(targetUserId)) {
      // Unfollow
      following = following.filter(id => id !== targetUserId);
      e.target.textContent = "Follow";
    } else {
      // Follow
      following.push(targetUserId);
      e.target.textContent = "Following";
    }

    await userRef.update({ following });
  }
});

const notifIcon = document.getElementById("notifIcon");
const notifDropdown = document.getElementById("notifDropdown");

notifIcon.addEventListener("click", () => {
  notifDropdown.classList.toggle("hidden");
});


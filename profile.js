const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("id");

const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const followBtn = document.getElementById("followBtn");
const userPosts = document.getElementById("userPosts");

// Load user info
db.collection("users").doc(userId).onSnapshot(doc => {
  const data = doc.data();

  profileName.textContent = data.username;
  profileBio.textContent = data.bio || "";
  profilePic.src = data.photoURL || "default.png";

  followersCount.textContent = `${(data.followers || []).length} Followers`;
  followingCount.textContent = `${(data.following || []).length} Following`;
});

// Load user posts
db.collection("posts")
  .where("userId", "==", userId)
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    userPosts.innerHTML = "";
    snapshot.forEach(doc => {
      const post = doc.data();
      userPosts.innerHTML += `
        <div class="gallery-item">
          <img src="${post.imageURL}">
          <figcaption>${post.caption}</figcaption>
        </div>
      `;
    });
  });
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const currentUserRef = db.collection("users").doc(user.uid);
  const currentUserDoc = await currentUserRef.get();
  const following = currentUserDoc.data().following || [];

  if (following.includes(userId)) {
    followBtn.textContent = "Following";
  }

  followBtn.addEventListener("click", async () => {
    let updatedFollowing = following;

    if (updatedFollowing.includes(userId)) {
      updatedFollowing = updatedFollowing.filter(id => id !== userId);
      followBtn.textContent = "Follow";
    } else {
      updatedFollowing.push(userId);
      followBtn.textContent = "Following";
    }

    await currentUserRef.update({ following: updatedFollowing });
  });
});

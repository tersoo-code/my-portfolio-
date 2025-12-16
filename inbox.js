auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const chatList = document.getElementById("chatList");

  // Listen for all chats involving the current user
  db.collection("chats").onSnapshot(async (snapshot) => {
    chatList.innerHTML = "";

    const chatIds = [];

    snapshot.forEach(doc => {
      const chatId = doc.id;

      // Only show chats that include the current user
      if (chatId.includes(user.uid)) {
        chatIds.push(chatId);
      }
    });

    for (const chatId of chatIds) {
      const [user1, user2] = chatId.split("_");
      const otherUserId = user1 === user.uid ? user2 : user1;

      // Get other user's info
      const otherUserDoc = await db.collection("users").doc(otherUserId).get();
      const otherUser = otherUserDoc.data();

      // Get last message
      const messagesSnapshot = await db.collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

      let lastMessage = "No messages yet";

      if (!messagesSnapshot.empty) {
        lastMessage = messagesSnapshot.docs[0].data().text;
      }

      // Add to inbox list
      chatList.innerHTML += `
        <div class="chat-item" onclick="openChat('${otherUserId}')">
          <img src="${otherUser.profilePic}" class="chat-avatar">
          <div class="chat-info">
            <h3>${otherUser.username}</h3>
            <p>${lastMessage}</p>
          </div>
        </div>
      `;
    }
  });
});

// Open chat
function openChat(userId) {
  window.location.href = `messages.html?user=${userId}`;
}

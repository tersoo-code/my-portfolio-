const urlParams = new URLSearchParams(window.location.search);
const otherUserId = urlParams.get("user");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const chatId = getChatId(user.uid, otherUserId);

  const chatBox = document.getElementById("chatBox");
  const chatMessage = document.getElementById("chatMessage");
  const sendMessageBtn = document.getElementById("sendMessageBtn");

  // ✅ Load messages in real-time
  db.collection("chats").doc(chatId).collection("messages")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        chatBox.innerHTML += `
          <div class="chat-msg ${msg.from === user.uid ? "me" : "them"}">
            ${msg.text}
          </div>
        `;
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });

  // ✅ Send message
  sendMessageBtn.addEventListener("click", async () => {
    if (chatMessage.value.trim() === "") return;

    await db.collection("chats").doc(chatId).collection("messages").add({
      from: user.uid,
      text: chatMessage.value,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    chatMessage.value = "";
  });
});
chatMessage.addEventListener("input", () => {
  db.collection("chats").doc(chatId).update({
    [`typing.${user.uid}`]: chatMessage.value.length > 0
  });
});

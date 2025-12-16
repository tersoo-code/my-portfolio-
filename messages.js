// ✅ Get the other user from URL
const urlParams = new URLSearchParams(window.location.search);
const otherUserId = urlParams.get("user");

// ✅ Load the other user's name for header + typing indicator
let otherUserName = "";
db.collection("users").doc(otherUserId).get().then(doc => {
  if (doc.exists) {
    otherUserName = doc.data().username || "User";
    document.getElementById("chatHeader").innerHTML = otherUserName;
  }
});

// ✅ Audio recording state (for voice notes)
let mediaRecorder;
let audioChunks = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  // ✅ Generate chat ID
  const chatId = getChatId(user.uid, otherUserId);

  // ✅ Get elements
  const chatBox = document.getElementById("chatBox");
  const chatMessage = document.getElementById("chatMessage");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const chatHeader = document.getElementById("chatHeader");
  const imageInput = document.getElementById("imageInput");
  const imageBtn = document.getElementById("imageBtn");
  const voiceBtn = document.getElementById("voiceBtn");

  // ✅ LISTEN FOR MESSAGES (text + image + audio + timestamps + seen)
  let lastMessageCount = 0;

  db.collection("chats").doc(chatId).collection("messages")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      const currentCount = snapshot.size;
      chatBox.innerHTML = "";

      snapshot.forEach((doc, index) => {
        const msg = doc.data();
        const isMe = msg.from === user.uid;
        const seen = msg.readBy && msg.readBy.includes(otherUserId);

        const timeText = msg.timestamp
          ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "";

        let content = "";

        if (msg.imageUrl) {
          content += `<img src="${msg.imageUrl}" class="chat-image">`;
        }

        if (msg.audioUrl) {
          content += `
            <audio controls class="chat-audio">
              <source src="${msg.audioUrl}" type="audio/webm">
              Your browser does not support audio.
            </audio>
          `;
        }

        if (msg.text) {
          content += `<div class="text">${msg.text}</div>`;
        }

        chatBox.innerHTML += `
          <div class="chat-msg ${isMe ? "me" : "them"}">
            ${content}
            <div class="meta">
              <span class="time">${timeText}</span>
              ${isMe && seen ? `<span class="seen">Seen</span>` : ""}
            </div>
          </div>
        `;
      });

      chatBox.scrollTop = chatBox.scrollHeight;

      // Simple console notification when new message from other user arrives
      if (currentCount > lastMessageCount && lastMessageCount !== 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const lastMsg = lastDoc.data();
        if (lastMsg.from === otherUserId) {
          console.log("New message from", otherUserName);
        }
      }

      lastMessageCount = currentCount;
    });

  // ✅ SEND TEXT MESSAGE
  sendMessageBtn.addEventListener("click", async () => {
    if (chatMessage.value.trim() === "") return;

    await db.collection("chats").doc(chatId).collection("messages").add({
      from: user.uid,
      text: chatMessage.value,
      imageUrl: null,
      audioUrl: null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      readBy: [user.uid] // sender has seen it
    });

    // Stop typing when message is sent
    db.collection("chats").doc(chatId).update({
      [`typing.${user.uid}`]: false
    });

    chatMessage.value = "";
  });

  // Allow Enter key to send
  chatMessage.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessageBtn.click();
    }
  });

  // ✅ TYPING STATUS
  chatMessage.addEventListener("input", () => {
    db.collection("chats").doc(chatId).update({
      [`typing.${user.uid}`]: chatMessage.value.length > 0
    });
  });

  // ✅ TYPING INDICATOR LISTENER
  db.collection("chats").doc(chatId).onSnapshot(doc => {
    const data = doc.data() || {};
    const typing = data.typing || {};

    if (typing[otherUserId]) {
      chatHeader.innerHTML = `${otherUserName} is typing...`;
    } else {
      // Status will be managed by online/offline listener below
      // If you want, you could fall back to just name here:
      // chatHeader.innerHTML = otherUserName;
    }
  });

  // ✅ MARK MESSAGES AS READ
  db.collection("chats").doc(chatId).collection("messages")
    .where("readBy", "not-in", [user.uid])
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        doc.ref.update({
          readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
      });
    });

  // ✅ ONLINE / OFFLINE STATUS + LAST SEEN
  db.collection("users").doc(otherUserId).onSnapshot(doc => {
    const data = doc.data();
    if (!data) return;

    if (data.online) {
      chatHeader.innerHTML = `${otherUserName} • Online`;
    } else if (data.lastSeen) {
      const last = data.lastSeen.toDate().toLocaleString();
      chatHeader.innerHTML = `${otherUserName} • Last seen ${last}`;
    } else {
      chatHeader.innerHTML = otherUserName;
    }
  });

  // ✅ IMAGE SENDING

  imageBtn.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = storage.ref().child(`chatImages/${chatId}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const imageUrl = await storageRef.getDownloadURL();

    await db.collection("chats").doc(chatId).collection("messages").add({
      from: user.uid,
      text: "",
      imageUrl,
      audioUrl: null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      readBy: [user.uid]
    });

    imageInput.value = "";
  });

  // ✅ VOICE NOTES

  voiceBtn.addEventListener("click", async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const fileName = `voice_${Date.now()}.webm`;
        const storageRef = storage.ref().child(`chatVoice/${chatId}/${fileName}`);
        await storageRef.put(blob);
        const audioUrl = await storageRef.getDownloadURL();

        await db.collection("chats").doc(chatId).collection("messages").add({
          from: user.uid,
          text: "",
          imageUrl: null,
          audioUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          readBy: [user.uid]
        });
      };

      mediaRecorder.start();
      voiceBtn.textContent = "⏹"; // recording
    } else {
      // Stop recording
      mediaRecorder.stop();
      voiceBtn.textContent = "🎤"; // idle
    }
  });

});

"use strict";
const getFileExtension = (filepath) =>
  filepath.slice(((filepath.lastIndexOf(".") - 1) >>> 0) + 2);
const ctob = (a) => a.charCodeAt(0);
function stringToColor(value) {
  const bytes = Array.from(value.toLowerCase())
    .map((char) => ctob(char))
    .map((char) => scaleRange(char, ctob("a"), ctob("z"), 0, 128));
  if (bytes.length < 3) return "#292929";
  return `rgb(${bytes[1]}, ${bytes[0]}, ${bytes[2]})`;
}
const scaleRange = (value, fromMin, fromMax, toMin, toMax) =>
  Math.floor(
    ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin,
  );
const videoExts = ["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv"];
const audioExts = ["mp3", "flac", "wav", "ogg", "aac", "m4a", "wma"];
const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff"];
window.onload = function () {
  const MessageTypes = {
    text: "text",
    media: "media",
    server: "server",
  };
  var conn;
  var msgInput = document.getElementById("messageInput");
  var form = document.getElementById("inputContainer");
  var log = document.getElementById("messagesContainer");
  var upload = document.getElementById("uploadFile");
  const onUpload = () => {
    if (!upload || !upload.files) return false;
    const data = new FormData();
    data.append(MessageTypes.media, upload.files[0]);
    fetch("/upload", {
      method: "POST",
      body: data,
    }).then((response) => {
      var _a;
      const message =
        (_a = {
          200: "",
          413: "File too big!",
        }[response.status]) !== null && _a !== void 0
          ? _a
          : "Failed sending file!";
      clientMessage(message);
    });
    return false;
  };
  upload === null || upload === void 0
    ? void 0
    : upload.addEventListener("change", onUpload, false);
  const onSubmit = () => {
    if (
      !conn ||
      !(msgInput === null || msgInput === void 0 ? void 0 : msgInput.value)
    )
      return false;
    conn.send(msgInput.value);
    msgInput.value = "";
    return false;
  };
  form.onsubmit = onSubmit;
  const templateToHTML = (template) => {
    const element = document.createElement("template");
    element.innerHTML = template;
    const html = element.content.children;
    if (html.length === 1) return html[0];
    return null;
  };
  const authorTemplate = (author) => {
    const time = new Date();
    let options = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    let formattedTime = new Intl.DateTimeFormat("en-US", options).format(time);
    const nameColor = stringToColor(author);
    return `
      <div id="left">
        <div style="color: ${nameColor};" id="author">${author}</div>
        <div id="time">${formattedTime}</div>
      </div>
    `;
  };
  const messageTemplate = (content) => `<div id="right">${content}</div>`;
  const mediaTemplate = (extension, mediaUrl) => {
    if (videoExts.includes(extension))
      return `<video id="videoMessage" controls src="${mediaUrl}">No support for video</video>`;
    if (audioExts.includes(extension))
      return `<audio id="audioMessage" controls src="${mediaUrl}">No support for audio</audio>`;
    if (imageExts.includes(extension))
      return `<a id="imageMessage" href="${mediaUrl}" target="_blank"><img src="${mediaUrl}"/></a>`;
    return `<a href="${mediaUrl}" download="file.${extension}">file.${extension}</a>`;
  };
  const getMessageContent = (msg) => {
    var _a;
    const extension = getFileExtension(msg.body).toLowerCase();
    const map = {
      [MessageTypes.text]: msg.body,
      [MessageTypes.server]: msg.body,
      [MessageTypes.media]: mediaTemplate(extension, msg.body),
    };
    return (_a = map[msg.msgType]) !== null && _a !== void 0
      ? _a
      : "Unkown Message Type";
  };
  const renderMessage = (msg) => {
    if (!log) return;
    const messageContent = getMessageContent(msg);
    const author = authorTemplate(msg.author);
    const content = messageTemplate(messageContent);
    const authorDiv = templateToHTML(author);
    const contentDiv = templateToHTML(content);
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(authorDiv);
    log.appendChild(contentDiv);
    if (doScroll) {
      log.scrollTop = log.scrollHeight - log.clientHeight;
    }
  };
  const clientMessage = (message) => {
    if (!message) return;
    renderMessage({
      msgType: MessageTypes.text,
      author: "client",
      body: message,
    });
  };
  const createWebsocket = () => {
    const host = "ws://" + document.location.host + "/ws";
    const conn = new WebSocket(host);
    conn.onclose = () => clientMessage("Connection Closed!");
    conn.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg) return;
      renderMessage(msg);
    };
    return conn;
  };
  if (window["WebSocket"]) {
    conn = createWebsocket();
    clientMessage("Welcome to the chat!");
  } else {
    clientMessage("Unsupported Client!");
  }
};

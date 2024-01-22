const getFileExtension = (filepath: string) =>
  filepath.slice(((filepath.lastIndexOf(".") - 1) >>> 0) + 2);

const ctob = (a: string) => a.charCodeAt(0);

function stringToColor(value: string) {
  const bytes = Array.from(value.toLowerCase())
    .map((char) => ctob(char))
    .map((char) => scaleRange(char, ctob("a"), ctob("z"), 0, 128));
  if (bytes.length < 3) return "#292929";
  return `rgb(${bytes[1]}, ${bytes[0]}, ${bytes[2]})`;
}
const scaleRange = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
) =>
  Math.floor(
    ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin,
  );

const videoExts = ["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv"];
const audioExts = ["mp3", "flac", "wav", "ogg", "aac", "m4a", "wma"];
const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff"];

window.onload = function () {
  type Message = {
    msgType: string;
    author: string;
    body: string;
  };
  const MessageTypes: Record<string, string> = {
    text: "text",
    media: "media",
    server: "server",
  };

  var conn: WebSocket | undefined;
  var msgInput = document.getElementById("messageInput") as HTMLInputElement;
  var form = document.getElementById("inputContainer") as HTMLFormElement;
  var log = document.getElementById("messagesContainer");
  var upload = document.getElementById("uploadFile") as HTMLInputElement;

  const onUpload = () => {
    if (!upload || !upload.files) return false;
    const data = new FormData();
    data.append(MessageTypes.media, upload.files[0]);
    fetch("/upload", {
      method: "POST",
      body: data,
    }).then((response) => {
      const message =
        {
          200: "",
          413: "File too big!",
        }[response.status] ?? "Failed sending file!";
      clientMessage(message);
    });
    return false;
  };
  upload?.addEventListener("change", onUpload, false);

  const onSubmit = () => {
    if (!conn || !msgInput?.value) return false;

    conn.send(msgInput.value);
    msgInput.value = "";
    return false;
  };
  form.onsubmit = onSubmit;

  const templateToHTML = (template: string) => {
    const element = document.createElement("template") as HTMLTemplateElement;
    element.innerHTML = template;
    const html = element.content.children;
    if (html.length === 1) return html[0];
    return null;
  };

  const authorTemplate = (author: string) => {
    const time = new Date();
    let options = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    } as Intl.DateTimeFormatOptions;
    let formattedTime = new Intl.DateTimeFormat("en-US", options).format(time);
    const nameColor = stringToColor(author);
    return `
      <div id="left">
        <div style="color: ${nameColor};" id="author">${author}</div>
        <div id="time">${formattedTime}</div>
      </div>
    `;
  };
  const messageTemplate = (content: string) =>
    `<div id="right">${content}</div>`;

  const mediaTemplate = (extension: string, mediaUrl: string) => {
    if (videoExts.includes(extension))
      return `<video id="videoMessage" controls src="${mediaUrl}">No support for video</video>`;
    if (audioExts.includes(extension))
      return `<audio id="audioMessage" controls src="${mediaUrl}">No support for audio</audio>`;
    if (imageExts.includes(extension))
      return `<a id="imageMessage" href="${mediaUrl}" target="_blank"><img src="${mediaUrl}"/></a>`;
    return `<a href="${mediaUrl}" download="file.${extension}">file.${extension}</a>`;
  };

  const getMessageContent = (msg: Message) => {
    const extension = getFileExtension(msg.body).toLowerCase();
    const map = {
      [MessageTypes.text]: msg.body,
      [MessageTypes.server]: msg.body,
      [MessageTypes.media]: mediaTemplate(extension, msg.body),
    };
    return map[msg.msgType] ?? "Unkown Message Type";
  };

  const renderMessage = (msg: Message) => {
    if (!log) return;
    const messageContent = getMessageContent(msg);
    const author = authorTemplate(msg.author);
    const content = messageTemplate(messageContent);
    const authorDiv = templateToHTML(author);
    const contentDiv = templateToHTML(content);
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(authorDiv!);
    log.appendChild(contentDiv!);
    if (doScroll) {
      log.scrollTop = log.scrollHeight - log.clientHeight;
    }
  };

  const clientMessage = (message: string) => {
    if (!message) return;
    renderMessage({
      msgType: MessageTypes.text,
      author: "client",
      body: message,
    });
  };

  const createWebsocket = (): WebSocket => {
    const host = "ws://" + document.location.host + "/ws";
    const conn = new WebSocket(host);
    conn.onclose = () => clientMessage("Connection Closed!");
    conn.onmessage = (event) => {
      const msg: Message | undefined = JSON.parse(event.data);
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

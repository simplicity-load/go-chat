const leftPad = (val: number) => val < 10 ? `0${val}` : `${val}`

window.onload = function() {
  type Message = {
    msgType: string
    author: string
    body: string
  }

  var conn: WebSocket | undefined;
  var msgInput = document.getElementById("messageInput") as HTMLInputElement
  var form = document.getElementById("inputContainer") as HTMLFormElement
  var log = document.getElementById("messagesContainer")

  const onSubmit = () => {
    if (!conn || !msgInput?.value) return false

    conn.send(msgInput.value)
    msgInput.value = ""
    return false
  }
  form.onsubmit = onSubmit

  const templateToHTML = (template: string) => {
    const element = document.createElement("template") as HTMLTemplateElement
    element.innerHTML = template
    const html = element.content.children
    if (html.length === 1) return html[0]
    return null
  }

  const authorTemplate = (author: string) => {
    const time = new Date()
    let options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as Intl.DateTimeFormatOptions
    let formattedTime = new Intl.DateTimeFormat('en-US', options).format(time);
    return `
      <div id="left">
        <div id="author">${author}</div>
        <div id="time">${formattedTime}</div>
      </div>
    `
  }
  const messageTemplate = (content: string) => {
    return `<div id="right">${content}</div>`
  }

  const renderMessage = (msg: Message) => {
    if (!log) return
    // check for message type
    // const type = msg.msgType
    const author = authorTemplate(msg.author)
    const content = messageTemplate(msg.body)
    const authorDiv = templateToHTML(author)
    const contentDiv = templateToHTML(content)
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(authorDiv)
    log.appendChild(contentDiv)
    if (doScroll) {
      log.scrollTop = log.scrollHeight - log.clientHeight;
    }
  }

  const sysMessage = (message: string) => {
    renderMessage({
      msgType: "text",
      author: "sys",
      body: message,
    })
  }

  const createWebsocket = (): WebSocket => {
    const host = "ws://" + document.location.host + "/ws";
    const conn = new WebSocket(host);
    conn.onclose = () => sysMessage('Connection Closed!');
    conn.onmessage = (event) => {
      const msg: Message | undefined = JSON.parse(event.data)
      if (!msg) return
      renderMessage(msg)
    };
    return conn
  }

  if (window["WebSocket"]) {
    conn = createWebsocket()
    sysMessage("Welcome to the chat!")
  } else {
    sysMessage('Unsupported Client!')
  }
};

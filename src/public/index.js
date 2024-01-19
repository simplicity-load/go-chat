var leftPad = function (val) { return val < 10 ? "0".concat(val) : "".concat(val); };
window.onload = function () {
    var conn;
    var msgInput = document.getElementById("messageInput");
    var form = document.getElementById("inputContainer");
    var log = document.getElementById("messagesContainer");
    var onSubmit = function () {
        if (!conn || !(msgInput === null || msgInput === void 0 ? void 0 : msgInput.value))
            return false;
        conn.send(msgInput.value);
        msgInput.value = "";
        return false;
    };
    form.onsubmit = onSubmit;
    var templateToHTML = function (template) {
        var element = document.createElement("template");
        element.innerHTML = template;
        var html = element.content.children;
        if (html.length === 1)
            return html[0];
        return null;
    };
    var authorTemplate = function (author) {
        var time = new Date();
        var options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        var formattedTime = new Intl.DateTimeFormat('en-US', options).format(time);
        return "\n      <div id=\"left\">\n        <div id=\"author\">".concat(author, "</div>\n        <div id=\"time\">").concat(formattedTime, "</div>\n      </div>\n    ");
    };
    var messageTemplate = function (content) {
        return "<div id=\"right\">".concat(content, "</div>");
    };
    var renderMessage = function (msg) {
        if (!log)
            return;
        // check for message type
        // const type = msg.msgType
        var author = authorTemplate(msg.author);
        var content = messageTemplate(msg.body);
        var authorDiv = templateToHTML(author);
        var contentDiv = templateToHTML(content);
        var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
        log.appendChild(authorDiv);
        log.appendChild(contentDiv);
        if (doScroll) {
            log.scrollTop = log.scrollHeight - log.clientHeight;
        }
    };
    var sysMessage = function (message) {
        renderMessage({
            msgType: "text",
            author: "sys",
            body: message,
        });
    };
    var createWebsocket = function () {
        var host = "ws://" + document.location.host + "/ws";
        var conn = new WebSocket(host);
        conn.onclose = function () { return sysMessage('Connection Closed!'); };
        conn.onmessage = function (event) {
            var msg = JSON.parse(event.data);
            if (!msg)
                return;
            renderMessage(msg);
        };
        return conn;
    };
    if (window["WebSocket"]) {
        conn = createWebsocket();
        sysMessage("Welcome to the chat!");
    }
    else {
        sysMessage('Unsupported Client!');
    }
};

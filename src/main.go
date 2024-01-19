package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"

	ws "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/basicauth"
)

// AUTH="user1:pass1;user2:pass2;user3:pass3"
func getUsers() map[string]string {
	users := make(map[string]string)
	if val, ok := os.LookupEnv("AUTH"); ok {
		authList := strings.Split(val, ";")
		for _, auth := range authList {
			namePass := strings.Split(auth, ":")
			users[namePass[0]] = namePass[1]
		}
		return users
	}
	users["admin"] = "super"
	return users
}

func main() {
	app := fiber.New()

	app.Use(basicauth.New(basicauth.Config{
		Users:           getUsers(),
		ContextUsername: "_user",
		ContextPassword: "_pass",
	}))

	app.Static("/", "./public/")

	app.Use(func(c *fiber.Ctx) error {
		if ws.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return c.SendStatus(fiber.StatusUpgradeRequired)
	})

	go listenLoop()

	app.Post("/files", func(c *fiber.Ctx) error {
		file, err := c.FormFile("document")
		if err != nil {
			return fiber.ErrBadRequest
		}
		filename := fmt.Sprintf("./%s", file.Filename)
		if err := c.SaveFile(file, filename); err != nil {
			return fiber.ErrInternalServerError
		}
		broadcast <- &message{
			Author:  c.Locals("_user").(string),
			MsgType: "media",
			Body:    filename,
		}
		return nil
	})

	app.Get("/ws", ws.New(func(c *ws.Conn) {
		// Unregister on close
		defer func() {
			unregister <- c
			c.Close()
		}()

		// Register
		register <- c

		// Listen for messages
		for {
			msgType, msg, err := c.ReadMessage()
			if err != nil {
				return
			}

			if msgType == ws.TextMessage {
				broadcast <- &message{
					Author:  c.Locals("_user").(string),
					MsgType: "text",
					Body:    string(msg),
				}
			}
		}
	}))

	addr := "8080"
	if val, ok := os.LookupEnv("PORT"); ok {
		addr = val
	}
	log.Fatal(app.Listen(":" + addr))
}

type client struct {
	sync.Mutex
	isClosing bool
}

type message struct {
	MsgType string `json:"msgType"`
	Author  string `json:"author"`
	Body    string `json:"body"`
}

var clients = make(map[*ws.Conn]*client)

var register = make(chan *ws.Conn)
var broadcast = make(chan *message)
var unregister = make(chan *ws.Conn)

func listenLoop() {
	for {
		select {
		case conn := <-register:
			log.Println("client registered")
			clients[conn] = &client{}
		case message := <-broadcast:
			// log.Printf("message: %s", message)
			for conn, c := range clients {
				go func(conn *ws.Conn, c *client) {
					c.Lock()
					defer c.Unlock()

					if c.isClosing {
						return
					}

					jsonMsg, err := json.Marshal(&message)
					if err != nil {
						log.Println("jsonerr:", err)
					}
					err = conn.WriteMessage(ws.TextMessage, []byte(jsonMsg))
					if err != nil {
						log.Println("message failed, closing")
						c.isClosing = true

						conn.WriteMessage(ws.CloseMessage, []byte{})
						conn.Close()
						unregister <- conn
					}
				}(conn, c)
			}
		case conn := <-unregister:
			delete(clients, conn)
			log.Println("connection unregistered")
		}
	}
}

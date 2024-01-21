package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	ws "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/basicauth"
)

func getUsers(authString string) map[string]string {
	users := make(map[string]string)
	authList := strings.Split(authString, ";")
	for _, auth := range authList {
		namePass := strings.Split(auth, ":")
		users[namePass[0]] = namePass[1]
	}
	return users
}

const (
	STATIC_FILES = "public/"
	USER_UPLOADS = "upload/"
)

// Defaults
const (
	PORT          = "8080"
	AUTH          = "admin:cutest;dio:itwas"
	MAX_FILE_SIZE = "128" // in MiB
)

func getEnv(key string, inLieuOf string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return inLieuOf
}

func main() {
	addr := getEnv("PORT", PORT)
	authList := getEnv("AUTH", AUTH)
	maxFileSize := getEnv("MAX_FILE_SIZE", MAX_FILE_SIZE)
	parsedMaxFileSize, _ := strconv.Atoi(maxFileSize)

	app := fiber.New(fiber.Config{
		BodyLimit: parsedMaxFileSize * 1024 * 1024,
	})

	app.Use(basicauth.New(basicauth.Config{
		Users:           getUsers(authList),
		ContextUsername: "_user",
		ContextPassword: "_pass",
	}))

	app.Static("/", STATIC_FILES)

	app.Post("/upload", func(c *fiber.Ctx) error {
		file, err := c.FormFile("media")
		if err != nil {
			log.Println("formfile:", err)
			return fiber.ErrBadRequest
		}
		f, err := file.Open()
		if err != nil {
			log.Println("fileOpen:", err)
			return fiber.ErrInternalServerError
		}
		h := sha256.New()
		if _, err := io.Copy(h, f); err != nil {
			log.Println("filecopy:", err)
			return fiber.ErrInternalServerError
		}
		fileExtension := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%s%x%s", USER_UPLOADS, h.Sum(nil), fileExtension)
		saveDir := STATIC_FILES + filename
		if err := os.MkdirAll(filepath.Dir(saveDir), 0777); err != nil {
			log.Println("mkdirAll: ", err)
			return fiber.ErrInternalServerError
		}
		if err := c.SaveFile(file, saveDir); err != nil {
			log.Println("saveFile: ", err)
			return fiber.ErrInternalServerError
		}
		broadcast <- &message{
			Author:  c.Locals("_user").(string),
			MsgType: "media",
			Body:    filename,
		}
		return nil
	})

	wsGroup := app.Group("/ws")
	wsGroup.Use(func(c *fiber.Ctx) error {
		if ws.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return c.SendStatus(fiber.StatusUpgradeRequired)
	})

	go listenLoop()

	wsGroup.Get("/", ws.New(func(c *ws.Conn) {
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

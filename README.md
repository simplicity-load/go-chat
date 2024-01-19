
# Go Chat (with friends)

Non persistent chat (go) server and (js) client to instantly chat with whomever you want but only if they're in close proximity such that NATing doesn't impose nefarious shackles on your (network's) freedom.

<div align="center">
    <p align="center"> 
    	<img src="./preview.png" width="50%" />
    </p>
    super awesome image ^^
</div>

## Compile TS

`tsc src/index.ts --outDir src/public/`

## Run server

`go run .` and visit http://localhost:8080

Specify user credentials:

`AUTH="user1:pass1;user2:pass2;user3:ssap3" go run .`

Specify port:

`PORT="80" go run .`

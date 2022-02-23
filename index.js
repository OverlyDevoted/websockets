//we create a http to establish a tcp connection in order to pass 
//that into the websocket logic
const { response } = require("express");
const { json } = require("express/lib/response");
const http = require("http");
const { client } = require("websocket");

const app = require("express")();
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})
app.listen(9091, () => {
    console.log("Listening to port 9091")
})

const websocketServer = require("websocket").server
const httpServer = http.createServer();
httpServer.listen(9090, ()=>{console.log("Listening to port 9090")})

const clients = {};
const games = {};
//under the wsServer start owning the httpServer, so maybe
//that's how it gets the tcp?
const wsServer = new websocketServer({
    "httpServer": httpServer
})

//this captures the tcp 
wsServer.on("request", request =>{
    const connection = request.accept(null, request.origin)
    connection.on("open", () => console.log("opened"))
    connection.on("close", () => console.log("closed"))
    connection.on("message", message=>{
        const result = JSON.parse(message.utf8Data)
        //receiving message from user
        console.log(result)
        switch(result.method)
        {
            case "connect":
                console.log("connect");
            break;
            case "create":
                const gameID = createGuid();
                games[gameID] = {
                    "id": gameID,
                    "clients": []
                }
            
                const payLoad ={
                    "method": "create"
                };
                clients[clientId].connection.send(JSON.stringify(payLoad));
                const gameLoad = {
                    "guid": gameID
                };
                clients[clientId].connection.send(JSON.stringify(gameLoad));
                break;
            case "join":
                const game = games[result.guid];
                const client = result.clientId;
                console.log(game + " " + client);
                if(game.clients.length >= 2)
                {
                    console.log("cant join");
                }
                
                game.clients.push({
                    "clientId": client,
                    "prio": game.clients.length
                });
                
                const methodLoad ={
                    "method":"join"
                };
                const gameLoad2 ={
                   "game": game
                };
                game.clients.forEach(c => {
                    clients[c.clientId].connection.send(JSON.stringify(methodLoad))
                    clients[c.clientId].connection.send(JSON.stringify(gameLoad2))
                })

                break;
        }
    })
    
    const clientId = createGuid();
    clients[clientId] = {
        "connection":connection
    };

    const payLoad = {
        "method": "connect"
    }
    connection.send(JSON.stringify(payLoad))
    const clientLoad = {
        "guid": clientId
    }
    console.log(payLoad);
    console.log(clientLoad);
    connection.send(JSON.stringify(clientLoad))
})

function createGuid(){  
    function S4() {  
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
    }  
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();  
 }  
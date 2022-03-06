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
    connection.on("close", (sender, e) => {
        //becomes a problem when we have a lot of users = not scalable
        for(var c in clients)
        {
            if(clients[c].connection.closeEventEmitted)
            {
                console.log("user " + c + " closed connection");
                //console.log(games[clients[c].game].clients);
                HandleServerLeaving(c);
                delete clients[c];
                return;
            }
        }



    })
    connection.on("message", message=>{
        
        const result = JSON.parse(message.utf8Data)
        //receiving message from user
        console.log(result)
         
        switch(result.method)
        {
            case "connect": {
                console.log("connect");
            break;
            }
            case "create": {
                const gameID = createGuid();
                games[gameID] = {
                    "guid": gameID,
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
            }
            case "join": {
                const game = games[result.guid];
                const client = result.clientId;

                clients[client].game = result.guid;
                console.log(game);
                if(!game)
                {
                    const methodLoad = {
                        "method":"noGame"
                    }
                    clients[client].connection.send(JSON.stringify(methodLoad));
                    const payLoad = {
                        "reason":"No such game"
                    }
                    clients[client].connection.send(JSON.stringify(payLoad));
                    console.log("User " + client + " tried to connect to non existant game. Aborting");
                    return;
                }
                if(game.clients.length >= 2)
                {
                    const methodLoad = {
                        "method":"noGame"
                    }
                    clients[client].connection.send(JSON.stringify(methodLoad));
                    const payLoad = {
                        "reason":"The lobby is full"
                    }
                    clients[client].connection.send(JSON.stringify(payLoad));
                    console.log(client + " because the lobby is full");
                    return;
                }

                game.clients.push({
                    "guid": client,
                    "prio": game.clients.length,
                    "ready": "no"
                });
                games[result.guid] = game;

                //response
                const methodLoad ={
                    "method":"join"
                };
                const gameLoad2 ={
                   "guid": game.guid,
                   "clients":game.clients
                };
                game.clients.forEach(c => {
                    clients[c.guid].connection.send(JSON.stringify(methodLoad))
                    clients[c.guid].connection.send(JSON.stringify(gameLoad2))
                })
                break;
            }
            case "ready": {
                let clientID = result.clientId;
                let gameID = clients[clientID].game;
                let game = games[gameID];
                let isReady = false;
                let otherUser;
                game.clients.forEach(client =>{
                    if(client.guid === clientID)
                    {
                        client["ready"] = "yes";
                    }
                    else
                    {
                        if(client.ready === "yes")
                        {
                            isReady=true;
                            otherUser = client.guid;
                        }
                    }
                });
                if(isReady)
                {
                    let methodLoad = {"method":"startgame"};
                    let payLoad = {"response":"Both players ready"};
                    SendMessage(clients[otherUser].connection, methodLoad, payLoad);
                    SendMessage(clients[clientID].connection, methodLoad, payLoad);
                }
                break;
            }
            case "leaveGame": {
                const clientID = result.clientId;
                HandleServerLeaving(clientID);
                clients[clientID].game = "";
                const methodResponse ={
                    "method":"noGame"
                }
                clients[clientID].connection.send(JSON.stringify(methodResponse));
                const responseLoad ={
                    "reason":"Left lobby"
                }
                clients[clientID].connection.send(JSON.stringify(responseLoad));
                break;
            }
            case "pong": {
                console.log("ponged");
                break;
            }
        }
    })
    
    const clientId = createGuid();
    clients[clientId] = {
        "connection":connection,
        "game":null
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
 function ConvertStringToHex(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) {
           arr[i] = ("00" + str.charCodeAt(i).toString(16)).slice(-4);
    }
    return "\\u" + arr.join("\\u");
}
function SendMessage(connection, methodLoad, payLoad)
{
    connection.send(JSON.stringify(methodLoad));
    connection.send(JSON.stringify(payLoad));
}
function HandleServerLeaving(c)
{
    const gameID = clients[c].game;
    const game = games[gameID];
    if(game)
    {
        if(game.clients.length === 1)
        {
            delete games[gameID];
            console.log("deleted game " + gameID);
        }
        else
        {
            let stayed;
            //to do update other user
            game.clients.forEach(client =>{
                if(client.guid != c){
                    game.clients = [];
                    game.clients.push({
                        "guid": client.guid,
                        "prio": game.clients.length,
                        "ready": client.ready
                    });
                    games[gameID] = game;
                    
                    const methodLoad = {
                        "method":"update"
                    }
                    clients[client.guid].connection.send(JSON.stringify(methodLoad));
                    const payLoad = {
                        "guid":c
                    }
                    clients[client.guid].connection.send(JSON.stringify(payLoad));
                }
            }) 
        }
    }
}
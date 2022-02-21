//we create a http to establish a tcp connection in order to pass 
//that into the websocket logic
const { response } = require("express");
const { json } = require("express/lib/response");
const http = require("http");

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

//under the wsServer start owning the httpServer, so maybe
//that's how it gets the tcp?
const wsServer = new websocketServer({
    "httpServer": httpServer
})

//this captures the tcp 
wsServer.on("request", request =>{
    const connection = request.accept(null, request.origin)
    connection.on("open", () => console.log("opened"))
    connection.on("close", ()=>console.log("closed"))
    connection.on("message", message=>{
        const result = JSON.parse(message.utf8Data)
        //receiving message from user
        console.log(result)
        if(result.method = "sendege")
        {
            const payLoad = {                
                "method": "respond",
                "client": result.client
            } 
            console.log(result.client);
            
            for(var i in clients)
            {
                if(i != result.client)
                {
                    var con = clients[i].connection;
                    con.send(JSON.stringify(payLoad));
                }
            }
        }
    })

    const clientId = createGuid();
    clients[clientId] = {
        "connection":connection
    };

    const payLoad = {
        "method": "connect",
        "client": clientId
    }
    //sends back the client connect
    connection.send(JSON.stringify(payLoad))
})

function createGuid(){  
    function S4() {  
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
    }  
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();  
 }  
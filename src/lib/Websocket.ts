import * as WebSocket from 'websocket'
import * as http from 'http'
import * as os from 'os'
        
export default class Websocket {
    
    private server: http.Server
    private socket: WebSocket.server
    
    private port: number = 80

    private connections: Map<string, WebSocket.connection> = new Map()

    private maxConnectionAttempts = 10
    private connectionAttempCount = 0
    
    private connectedCallback: () => void = () => console.log('CONNECTED', this.port)
    private errorCallback: (error: Error) => void = console.log

    private actions: Map<WebsocketActions, (payload?:{}) => void> = new Map()

    constructor () {}

    public connect(cb: () => void) : void
    {
        this.connectedCallback = cb

        if(this.server) this.server.close()

        this.server = http.createServer((req, res) => {
            res.write('Hello')
            res.end()
        })

        this.socket = new WebSocket.server({
            httpServer: this.server,
            autoAcceptConnections: false
        })

        this.mountHooks()

        this.server.listen(this.port)
    }

    private reconnect(error: Error): void
    {
        this.connectionAttempCount++

        if(this.connectionAttempCount > this.maxConnectionAttempts)
        {
            this.errorCallback(error)
            return
        }

        this.port++
        this.server.listen(this.port)
    }

    private mountHooks(): void 
    {
        this.server.on('listening', () => {
            this.connected()
        })

        this.server.on('error', (error) => {

            if(!error.message.includes('EADDRINUSE'))
            {
                console.log('ERROR WEBSOCKET')
                this.errorCallback(error)
                return
            }

            this.reconnect(error)
        })

        this.socket.on('close', (connection: WebSocket.connection, reason: number, desc: string) => {
            
            const connectionAddress = `${connection.socket.remoteAddress}${connection.socket.remotePort}`

            this.connections.delete(connectionAddress)

            console.log('WEBSOCKET CLOSED CONNECTION', connectionAddress)
        })

        this.socket.on('request', (request: WebSocket.request) => {
            
            var connection: WebSocket.connection = request.accept()

            const connectionAddress = `${connection.socket.remoteAddress}${connection.socket.remotePort}`

            console.log('CONNECTED', connectionAddress)

            this.connections.set(connectionAddress, connection)

            connection.on('message', (message: WebSocket.IMessage) => {

                if (message.type !== 'utf8') return

                const cueMessage = JSON.parse(message.utf8Data) as CueWebsocketMessage

                console.log('WEBSOCKET MESSAGE RECEIVED', cueMessage)

                cueMessage.payload.address = connectionAddress

                const action = this.actions.get(cueMessage.action)

                if(action) action(cueMessage.payload)
            })
        })
    }

    public async send(message: CueWebsocketMessage, address: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            const connection: WebSocket.connection = this.connections.get(address)
            
            if(!connection) return reject()

            connection.send(JSON.stringify(message))

            resolve()
        })
    }

    public async on(action: WebsocketActions, cb: (paylod: {[key:string]:any}) => void): Promise<void>
    {
        return new Promise((resolve, reject) => {
            this.actions.set(action, cb)
        })
    }

    public getAdress() : { port: number, address: string }
    {
        const nInterfaces = os.networkInterfaces()

        const ethInterface  = nInterfaces['eth0']
        const wifiInterface = nInterfaces['Wi-Fi']

        //use ethernet if availible else Wifi
        const chosenInterface = (ethInterface) ? ethInterface : wifiInterface

        // filter out internal (i.e. 127.0.0.1) and non-ipv4 addresses and get the first
        const chosenAddress = chosenInterface.filter(nif => ('IPv4' == nif.family && nif.internal == false))[0]

        return {
            port    : this.port,
            address : chosenAddress.address
        }
    }

    public connected(): void 
    {
        this.connectedCallback()
    }

    onError(cb: (error: Error) => void): any {
        this.errorCallback = cb
    }
}

export enum WebsocketActions {
    CALIBRATION_PROBE   = 'calibration-probe',
    DISCONNECT_SENSOR   = 'disconnect',
    CALIBRATION_MODE    = 'calibration',
    CALIBRATION_END     = 'calibration-end',
    LISTENING_MODE      = 'listen',
    CONNECT             = 'connect',
    FORGET_SENSORS      = 'forget',
    PAIRING_MODE        = 'pairing',
    SYNC_SENSORS        = 'sync-sensors',
    DEBUG               = 'debug',
    STOP                = 'stop',
}

export interface CueWebsocketMessage {
    action  : WebsocketActions
    payload : {[key:string]:any}
}

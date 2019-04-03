import * as WebSocket from 'websocket'
import * as http from 'http'
import * as os from 'os'
        
export default class Websocket {
    
    private server: http.Server
    private socket: WebSocket.server
    
    private port: number = 3050

    private maxConnectionAttempts = 10
    private connectionAttempCount = 0
    
    private connectedCallback: () => void = () => { console.log('CONNECTED', this.port) }
    private errorCallback: (error: Error) => void = console.log

    private actions: Map<CueWebsocketActions, () => void> = new Map()

    constructor () {}

    public connect(cb: () => void) : void
    {
        this.connectedCallback = cb

        if(this.server) this.server.close()

        this.server = http.createServer()

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
            console.log('WEBSOCKET CLOSED CONNECTION, description', desc)
            console.log('WEBSOCKET CLOSED CONNECTION, reason: ', reason)
        })

        this.socket.on('request', (request: WebSocket.request) => {
            
            var connection: WebSocket.connection = request.accept()

            connection.on('message', (message: WebSocket.IMessage) => {

                if (message.type !== 'utf8') return

                const cueMessage = JSON.parse(message.utf8Data) as CueWebsocketMessage

                const action = this.actions.get(cueMessage.action)

                if(action) action()
            })
        })
    }

    public on(action: CueWebsocketActions, cb: () => void)
    {
        this.actions.set(action, cb)
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

export enum CueWebsocketActions {
    ACTIVATE_PAIRING_MODE = 'pairing',
    ACTIVATE_CALIBATION_MODE = 'calibration',
    DISCONNECT_ATTACHED_PERIPHERAL = "disconnect"
}

export interface CueWebsocketMessage {
    action  : CueWebsocketActions
    payload : any
}

import PubSub, { Topics } from "./lib/PubSub";
import Websocket, { CueWebsocketActions } from "./lib/Websocket";
import * as uniqid from 'uniqid'

export default class BaseStation {

    private pubSub: PubSub
    private websocket: Websocket
    
    private deviceUUID: string          = process.env.RESIN_DEVICE_UUID
    private deviceUUIDPrefix: string    = process.env.DEVICE_UUID_PREFIX
    
    constructor (pubsub: PubSub, websocket: Websocket)
    {
        this.pubSub = pubsub
        this.pubSub.setDeviceUUID(this.getId())

        this.websocket = websocket

        this.mountHooks()
    }

    getId(): string
    {
        return `${this.deviceUUIDPrefix}${this.deviceUUID}`
    }

    initialize(): void
    {
        this.pubSub.connect(() => {

            this.websocket.connect(() => {

                console.log('WEBSOCKET CONNECTED', this.websocket.getAdress()) 

                const address = this.websocket.getAdress()

                this.pubSub.publish(Topics.UPDATE_WEBSOCKET, {
                    base_station_port       : address.port,
                    base_station_address    : address.address
                })
            })
        })
    }

    private mountHooks(): void
    {
        this.websocket.on(CueWebsocketActions.ACTIVATE_PAIRING_MODE, () => {

            // wait for bluetooth device to connect with sensor

            this.pubSub.publish(Topics.NEW_SENSOR, {
                sensor_UUID : uniqid()
            })
        })
        
        this.websocket.on(CueWebsocketActions.ACTIVATE_CALIBATION_MODE, () => {
            console.log(CueWebsocketActions.ACTIVATE_CALIBATION_MODE)
        })

        this.websocket.onError(this.errorHandler)

        this.pubSub.onError(this.errorHandler)
    }

    private errorHandler(error: Error): void
    {
        console.log('ERROR', error)
    }
}
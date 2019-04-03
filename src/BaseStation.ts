import PubSub, { Topics } from "./lib/PubSub";
import Websocket, { CueWebsocketActions } from "./lib/Websocket";
import * as uniqid from 'uniqid'
import Bluetooth from "./lib/Bluetooth";
import * as Noble from 'noble';

export default class BaseStation {
    private pubSub: PubSub
    private websocket: Websocket
    private bluetooth: Bluetooth
    
    private deviceUUID: string          = process.env.RESIN_DEVICE_UUID
    private deviceUUIDPrefix: string    = process.env.DEVICE_UUID_PREFIX

    constructor (pubsub: PubSub, websocket: Websocket, bluetooth: Bluetooth)
    {
        this.pubSub = pubsub
        this.pubSub.setDeviceUUID(this.getId())

        this.websocket = websocket

        this.bluetooth = bluetooth

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

        this.listenForAlerts()
    }

    private listenForAlerts(): void 
    {
        console.log("Registering default mode callback")
        this.bluetooth.scan(this.bluetooth.defaultScanFilter, (peripheral) => {
            console.log("We be scanning")
        })
    }

    private mountHooks(): void
    {
        this.websocket.on(CueWebsocketActions.ACTIVATE_PAIRING_MODE, () => {
            console.log("Registering pairing mode callback")
            this.bluetooth.scan(this.bluetooth.defaultScanFilter, (peripheral) => {
                const sensorId = peripheral.id

                this.pubSub.publish(Topics.NEW_SENSOR, {
                    sensor_UUID : sensorId
                })

                this.listenForAlerts();
            })
        })
        
        this.websocket.on(CueWebsocketActions.ACTIVATE_CALIBATION_MODE, () => {
            console.log(CueWebsocketActions.ACTIVATE_CALIBATION_MODE)
        })

        this.websocket.on(CueWebsocketActions.DISCONNECT_ATTACHED_PERIPHERAL, () => {
            this.bluetooth.disconnectPeripheral();
        })

        this.websocket.onError(this.errorHandler)

        this.pubSub.onError(this.errorHandler)
      
        this.bluetooth.onConnectHangup(() => {
            console.log("Connecting to peripheral failed, we should restart everything now")
        });
      
        this.bluetooth.onAudioAlert((sensorId) => {
            console.log("Audio trigger.")

            this.pubSub.publish(Topics.NOTIFICATION, {
                sensor_UUID : sensorId
            })
        })
      
        this.bluetooth.onPeripheralButton(() => {
            console.log("Button clicked")
        });
    }

    private errorHandler(error: Error): void
    {
        console.log('ERROR', error.message)
    }
}

process
.on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p)
})
.on('uncaughtException', error => {
    console.log('')
    console.log('**********************************************')
    console.error('Uncaught Exception thrown')
    console.error(error.message)
    console.log('**********************************************')
    console.log('')
})
import PubSub, { Topics } from "./lib/PubSub";
import Websocket, { CueWebsocketActions } from "./lib/Websocket";
import Bluetooth from "./lib/BluetoothTwo";

const sensorIdMock = '0c087570-4990-11e9-ac8f-454c002d928c'

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
            
            // this.pubSub.publish(Topics.HEARTBEAT, {
            //     id                      : "0c087570-4990-11e9-ac8f-454c002d928c",
            //     signal_strength         : Math.random()*10,
            //     battery_level           : Math.random()*100,
            // })
        })

        this.bluetooth.poweredOn(() => {
            this.bluetooth.scan()
        })
    }

    private mountHooks(): void
    {
        this.websocket.on(CueWebsocketActions.ACTIVATE_PAIRING_MODE, () => {
            
            console.log("PAIRING MODE activated")

            // this.bluetooth.stopScaning()

            // this.bluetooth.scan(this.bluetooth.pairingScanFilter, (peripheral) => {
            //     const sensorId = peripheral.id

            //     this.pubSub.publish(Topics.NEW_SENSOR, {
            //         id : sensorId
            //     })
            // }, true)
        })
        
        this.websocket.on(CueWebsocketActions.ACTIVATE_CALIBATION_MODE, () => {
            console.log("CALIBRATIONS MODE activated")

            this.pubSub.publish(Topics.CALIBRATION, {
                id              : sensorIdMock,
                db_threshold    : Math.random()*10,
            })
        })

        this.websocket.on(CueWebsocketActions.DISCONNECT_ATTACHED_PERIPHERAL, () => {
            // this.bluetooth.disconnectPeripheral()
        })

        this.websocket.onError(this.errorHandler)

        this.pubSub.onError(this.errorHandler)
      
        // this.bluetooth.onConnectHangup(() => {
        //     console.log("Connecting to peripheral failed, we should restart everything now")
        // });
      
        // this.bluetooth.onAudioAlert((sensorId) => {
        //     console.log("Audio trigger.")

        //     this.pubSub.publish(Topics.NOTIFICATION, {
        //         id : sensorId
        //     })
        // })
      
        // this.bluetooth.onPeripheralButton(() => {
        //     console.log("Button clicked")
        // });
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
    console.error(error)
    console.log('**********************************************')
    console.log('')
})
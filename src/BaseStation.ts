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

    // for now, this is a hardcoded string, but we should probably have a map of allowed peripherals
    private allowedPeripheralName: string = "home-cue"

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

        this.bluetooth.scan();
    }

    private mountHooks(): void
    {
        this.websocket.on(CueWebsocketActions.ACTIVATE_PAIRING_MODE, () => {
            
            this.bluetooth.setScanFilter((peripheral: Noble.Peripheral) => {
                return peripheral.advertisement.localName === this.allowedPeripheralName
            });

            /* this.bluetooth.scan((device) => {
                this.pubSub.publish(Topics.NEW_SENSOR, {
                    sensor_UUID : uniqid()
                })
            }) */
            
            // wait for bluetooth device to connect with sensor
        })
        
        this.websocket.on(CueWebsocketActions.ACTIVATE_CALIBATION_MODE, () => {
            console.log(CueWebsocketActions.ACTIVATE_CALIBATION_MODE)
        })

        this.websocket.onError(this.errorHandler)

        this.pubSub.onError(this.errorHandler)

        this.bluetooth.onDeviceFound((deviceID: string, servicesMap: Map<string, Noble.Service>) => {
            console.log("Found device")
        });
      
        this.bluetooth.onConnectHangup(() => {
            console.log("Connecting to peripheral failed, we should restart everything now")
          });
      
        this.bluetooth.onAudioAlert(() => {
            console.log("Audio trigger. Should publish notification!")
          });
      
        this.bluetooth.onPeripheralButton(() => {
            console.log("Button clicked!")
          });
    }

    private errorHandler(error: Error): void
    {
        console.log('ERROR', error)
    }
}
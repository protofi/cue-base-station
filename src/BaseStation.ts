import PubSub, { Topics } from "./lib/PubSub";
import Websocket, { CueWebsocketActions } from "./lib/Websocket";
import Bluetooth from "./lib/Bluetooth";
import Sensor, { CHAR } from "./lib/Bluetooth/Sensor";
import { CalibrationScannerStrategy, PairingScannerStrategy } from "./lib/Bluetooth/ScannerStrategy";
import delay from "./util/delay";

enum TIMER {
    PAIRING = 'pairing'
}

export default class BaseStation {
    private pubSub: PubSub
    private websocket: Websocket
    private bluetooth: Bluetooth
    
    private deviceUUID: string          = process.env.RESIN_DEVICE_UUID
    private deviceUUIDPrefix: string    = process.env.DEVICE_UUID_PREFIX

    private timers: Map<TIMER, NodeJS.Timeout> = new Map<TIMER, NodeJS.Timeout>()

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

        this.bluetooth.poweredOn(() => {
            this.bluetooth.scan()
        })
    }

    private mountHooks(): void
    {
        this.websocket.on(CueWebsocketActions.ACTIVATE_PAIRING_MODE, () => {
            
            console.log("PAIRING MODE activated")

            this.bluetooth.scan(new PairingScannerStrategy(this.bluetooth), (sensor: Sensor) => {
                const sensorId = sensor.getId()

                this.pubSub.publish(Topics.NEW_SENSOR, {
                    id : sensorId
                })
                
                // this.pubSub.publish(Topics.HEARTBEAT, {
                //     id              : sensor.getId(),
                //     signal_strength : sensor.getRssi(),
                //     battery_level   : Math.random()*100,
                // })
                this.bluetooth.scan()
            })

            this.startTimer(TIMER.PAIRING, () => {
                this.bluetooth.scan()
            }, 30)
        })
        
        this.websocket.on(CueWebsocketActions.STOP, () => {
            this.bluetooth.stopScanning()
        })

        this.websocket.on(CueWebsocketActions.ACTIVATE_CALIBATION_MODE, (payload) => {
            
            console.log("CALIBRATIONS MODE activated")
            
            // const sensorId = '00a050596aa0'//payload.id

            this.bluetooth.scan(new CalibrationScannerStrategy(this.bluetooth), async (sensor: Sensor) => {

                const readings: Array<Buffer> = []

                const probeCount = 3
                const timeBetweenProbes = 5000

                try
                {
                	//flushing value by reading
                	await sensor.readCharacteristic(CHAR.RSSI_LEVEL)

                	console.log('INITIALIZING SOUND LEVEL PROBING')

                	for (let i = 0; i < probeCount; i++)
                	{
                		await delay(timeBetweenProbes)

                		console.log('READING VALUE', i)
                        
                		readings.push(
                			await sensor.readCharacteristic(CHAR.RSSI_LEVEL)
                		)
            
                        console.log('CALIBRATION PROBING', i)
                    }

                    readings.forEach((buffer: Buffer) => {
                        console.log('READING', buffer.readUInt8(0))
                    })
                }
                catch(e)
                {
                	console.log('ERROR', e)
                }

                await sensor.disconnect()
                this.bluetooth.scan()
            })
        })

        this.websocket.on(CueWebsocketActions.SYNC_SENSORS, (payload: any) => {
            console.log('SYNC SENSORS', payload)
            this.bluetooth.syncSensors(payload.sensors)
        })

        this.websocket.on(CueWebsocketActions.ACTIVATE_LISTENING_MODE, () => {
            this.bluetooth.scan()
        })

        this.websocket.on(CueWebsocketActions.DISCONNECT_ATTACHED_PERIPHERAL, () => {
            this.bluetooth.disconnectPeripheral()
        })

        this.websocket.on(CueWebsocketActions.FORGET_SENSORS, () => {
            this.bluetooth.forgetSensors()
        })

        this.websocket.on(CueWebsocketActions.DEBUG, () => {
            this.bluetooth.toggleDebug()
        })

        this.websocket.onError(this.errorHandler)

        this.pubSub.onError(this.errorHandler)
       
        this.bluetooth.onAlert((sensor: Sensor) => {

            this.pubSub.publish(Topics.NOTIFICATION, {
                id : sensor.getId()
            })
        })
    }

    private errorHandler(error: Error): void
    {
        console.log('ERROR', error.message)
    }

    private startTimer(name: TIMER, callback: () => void, seconds: number)
    {
        const timer = setTimeout(callback, seconds * 1000)

        this.timers.set(name, timer)
    }

    private clearTimer(name?: TIMER)
    {
        const timer = (name) ? this.timers.get(name) : null

        if(timer) clearTimeout(timer)
        else {
            this.timers.forEach((timer) => {
                clearTimeout(timer)
            })
        }
    }
}

process
.on('unhandledRejection', (reason, p) => {
    console.log('')
    console.log('**********************************************')
    console.log('')
    console.error('Unhandled Rejection of Promise')
    console.error(reason)
    console.error(p)
    console.log('')
    console.log('**********************************************')
    console.log('')
})
.on('uncaughtException', error => {
    console.log('')
    console.log('**********************************************')
    console.log('')
    console.error('Uncaught Exception thrown')
    console.error(error.message)
    console.error(error)
    console.log('')
    console.log('**********************************************')
    console.log('')
})
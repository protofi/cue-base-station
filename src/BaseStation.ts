import { CalibrationScannerStrategy, PairingScannerStrategy } from "./lib/Bluetooth/ScannerStrategy";
import Websocket, { WebsocketActions as WSActions } from "./lib/Websocket";
import SensorImpl, { Sensor, CHAR } from "./lib/Bluetooth/Sensor";
import PubSub, { Topics } from "./lib/PubSub";
import { Bluetooth } from "./lib/Bluetooth";
import delay from "./util/delay";
import { mean } from 'lodash'

enum TIMER {
    PAIRING = 'pairing'
}
export default class BaseStation
{
    private pubSub: PubSub
    private websocket: Websocket
    private bluetooth: Bluetooth
    
    private deviceUUID: string          = process.env.RESIN_DEVICE_UUID
    private deviceUUIDPrefix: string    = process.env.DEVICE_UUID_PREFIX

    private timers: Map<TIMER, NodeJS.Timeout> = new Map<TIMER, NodeJS.Timeout>()

    private calibrationReadings: Array<Buffer> = []

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
        this.bluetooth.onAudioTrigger(async (sensor: Sensor) => {

            this.pubSub.publish(Topics.NOTIFICATION, {
                id : sensor.getId()
            })

            await sensor.touch()

            this.pubSub.publish(Topics.HEARTBEAT, {
                id              : sensor.getId(),
                signal_strength : sensor.getRssi(),
                battery_level   : Math.random()*100,
            })

			this.bluetooth.scan()
        })

        this.websocket.on(WSActions.CONNECT, () => {
            
            this.bluetooth.scan(null, async (sensor: Sensor) => {
                
                await sensor.connect()

                const threshold = await sensor.readCharacteristic(CHAR.THRESHOLD_LEVEL)                
                
                await sensor.writeValue(100, CHAR.THRESHOLD_LEVEL)

                const threshold2 = await sensor.readCharacteristic(CHAR.THRESHOLD_LEVEL)                

                console.log('TRHESHOLDS', threshold.readUInt8(0), threshold2.readUInt8(0))

                await sensor.disconnect()
            })
        })

        this.websocket.on(WSActions.PAIRING_MODE, () => {
            
            console.log("PAIRING MODE activated")

            this.bluetooth.scan(new PairingScannerStrategy(this.bluetooth), async (sensor: Sensor) => {
                
                this.clearTimer(TIMER.PAIRING)

                const sensorId = sensor.getId()

                await this.pubSub.publish(Topics.NEW_SENSOR, {
                    id : sensorId
                })
                
                this.pubSub.publish(Topics.HEARTBEAT, {
                    id              : sensor.getId(),
                    signal_strength : sensor.getRssi(),
                    battery_level   : Math.random()*100,
                })

                this.bluetooth.scan()
            })

            this.startTimer(TIMER.PAIRING, () => {
                this.bluetooth.scan()
            }, 30)
        })
        
        this.websocket.on(WSActions.CALIBRATION_MODE, (payload) => {
            
            console.log("CALIBRATIONS MODE activated")
            
            this.calibrationReadings = []

            console.log('SENSOR ID', payload.sensorId)

            this.bluetooth.scan(new CalibrationScannerStrategy(this.bluetooth), async (sensor: Sensor) => {

                try
                {
                	//flushing value by reading
                	await sensor.readCharacteristic(CHAR.MAX_AUDIO_LEVEL)

                    this.websocket.send({
                        action  : WSActions.CALIBRATION_MODE,
                        payload : {
                            sensorId : sensor.getId()
                        }
                    }, payload.address)
                }
                catch(e)
                {
                	console.log('ERROR', e)
                }
            }, [payload.sensorId])
        })

        this.websocket.on(WSActions.CALIBRATION_PROBE, async (payload) => {

            try
            {
                const sensor = this.bluetooth.getConnectedSensor()

                await delay(5000)

                const reading = await sensor.readCharacteristic(CHAR.MAX_AUDIO_LEVEL)

                this.websocket.send({
                    action  : WSActions.CALIBRATION_PROBE,
                    payload : {
                        reading     : reading.readUInt8(0),
                        probeIndex  : payload.probeIndex,
                        sensorId    : sensor.getId(),
                    }
                }, payload.address)

                this.calibrationReadings.push(reading)
            }
            catch(e)
            {
                console.log('ERROR', e)
            }

            if(payload.probeIndex < payload.probeCount) return

            try
            {
                console.log('READINGS', this.calibrationReadings.map(buffer => buffer.readUInt8(0)))

                const avgReading = mean(this.calibrationReadings.map(buffer => buffer.readUInt8(0)))

                console.log('AVG READING', avgReading)

                const sensor = this.bluetooth.getConnectedSensor()
    
                await sensor.writeValue(avgReading, CHAR.THRESHOLD_LEVEL)

                await this.bluetooth.disconnectSensor()

                this.calibrationReadings = []
            }
            catch(e)
            {
                console.log('ERROR', e)
            }

            this.bluetooth.scan()
        })

        this.websocket.on(WSActions.CALIBRATION_END, async () => {

            try
            {
                await this.bluetooth.disconnectSensor()
                this.calibrationReadings = []
            }
            catch(e)
            {
                console.log('ERROR', e)
            }

            this.bluetooth.scan()
        })

        this.websocket.on(WSActions.SYNC_SENSORS, (payload: any) => {
            console.log('SYNC SENSORS', payload)
            this.bluetooth.syncSensors(payload.sensors)
        })

        this.websocket.on(WSActions.DISCONNECT_SENSOR,   () => this.bluetooth.disconnectSensor())
        this.websocket.on(WSActions.LISTENING_MODE,      () => this.bluetooth.scan())
        this.websocket.on(WSActions.FORGET_SENSORS,      () => this.bluetooth.forgetSensors())
        this.websocket.on(WSActions.DEBUG,               () => this.bluetooth.toggleDebug())
        this.websocket.on(WSActions.STOP,                () => this.bluetooth.stopScanning())

        this.websocket.onError(this.errorHandler.bind(this))
        this.pubSub.onError(this.errorHandler.bind(this))
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
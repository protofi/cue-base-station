import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor, { TRIGGER } from './Sensor';
import { disconnect } from 'cluster';

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : Sensor
}

export default class Bluetooth {
	
	private sensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private connectedSensor: Sensor = null

	private deviceFoundCallback: 	(sensor: Sensor) => void = null
	private audioTriggerCallback: 	(sensor: Sensor) => void = null
	private buttonTriggerCallback: 	(sensor: Sensor) => void = null

	private defaultScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return null

		const { localName } = peripheral.advertisement

		if(localName != this.sensorName) return null
		if(!this.knownSensors.has(peripheral.id)) return null

		// this.stopScanning()

		const sensor = new Sensor(peripheral)
		// const _this = this
		
		// sensor.connect(() => {
		// 	_this.connectedSensor = sensor
		// }, () => {
		// 	_this.scan()
		// })

		if(sensor.wasTriggerBy(TRIGGER.AUDIO))
		{
			console.log('AUDIO TRIGGER')
			
			// if(this.audioTriggerCallback)
			// 	this.audioTriggerCallback(sensor)
		}
	
		if(sensor.wasTriggerBy(TRIGGER.BUTTON))
		{
			console.log('BUTTON TRIGGER')

			// if(this.buttonTriggerCallback)
			// 	this.buttonTriggerCallback(sensor)
		}
		
		return sensor
	}

	public pairingScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return null

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return null
		if(this.knownSensors.has(peripheral.id)) return null

		const sensor = new Sensor(peripheral)

		if(!sensor.wasTriggerBy(TRIGGER.BUTTON)) return null

		this.knownSensors.add(sensor.id)

		this.stopScanning(() => {

			sensor.connect(() => {

				sensor.disconnect()
			}, () => {
				
				this.scan()
			})
		})
		
		return sensor
	}

	private scannerStrategy: ScannerStrategy = this.defaultScannerStrategy

	private stateChangeActions: Map<string, () => void> = new Map()

	constructor() {
		this.mountHooks()
	}

	private mountHooks()
    {
		Noble.on("stateChange", this.stateChange.bind(this))
		Noble.on("discover", 	this.deviceDiscovered.bind(this))

        Noble.on("scanStart", () => {
            console.log('BLUETOOTH =============================> SCANNING STARTED')
        })

        Noble.on("scanStop", () => {
            console.log('BLUETOOTH =============================> SCANNING STOPPED')
        })
    }

	private stateChange(state: string)
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	private deviceDiscovered(peripheral: Noble.Peripheral)
	{
		const sensor:Sensor = this.scannerStrategy(peripheral)
		if(!sensor) return

		if(this.deviceFoundCallback)
			this.deviceFoundCallback(sensor)
	}

	public disconnectPeripheral()
	{
		console.log('DISCONNECTING SENSOR FROM BLE')

		if(this.connectedSensor)
		{
			this.connectedSensor.disconnect()
		}
		else
		{
			console.log('NO SENSOR FOUND')
		}
	}

	/**
	 * stopScanning
	 */
	private stopScanning(callback?: () => void)
	{
		Noble.stopScanning(callback)
	}
	/**
	 * scan
	 */
	public scan(scannerStrategy?: ScannerStrategy, deviceFoundCallback?: (sensor: Sensor) => void)
	{
		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultScannerStrategy
		this.deviceFoundCallback = (deviceFoundCallback) ? deviceFoundCallback : null

		Noble.startScanning([], true) // any service UUID, duplicates allowed
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void {
		this.audioTriggerCallback = cb
	}

}

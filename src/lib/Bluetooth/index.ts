import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor, { TRIGGER, CHAR } from './Sensor'
import delay from '../../util/delay'

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : Promise<Sensor>
}

export default class Bluetooth {

	private debug = false

	private scanning: boolean = false

	private cueSensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private connectedSensor: Sensor = null

	private heartbeatCallback: 			(sensor: Sensor) => void = null
	private deviceFoundCallback: 		(sensor: Sensor) => void = null
	private audioTriggerCallback: 		(sensor: Sensor) => void = null
	private buttonTriggerCallback: 		(sensor: Sensor) => void = null
	private calibrationTriggerCallback: (payload: {[key:string]:any}) => void = null

	private defaultScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral): Promise<Sensor> => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor = new Sensor(peripheral)

		if(!this.knownSensors.has(sensor.getId()))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if((!Object.values(TRIGGER).includes(sensor.getTrigger())))	return null

		await this.stopScanning()

		sensor.touch()
		.then(() => {
			this.scan() //must be async to allow deviceFoundCallback tobe called
		})
		
		if(this.heartbeatCallback)
			this.heartbeatCallback(sensor)

		if(sensor.wasTriggerBy(TRIGGER.AUDIO)
		|| sensor.wasTriggerBy(TRIGGER.AUD)/* LEGACY */)
		{
			if(this.audioTriggerCallback)
				this.audioTriggerCallback(sensor)
		}
		
		return sensor
	}

	public pairingScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral): Promise<Sensor> => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor: Sensor = new Sensor(peripheral)

		if(this.knownSensors.has(sensor.getId()))
		{
			console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if(!(sensor.wasTriggerBy(TRIGGER.BUTTON)
			|| sensor.wasTriggerBy(TRIGGER.BTN)/* LEGACY */))
		{
			return null
		}

		this.knownSensors.add(sensor.getId())

		await this.stopScanning()

		sensor.touch()
		.then(() => {
			this.scan() //must be async to allow deviceFoundCallback tobe called
		})
		
		if(this.heartbeatCallback)
			this.heartbeatCallback(sensor)
		
		return sensor
	}

	public calibrationScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral): Promise<Sensor> => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor: Sensor = new Sensor(peripheral)

		if(!this.knownSensors.has(sensor.getId()))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		}

		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if(!(sensor.wasTriggerBy(TRIGGER.BUTTON)
		  || sensor.wasTriggerBy(TRIGGER.BTN)/* LEGACY */))
		{
			return null
		}

		await this.stopScanning()
		await sensor.connect()

		// await sensor.fetchServicesAndCharacteristics()

		// console.log(sensor.getCharacteristics())

		const data = await sensor.readCharacteristic(CHAR.RSSI_LEVEL)

		console.log('Signed', 	data.readInt8(0))
		console.log('Unsigned', data.readUInt8(0))

		// await sensor.discoverAllServicesAndCharacteristics()
		// console.log(await sensor.getCharacteristics())

		// const readings: Array<Buffer> = []

		// console.log('INITIALIZING SOUND LEVEL PROBING')

		// try
		// {
		// 	//flushing value by reading
		// 	await sensor.readCharacteristic(CHAR.RSSI_LEVEL)

		// 	await delay(3000)

		// 	console.log('READING VALUE', 1)
			
		// 	readings.push(
		// 		await sensor.readCharacteristic(CHAR.RSSI_LEVEL)
		// 	)

		// 	this.calibrationTriggerCallback({
		// 		probeCount : 0,
		// 	})

		// 	await delay(3000)

		// 	console.log('READING VALUE', 2)
			
		// 	readings.push(
		// 		await sensor.readCharacteristic(CHAR.RSSI_LEVEL)
		// 	)

		// 	this.calibrationTriggerCallback({
		// 		probeCount : 1,
		// 	})

		// 	await delay(3000)

		// 	console.log('READING VALUE', 3)
			
		// 	readings.push(
		// 		await sensor.readCharacteristic(CHAR.RSSI_LEVEL)
		// 	)

		// 	this.calibrationTriggerCallback({
		// 		probeCount : 2,
		// 	})
		// }
		// catch(e)
		// {
		// 	console.log('ERROR', e)
		// }

		await sensor.disconnect()
		this.scan()

		return sensor 
	}

	private scannerStrategy: ScannerStrategy = this.defaultScannerStrategy
	private stateChangeActions: Map<string, () => void> = new Map()

	constructor()
	{
		Noble.on('stateChange', this.onStateChange.bind(this))
		Noble.on('discover', 	this.onDiscover.bind(this))

		Noble.on('scanStart', () => {
			console.log('BLUETOOTH =============================> SCANNING STARTED')
		})

		Noble.on('scanStop', () => {
			console.log('BLUETOOTH =============================> SCANNING STOPPED')
		})
		
		this.knownSensors.add('00a050cf66d7')
		this.knownSensors.add('00a050596aa0')
	}

	private onStateChange(state: string)
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	private async onDiscover(peripheral: Noble.Peripheral): Promise<void>
	{
		if(!peripheral) return
		if(!this.scanning) return

		if(this.debug)
			console.log('BLUETOOTH DEVICE FOUND', peripheral.advertisement.localName)

		const sensor: Sensor = await this.scannerStrategy(peripheral)

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

	public stopScanning(): Promise<void>
	{
		this.scanning = false

		return new Promise((resolve, reject) => {
			Noble.stopScanning(resolve)
		})
	}

	public scan(scannerStrategy?: ScannerStrategy, deviceFoundCallback?: (sensor: Sensor) => void, scanFilter: Array<string> = [])
	{
		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultScannerStrategy
		this.deviceFoundCallback = deviceFoundCallback

		console.log('SCAN INITIALIZED')

		if(this.scannerStrategy == this.defaultScannerStrategy)
		{
			console.log('|===> STRATEGY: default')
			console.log('|===> CALLBACK:', !(!deviceFoundCallback))
		}
		else if(this.scannerStrategy == this.pairingScannerStrategy)
		{
			console.log('|===> STRATEGY: pairing')
			console.log('|===> CALLBACK:', !(!deviceFoundCallback))
		}
		else if(this.scannerStrategy == this.calibrationScannerStrategy)
		{
			console.log('|===> STRATEGY: calibration')
			console.log('|===> CALLBACK:', !(!deviceFoundCallback))
		}

		if(this.scanning)
		{
			console.log('BLUETOOTH =============================> SCANNING CONTINUED')
			return
		}

		Noble.startScanning(scanFilter, true)
		this.scanning = true
	}

	public forgetSensors()
	{
		this.knownSensors.clear()
	}

	public poweredOn(cb: () => void): any
	{
		this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void
	{
		this.audioTriggerCallback = cb
	}

	public onButton(cb: (sensor: Sensor) => void): void
	{
		this.buttonTriggerCallback = cb
	}

	public onCalibration(cb: (payload: {[key:string]:any}) => void): void
	{
		this.calibrationTriggerCallback = cb
	}

	public onHeartbeat(cb: (sensor: Sensor) => void): void
	{
		this.heartbeatCallback = cb
	}

	public syncSensors(sensors: Array<string>): void
	{
		sensors.forEach(sensorId => {
			this.knownSensors.add(sensorId)
		})
	}

	public toggleDebug(): void
	{
		this.debug = !this.debug
	}
}

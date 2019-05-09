import * as Noble from 'noble'

export enum TRIGGER {
	AUDIO 	= '4f49445541',
	BUTTON 	= '4e4f54545542'
}
export default class Sensor {
	
    public readonly id: string

    private peripheral: Noble.Peripheral
    private characteristics: Array<Noble.Characteristic>
	private services: Array<Noble.Service>
	
	private disconnectCallback: () => void
	private connectCallback: () => void

    constructor(peripheral: Noble.Peripheral)
    {
        this.peripheral = peripheral
        this.id = peripheral.id

		console.log('SENSOR INSTANTIATED')
	}
	
	public touch(callback: () => void) {

		this.connect(() => {

			this.disconnect(() => {
				callback()
			})
		})
	}

    public connect(connectCallback?: () => void, disconnectCallback?: () => void): void
    {
		this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))
		
		this.connectCallback 	= (connectCallback) ? connectCallback : null
		this.disconnectCallback = (disconnectCallback) ? disconnectCallback : null
		
		console.log('CONNECT SENSOR', this.connectCallback, this.disconnectCallback)
    	this.peripheral.connect(error => console.log)
    }

	private onConnect()
	{
        console.log('SENSOR IS CONNECTED')

		// if(this.currentDeviceFoundCB) this.currentDeviceFoundCB(this.currentPeripheral)

		console.log('RETRIEVING SENSOR DATA')

		const _this = this

		this.peripheral.discoverAllServicesAndCharacteristics(
		(
			error: string,
			services: Noble.Service[],
			chararacteristics: Noble.Characteristic[]
		) => {

			if(error) console.log("There was an error discovering services: ", error)

			_this.characteristics = chararacteristics
			_this.services = services

			console.log('CALLING DISCONNECT')

			
			if(this.connectCallback)
				this.connectCallback()
		})
	}

    public disconnect(cb?: () => void)
    {
		console.log('DISCONNECTING')

		this.peripheral.disconnect(cb)
    }

    private onDisconnect()
    {
        console.log('SENSOR IS DISCONNECTED')
	
		if(this.disconnectCallback)
			this.disconnectCallback()
		else
			console.log('NO DISCONNECT CALLBACK')
	}

	/**
	 * wasTriggerBy
	 */
	public wasTriggerBy(trigger: TRIGGER): boolean
	{
		const { serviceData } = this.peripheral.advertisement

		if(serviceData.length < 1) return false
		
		const t = serviceData[0].uuid

		return (trigger == t)
	}
}
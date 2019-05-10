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
	}
	
	/**
	 * touch
	 */
	public touch(callback: () => void)
	{
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
		
		this.peripheral.connect(error => console.log)
	}

	private onConnect()
	{
		console.log('SENSOR STATE', this.peripheral.state)

		console.log('RETRIEVING SENSOR DATA')

		const _this = this

		// this.peripheral.discoverAllServicesAndCharacteristics(
		// (
		// 	error: string,
		// 	services: Noble.Service[],
		// 	chararacteristics: Noble.Characteristic[]
		// ) => {

		// 	if(error) console.log("There was an error discovering services: ", error)

		// 	_this.characteristics = chararacteristics
		// 	_this.services = services

			if(_this.connectCallback)
				_this.connectCallback()
		// })
	}

    public disconnect(cb?: () => void)
    {
		this.peripheral.disconnect(cb)
    }

    private onDisconnect()
    {
		console.log('SENSOR STATE', this.peripheral.state)
	
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
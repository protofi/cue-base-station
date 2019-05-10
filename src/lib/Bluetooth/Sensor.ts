import * as Noble from 'noble'

export enum TRIGGER {
	AUD 	= '4f49445541',
	BTN 	= '4e4f54545542',
	BUTTON 	= 'BUTTON',
	AUDIO 	= 'AUDIO'
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
		console.log('TOUCHING SENSOR')

		this.connect(() => {

			this.disconnect(() => {
				console.log('INNER DISCONNECT CALLBACK', !(!callback))
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
		console.log('SENSOR IS', this.peripheral.state)
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

			if(_this.connectCallback)
				_this.connectCallback()
		})
	}

    public disconnect(cb?: () => void)
    {
		this.peripheral.disconnect(cb)
    }

    private onDisconnect()
    {
		console.log('SENSOR IS', this.peripheral.state)
	
		console.log('DISCONNECT CALLBACK:', !(!this.disconnectCallback))
		
		if(this.disconnectCallback)
			this.disconnectCallback()
	}

	public getServiceData(): { uuid: string; data: Buffer; }[]
	{
		const { serviceData } = this.peripheral.advertisement

		return serviceData
	}

	/**
	 * wasTriggerBy
	 */
	public wasTriggerBy(trigger: TRIGGER): boolean
	{
		const t = this.getTrigger()
		return (trigger == t)
	}

	public getTrigger(): TRIGGER
	{
		const serviceData = this.getServiceData()

		if(serviceData.length < 1) return null

		return serviceData[0].data.toString('utf8') as TRIGGER
	}
}
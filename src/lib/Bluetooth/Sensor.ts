import * as Noble from 'noble'

export default class Sensor {
    public readonly id: string

    private peripheral: Noble.Peripheral
    private characteristicMap: Map<string, Map<string, Noble.Characteristic>>;
    private servicesMap: Map<string, Noble.Service>;

    constructor(peripheral: Noble.Peripheral)
    {
        this.peripheral = peripheral
        this.id = peripheral.id

        this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))
    }

    public connect(): void
    {
		this.peripheral.connect(error => console.log)
    }

    private onConnect(keepConnectionAlive: boolean) {
        if(!this.peripheral) return

        console.log('SENSOR IS CONNECTED')

        // if(this.currentDeviceFoundCB) this.currentDeviceFoundCB(this.currentPeripheral)

		this.peripheral.discoverAllServicesAndCharacteristics((error, services, chararacteristics) => {
            if(error)
				console.log("There was an error discovering services: ", error)
            else
                this.disconnect()
		})
	}

    public disconnect()
    {
		if(!this.peripheral) return
        this.peripheral.disconnect()
    }

    private onDisconnect()
    {
		this.characteristicMap = new Map<string, Map<string, Noble.Characteristic>>()
		this.servicesMap = new Map<string, Noble.Service>()
        
        console.log('SENSOR IS DISCONNECTED')
	}
}
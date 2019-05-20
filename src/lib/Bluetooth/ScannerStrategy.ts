import * as Noble from 'noble'
import Sensor from "./Sensor";
import Bluetooth from '.';

export default interface ScannerStrategy
{
    execute(peripheral: Noble.Peripheral): Promise<Sensor>
    initialize(peripheral: Noble.Peripheral): Sensor
}

// abstract class AbstractScannerStrategy
// {

//     constructor(bluetooth : Bluetooth) {
//         this.bluetooth = bluetooth
//     }

//     initialize(peripheral: Noble.Peripheral)
//     {
//         const { localName } = peripheral.advertisement

// 		if(localName != this.cueSensorName) return null

// 		return new Sensor(peripheral)

//     }
// }
// export class DefaultScannerStrategy extends AbstractScannerStrategy implements ScannerStrategy
// {
//     constructor() { super() }

//     public async execute(peripheral: Noble.Peripheral): Promise<Sensor> {

	
// 		if(!this.knownSensors.has(sensor.getId()))
// 		{
// 			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
// 			return null
// 		} 

// 		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
// 		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

// 		if((!Object.values(TRIGGER).includes(sensor.getTrigger())))	return null

// 		await this.stopScanning()

// 		sensor.touch()
// 		.then(() => {
// 			this.scan() //must be async to allow deviceFoundCallback tobe called
// 		})
		
// 		if(this.heartbeatCallback)
// 			this.heartbeatCallback(sensor)

// 		if(sensor.wasTriggerBy(TRIGGER.AUDIO)
// 		|| sensor.wasTriggerBy(TRIGGER.AUD)/* LEGACY */)
// 		{
// 			if(this.audioTriggerCallback)
// 				this.audioTriggerCallback(sensor)
// 		}
		
// 		return sensor
//     }
// }
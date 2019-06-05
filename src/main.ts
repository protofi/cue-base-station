import BaseStation from "./BaseStation";
import PubSub from "./lib/PubSub";
import Websocket from "./lib/Websocket";
import BluetoothImpl from "./lib/Bluetooth";

console.log('Oh hi Main')

const baseStation = new BaseStation(new PubSub(), new Websocket, new BluetoothImpl())

baseStation.initialize()

process
.on('unhandledRejection', (reason: string, promise: Promise<any>) => {
    console.error('******************* Unhandled Rejection of Promise *******************')
    baseStation.errorHandler(new Error(reason))
})
.on('uncaughtException', (error: Error) => {
    console.error('********************* Uncaught Exception thrown **********************')
    baseStation.errorHandler(error)
})
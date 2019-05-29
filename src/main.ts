import BaseStation from "./BaseStation";
import PubSub from "./lib/PubSub";
import Websocket from "./lib/Websocket";
import BluetoothImpl from "./lib/Bluetooth";

console.log('Oh hi Main')

const baseStation = new BaseStation(new PubSub(), new Websocket, new BluetoothImpl())

baseStation.initialize()
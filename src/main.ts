import BaseStation from "./BaseStation";
import PubSub from "./lib/PubSub";
import Websocket from "./lib/Websocket";

console.log('Oh hi Main')

const baseStation = new BaseStation(new PubSub(), new Websocket)

baseStation.initialize()

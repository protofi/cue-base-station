import BaseStation from "../../src/BaseStation";
import PubSub from "../../src/lib/PubSub";
import Websocket from "../../src/lib/Websocket";
import StubBluetooth from "./Bluetooth";

const baseStation = new BaseStation(new PubSub('../../data/rsa-priv.pem'), new Websocket, new StubBluetooth())

baseStation.initialize()
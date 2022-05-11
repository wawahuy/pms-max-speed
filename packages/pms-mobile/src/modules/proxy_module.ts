import {NativeModules, NativeEventEmitter} from 'react-native';

const module = NativeModules.ProxyModule;
const eventEmitter = new NativeEventEmitter(module);

function startVpn(ip: string, port: number) {
  return module.startVpn(ip, port);
}

function stopVpn() {
  return module.stopVpn();
}

function addEventListener(listener: (event: {status: boolean}) => void) {
  return eventEmitter.addListener('vpn_event', listener);
}

export {startVpn, stopVpn, addEventListener, eventEmitter, module};

import React, {useContext, useEffect, useState} from "react";

export enum WsStatus {
    connecting,
    open,
    closed
}

export enum WsCommand {
    StatusBar = 1
}

export interface StatusBarData {
    requestCurrent: number;
    requestQueue: number;
    bandwidth: number;
    speed: number;
}

export interface WsContext {
    ws: WebSocket,
    status: WsStatus,
    statusBar: StatusBarData,
}

const initValue: WsContext = {
    ws: null,
    status: WsStatus.closed,
    statusBar: {
        requestCurrent: 0,
        requestQueue: 0,
        bandwidth: 0,
        speed: 0,
    }
}

const context = React.createContext<WsContext>(initValue);
const Provider = context.Provider;

export const WsContextCustomer = context.Consumer;

export const useWsContext = () => {
    return useContext(context);
}

export interface WsContextProviderProps {
    children: React.ReactNode
}

export const WsContextProvider: React.FC<WsContextProviderProps> = ({ children }) => {
    const [value, setValue] = useState<WsContext>(initValue);

    const connectWs = (wsUrl: string) => {
        const ws = new WebSocket(wsUrl);
        setValue(prev => ({...prev, status: WsStatus.connecting}));

        ws.onopen = () => {
            setValue(prev => ({...prev, status: WsStatus.open}));
        }

        ws.onmessage = (data) => {
            const d = JSON.parse(data.data);
            switch (d.command) {
                case WsCommand.StatusBar:
                    setValue(prev => ({
                        ...prev,
                        statusBar: {
                            ...prev.statusBar,
                            ...d.data
                        }
                    }))
                    break;
            }

        }

        ws.onclose = () => {
            setValue(prev => ({...prev, status: WsStatus.closed}));
            setTimeout(() => connectWs(wsUrl), 2000);
        }
        ws.onerror = () => {
            setValue(prev => ({...prev, status: WsStatus.closed}));
            setTimeout(() => connectWs(wsUrl), 2000);
        }

        setValue(prev => ({...prev, ws}));
    }

    useEffect(() => {
        const protocol = location.protocol.match(/https/gmi) ? 'wss' : 'ws';
        const wsUrl = `${protocol}://pms-inject-websocket.pms/connect`;
        connectWs(wsUrl);

        return () => {
            if (value.ws) {
                value.ws.close();
            }
        }
    }, [])

    return (
        <Provider value={value}>
            {children}
        </Provider>
    )
};

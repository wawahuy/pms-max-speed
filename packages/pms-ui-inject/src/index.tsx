import React from "react";
import ReactDOM from "react-dom";
import {StatusBar} from "./components/StatusBar";
import {WsContextProvider} from "./ws-context";
import {Intro} from "./components/Intro";

const App = () => {
    return (
        <WsContextProvider>
            <Intro />
            <StatusBar />
        </WsContextProvider>
    )
}

const child = document.createElement('div');
document.body.appendChild(child);

ReactDOM.render(
    <App />,
    child
);
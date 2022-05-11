import {Button, Spinner, View} from 'native-base';
import React from 'react';
import {StyleSheet} from 'react-native';
import {SvgXml} from 'react-native-svg';
import DisconnectIcon from '../../assets/svg/disconnect.svg';
import ConnectIcon from '../../assets/svg/connect.svg';

export enum ButtonConnectStatus {
  START,
  STOP,
  CONNECTING,
}

export interface ButtonConnectProps {
  onPress?: () => void;
  disabled: boolean;
  status?: ButtonConnectStatus;
}

function getContentButton(status: ButtonConnectStatus | undefined) {
  switch (status) {
    case ButtonConnectStatus.START:
      return <SvgXml width={40} height={40} xml={ConnectIcon} />;
    case ButtonConnectStatus.STOP:
      return <SvgXml width={40} height={40} xml={DisconnectIcon} />;
    case ButtonConnectStatus.CONNECTING:
      return <Spinner color="#fee591" />;
    default:
      return <></>;
  }
}

const ButtonConnect = (props: ButtonConnectProps) => {
  return (
    <View>
      <Button
        rounded
        style={styles.button}
        onPress={props.onPress}
        disabled={props.disabled}>
        {getContentButton(props.status)}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 90,
    width: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  textBtn: {
    color: '#555555',
    fontWeight: 'bold',
  },
});

export default ButtonConnect;

import {Root} from 'native-base';
import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import FlashMessage from 'react-native-flash-message';
import Home from './src/screens/home';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fee591" />
      <Root style={styles.container}>
        <Home />
      </Root>
      <FlashMessage position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
});

export default App;

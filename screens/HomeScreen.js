import * as WebBrowser from 'expo-web-browser';
import React, { useState, useEffect } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { MonoText } from '../components/StyledText';
import { withTheme } from 'react-native-paper';
import { Button } from 'react-native-paper';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
// import { Foundation } from '@expo/vector-icons';
import { t } from '../locales'
// import Constants from 'expo-constants';
import { TextInput } from 'react-native-paper';
import { Checkbox } from 'react-native-paper';
import { getStyles } from './style'
import { execute, migrateUp, useTestData } from '../database'
  
function HomeScreen({ theme }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(moment().format(t('dateFormat')))
  const [totalFuel, setTotalFuel] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [observation, setObservation] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const vehicles = [{
    value: 'Meu'
  }];
  const fuels = [{value: t('gas')}, {value: t('alcohol')}, {value: t('diesel')}, {value: 'naturalGas'}, {value: 'leadedGas'}];
  const [combustiveis, setCombustiveis] = useState()
  const saveFilling = () => {
    console.log('aqui')
    // execute(
    //   `select * from Combustivel`, [], (_, { rows }) =>
    //     console.log(JSON.stringify(rows))
    //   , (error) => console.log(error))

    execute(
      `select * from Gasto`,
      [],
      (_, { rows: { _array } }) => {
        console.log('leo', _array)
        setCombustiveis(_array)
      },
      (a, error) => {
        console.log('leo2', a, error)
      }
    );
  }

  useEffect(() => {
    migrateUp();
    useTestData();
  }, []);
  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} >
        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Dropdown label={t('vehicle')} data={vehicles} value='Meu'/>
          </View>
          <View  style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('fillingDate')} </Text>
            <DatePicker
              // iconSource={{uri: 'https://avatars0.githubusercontent.com/u/17571969?v=3&s=400'}}
              // iconSource={require('../assets/images/favicon.png')}
              style={{width: '100%'}}
              date={fillingDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              customStyles={{
                dateIcon: styles.dateIcon,
                dateInput: {
                  marginLeft: 36
                }
              }}
              onDateChange={(date) => {setFillingDate(date)}}
            />            
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Dropdown label={t('fuel')} data={fuels} value={t('alcohol')} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.fullTank}> Tanque Cheio </Text>
            <Checkbox
              status={isFullTank ? 'checked' : 'unchecked'}
              onPress={() => { setFullTank(!isFullTank); }}
              style={{height: '100px', width: '100px'}}
              size = {50}
            />
          </View>
        </View>

        <View style={styles.splitRow}>
          <TextInput
            label={t('pricePerUnit')}
            value={pricePerUnit}
            onChangeText={text => setPricePerUnit(text)}
            mode='outlined'
            style={{ paddingTop: 5, flex: 8 }}
            placeholder={t('pricePerUnit')}
            dense={true}
            keyboardType={'numeric'}
          />
          <View style={{flex: 1}}></View>
          <TextInput
            label={t('fillingTotal')}
            value={totalFuel}
            onChangeText={text => setTotalFuel(text)}
            mode='outlined'
            style={{ paddingTop: 5, flex: 8 }}
            dense={true}
            keyboardType={'numeric'}
          />
        </View>

        <TextInput label={t('observation')}
            value={observation}
            onChangeText={text => setObservation(observation)}
            mode='outlined'
            placeholder={t('fillingObservation')}
            style={{ marginTop: 15 }}
          />

        <Text>{JSON.stringify(combustiveis)}</Text>

        <Button style={{ marginTop: 15, padding: 5 }} labelStyle={{fontSize: 25}}
        uppercase={false} icon="content-save" mode="contained" onPress={() => saveFilling()}>
        {t('confirm')}
        </Button>
      </ScrollView>
    </View>
  );
}

HomeScreen.navigationOptions = {
  header: null,
};

export default withTheme(HomeScreen);

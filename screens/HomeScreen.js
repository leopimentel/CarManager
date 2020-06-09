import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Checkbox } from 'react-native-paper';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { vehicles as v, fuels as f} from '../constants/fuel'
  
function HomeScreen({ theme }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(moment().format(t('dateFormat')))
  const [totalFuel, setTotalFuel] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [observation, setObservation] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [km, setKm] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const vehicles = v;
  const fuels = f;

  const saveFilling = () => {
    // @todo data validation

    db.transaction(function(tx) {
      tx.executeSql(
        `INSERT INTO Abastecimento (CodVeiculo, Data_Cadastro, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES (?, ?, ?, ?, ?, ?)`,
        [1, fillingDate, fillingDate, km, observation, isFullTank],
        function(tx, res) {
          const insertId = res.insertId
          tx.executeSql(
            'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
            [insertId, fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel],
            function(tx) {
              console.log('inseriu Abastecimento_Combustivel')
              tx.executeSql(
                `INSERT INTO Gasto (CodVeiculo, Data_Cadastro, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [1, fillingDate, fillingDate, 1, totalFuel, observation, insertId],
                function(tx, res) {                
                  // @todo clear form + display success message
                }
              )
            }
          );
        }
      );
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container}>
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
            <Dropdown label={t('fuel')} data={fuels} value={t('alcohol')} onChangeText={(value, index) => setFuelType(index) }/>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.fullTank}> {t('fullTank')} </Text>
            <Checkbox
              status={isFullTank ? 'checked' : 'unchecked'}
              onPress={() => { setFullTank(!isFullTank); }}
              style={{height: '100px', width: '100px'}}
              size = {50}
            />
          </View>
        </View>

        <View style={{...styles.splitRow, marginTop: 10 }}>
          <TextInput
            label={t('pricePerUnit')}
            value={pricePerUnit}
            onChangeText={text => setPricePerUnit(text)}
            mode='outlined'
            style={{ flex: 1, marginRight: 5 }}
            placeholder={t('pricePerUnit')}
            dense={true}
            keyboardType={'numeric'}
          />
          
          <TextInput
            label={t('fillingTotal')}
            value={totalFuel}
            onChangeText={text => setTotalFuel(text)}
            mode='outlined'
            style={{ flex: 1 }}
            dense={true}
            keyboardType={'numeric'}
          />
        </View>

        <TextInput
            label='KM'
            value={km}
            onChangeText={text => setKm(text)}
            mode='outlined'
            style={{ flex: 1 }}
            placeholder={t('pricePerUnit')}
            dense={true}
            keyboardType={'numeric'}
            style={{ marginTop: 15 }}
          />

        <TextInput label={t('observation')}
            value={observation}
            onChangeText={text => setObservation(observation)}
            mode='outlined'
            placeholder={t('fillingObservation')}
            style={{ marginTop: 15 }}
          />

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

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Switch, Dialog, Portal, Paragraph } from 'react-native-paper';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { vehicles as v, fuels as f} from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase } from '../utils/date'
import { Loading } from '../components/Loading'

function FillingScreen({ theme }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(moment().format(t('dateFormat')))
  const [totalFuel, setTotalFuel] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [observation, setObservation] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [km, setKm] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const [visibleDialog, setVisibleDialog] = useState(false)
  const vehicles = v;
  const fuels = f;
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    totalFuel: [false, ''],
    pricePerUnit: [false, ''],
    km: [false, '']
  })

  const saveFilling = () => {
    if (!totalFuel) {
      setFormErrors({...formErrors, totalFuel: [true, t('errorMessage.totalFuel')]})
      return false
    }

    if (!pricePerUnit) {
      setFormErrors({...formErrors, pricePerUnit: [true, t('errorMessage.pricePerUnit')]})
      return false
    }

    if (!km) {
      setFormErrors({...formErrors, km: [true, t('errorMessage.km')]})
      return false
    }

    const fillingDateSqlLite = fromUserDateToDatabase(fillingDate)
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `INSERT INTO Abastecimento (CodVeiculo, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES (?, ?, ?, ?, ?)`,
        [1, fillingDateSqlLite, km, observation, isFullTank],
        function(tx, res) {
          const insertId = res.insertId
          tx.executeSql(
            'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
            [insertId, fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel],
            function(tx) {
              console.log('inseriu Abastecimento_Combustivel')
              tx.executeSql(
                `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento) VALUES (?, ?, ?, ?, ?, ?)`,
                [1, fillingDateSqlLite, 1, totalFuel, observation, insertId],
                function() {
                  setVisibleDialog(true)
                  setTotalFuel(null)
                  setPricePerUnit(null)
                  setObservation(null)
                  setKm(null)
                  setLoading(false)
                }, function (_, error) {
                  console.log(error)
                  setLoading(false)
                }
              )
            }, function (_, error) {
              console.log(error)
              setLoading(false)
            }
          );
        }, function (_, error) {
          console.log(error)
          setLoading(false)
        }
      );
    });
  }

  return (
    <View style={styles.container}>
      <Loading loading={loading} />

      <Portal>
        <Dialog visible={visibleDialog}
            onDismiss={() => setVisibleDialog(false)}>
          <Dialog.Title>{t('save')}</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{t('savedFilling')}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisibleDialog(false)}>{t('close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
            <Switch
              value={isFullTank}
              onValueChange={() => { setFullTank(!isFullTank); }}
            />
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={{flex: 1}}>
            <TextInput
              label={t('pricePerUnit')}
              value={pricePerUnit}
              onChangeText={text => setPricePerUnit(text)}
              style={{ marginRight: 5, flex: 1 }}
              placeholder={t('pricePerUnit')}
              keyboardType={'numeric'}
              mode='outlined'
            />
            {formErrors.pricePerUnit[0] && <HelperText type="error" visible={formErrors.pricePerUnit[0]} padding='none'>
              {formErrors.pricePerUnit[1]}
            </HelperText>}
          </View>

          <View style={{flex: 1}}>
            <TextInput
              label={t('fillingTotal')}
              value={totalFuel}
              onChangeText={text => setTotalFuel(text)}
              keyboardType={'numeric'}
              mode='outlined'
              style={{ flex: 1 }}
            />

            {formErrors.totalFuel[0] && <HelperText type="error" visible={formErrors.totalFuel[0]} padding='none'>
              {formErrors.totalFuel[1]}
            </HelperText>}
          </View>
        </View>

        <View style={styles.splitRow}>
          <TextInput
            label='KM'
            value={km}
            onChangeText={text => setKm(text)}
            placeholder={t('pricePerUnit')}
            keyboardType={'numeric'}
            mode='outlined'
            style={{flex: 1}}
          />

          {formErrors.km[0] && <HelperText type="error" visible={formErrors.km[0]} padding='none'>
            {formErrors.km[1]}
          </HelperText>}
        </View>

        <View style={styles.splitRow}>
          <TextInput label={t('observation')}
            value={observation}
            onChangeText={text => setObservation(text)}
            mode='outlined'
            placeholder={t('fillingObservation')}
            style={{flex: 1}}
          />
        </View>

        <View style={styles.splitRow}>
          <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
          uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveFilling()}>
          {t('confirm')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

FillingScreen.navigationOptions = {
  header: null,
};

export default withTheme(FillingScreen);

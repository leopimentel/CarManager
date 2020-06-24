import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Switch, Dialog, Portal, Paragraph } from 'react-native-paper';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { vehicles as v, fuels as f, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase } from '../utils/date'
import { Loading } from '../components/Loading'
import NumberFormat from 'react-number-format';

function FillingScreen({ theme, route }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(moment().format(t('dateFormat')))
  const [totalFuel, setTotalFuel] = useState()
  const [totalFuelView, setTotalFuelView] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [pricePerUnitView, setPricePerUnitView] = useState()
  const [observation, setObservation] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [fuelTypeView, setFuelTypeView] = useState(t('alcohol'))
  const [km, setKm] = useState()
  const [kmView, setKmView] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codAbastecimento, setCodAbastecimento] = useState()
  const [codGasto, setCodGasto] = useState()
  const vehicles = v;
  const fuels = f;
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    totalFuel: [false, ''],
    pricePerUnit: [false, ''],
    km: [false, '']
  })

  useEffect(() => {
    if (route.params && route.params.CodAbastecimento) {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `SELECT A.Data_Abastecimento, A.KM, A.Observacao, A.TanqueCheio,
           AC.CodCombustivel, AC.Valor_Litro, AC.Total,
           G.CodGasto
           FROM Abastecimento A
           INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
           INNER JOIN Gasto G ON G.CodAbastecimento = AC.CodAbastecimento
           WHERE A.CodAbastecimento = ?`,
          [route.params.CodAbastecimento],
          function(_, results) {
            if (results.rows.length) {
              const abastecimento = results.rows.item(0)
              setCodAbastecimento(route.params.CodAbastecimento)
              setTotalFuelView(abastecimento.Total)
              setFillingDate(moment(abastecimento.Data_Abastecimento, 'YYYY-MM-DD').format(t('dateFormat')))
              setPricePerUnitView(abastecimento.Valor_Litro)
              setObservation(abastecimento.Observacao)
              setFuelType(abastecimento.CodCombustivel)
              setKmView(abastecimento.KM)
              setFullTank(abastecimento.TanqueCheio)
              setCodGasto(abastecimento.CodGasto)
              for (let i=0; i<f.length; i++) {
                if (f[i].index === abastecimento.CodCombustivel) {
                  setFuelTypeView(f[i].value)
                  break
                }
              }
            }
            setLoading(false)
          }
        )
      })

    }
  }, [route.params])

  const removeFilling = () => {
    setLoading(true)
    db.transaction(function(tx) {
      tx.executeSql(
        `DELETE FROM Abastecimento WHERE CodAbastecimento = ?`,
        [codAbastecimento],
        function(tx) {
          tx.executeSql(
            'DELETE FROM Abastecimento_Combustivel WHERE CodAbastecimento = ?',
            [codAbastecimento],
            function(tx) {
              tx.executeSql(
                `DELETE FROM Gasto WHERE CodGasto = ?`,
                [codGasto],
                function() {
                  console.log('deletou abastecimento')
                  setVisibleDialog(true)
                  setTotalFuelView(null)
                  setPricePerUnitView(null)
                  setObservation(null)
                  setKmView(null)
                  setLoading(false)
                }, function (_, error) {
                  console.log(error)
                  setLoading(false)
                  return true
                }
              )
            }, function (_, error) {
              console.log(error)
              setLoading(false)
              return true
            }
          );
        }, function (_, error) {
          console.log(error)
          setLoading(false)
          return true
        }
      );
    })
  }

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
      if (!codAbastecimento) {
        tx.executeSql(
          `INSERT INTO Abastecimento (CodVeiculo, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES (?, ?, ?, ?, ?)`,
          [1, fillingDateSqlLite, km, observation, isFullTank],
          function(tx, res) {
            const insertId = res.insertId
            tx.executeSql(
              'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
              [insertId, fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel],
              function(tx) {
                tx.executeSql(
                  `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento) VALUES (?, ?, ?, ?, ?, ?)`,
                  [1, fillingDateSqlLite, 1, totalFuel, observation, insertId],
                  function() {
                    console.log('inseriu abastecimento')
                    setVisibleDialog(true)
                    setTotalFuelView(null)
                    setPricePerUnitView(null)
                    setObservation(null)
                    setKmView(null)
                    setLoading(false)
                  }, function (_, error) {
                    console.log(error)
                    setLoading(false)
                    return true
                  }
                )
              }, function (_, error) {
                console.log(error)
                setLoading(false)
                return true
              }
            );
          }, function (_, error) {
            console.log(error)
            setLoading(false)
            return true
          }
        );
      } else {
        tx.executeSql(
          `UPDATE Abastecimento
           SET CodVeiculo = ?, Data_Abastecimento = ?, KM = ?, Observacao = ?, TanqueCheio = ?
           WHERE CodAbastecimento = ?`,
          [1, fillingDateSqlLite, km, observation, isFullTank, codAbastecimento],
          function(tx) {
            tx.executeSql(
              `UPDATE Abastecimento_Combustivel
               SET CodCombustivel = ?, Litros = ?, Valor_Litro = ?, Total = ?
               WHERE CodAbastecimento = ?
               `,
              [fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel, codAbastecimento],
              function(tx) {
                tx.executeSql(
                  `UPDATE Gasto
                   SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?
                   WHERE CodGasto = ?`,
                  [1, fillingDateSqlLite, 1, totalFuel, observation, codGasto],
                  function() {
                    console.log('atualizou abastecimento')
                    setVisibleDialog(true)
                    setTotalFuelView(null)
                    setPricePerUnitView(null)
                    setObservation(null)
                    setKmView(null)
                    setLoading(false)
                  }, function (_, error) {
                    console.log(error)
                    setLoading(false)
                    return true
                  }
                )
              }, function (_, error) {
                console.log(error)
                setLoading(false)
                return true
              }
            );
          }, function (_, error) {
            console.log(error)
            setLoading(false)
            return true
          }
        );
      }
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
            <Dropdown label={t('fuel')} data={fuels} value={fuelTypeView} onChangeText={(value) => {
              setFuelType(fuels.filter(fuel => fuel.value === value)[0].index)
            }}/>
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
            <NumberFormat
              isNumericString={true}
              value={pricePerUnitView}
              displayType={'text'}
              allowNegative={false}
              decimalSeparator={decimalSeparator}
              thousandSeparator={thousandSeparator}
              onValueChange={text => setPricePerUnit(text.value)}
              renderText={value => (
                <>
                  <TextInput
                    label={t('pricePerUnit')}
                    value={value}
                    onChangeText={text => setPricePerUnitView(text)}
                    style={{ marginRight: 5, flex: 1 }}
                    placeholder={t('pricePerUnit')}
                    keyboardType={'numeric'}
                    mode='outlined'
                  />

                  {formErrors.pricePerUnit[0] && <HelperText type="error" visible={formErrors.pricePerUnit[0]} padding='none'>
                    {formErrors.pricePerUnit[1]}
                  </HelperText>}
                </>
              )}
            />
          </View>

          <View style={{flex: 1}}>
            <NumberFormat
              isNumericString={true}
              value={totalFuelView}
              displayType={'text'}
              allowNegative={false}
              decimalSeparator={decimalSeparator}
              thousandSeparator={thousandSeparator}
              onValueChange={text => setTotalFuel(text.value)}
              renderText={value => (
                <>
                  <TextInput
                    label={t('fillingTotal')}
                    value={value}
                    onChangeText={text => setTotalFuelView(text)}
                    keyboardType={'numeric'}
                    mode='outlined'
                    style={{ flex: 1 }}
                  />

                  {formErrors.totalFuel[0] && <HelperText type="error" visible={formErrors.totalFuel[0]} padding='none'>
                    {formErrors.totalFuel[1]}
                  </HelperText>}
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.splitRow}>
          <NumberFormat
            isNumericString={true}
            value={kmView}
            displayType={'text'}
            allowNegative={false}
            decimalSeparator=','
            decimalScale={0}
            thousandSeparator={thousandSeparator}
            onValueChange={text => setKm(text.value)}
            renderText={value => (
              <>
                <TextInput
                  label='KM'
                  value={value}
                  onChangeText={text => setKmView(text)}
                  keyboardType={'numeric'}
                  mode='outlined'
                  style={{flex: 1}}
                />

                {formErrors.km[0] && <HelperText type="error" visible={formErrors.km[0]} padding='none'>
                  {formErrors.km[1]}
                </HelperText>}
              </>
            )}
          />
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

        <View style={styles.splitRow}>
          {codAbastecimento && 
            <Button style={{ flex: 1, marginTop: 10, backgroundColor: 'red' }} labelStyle={{fontSize: 25}}
            uppercase={false} compact icon="delete" mode="contained" onPress={() => removeFilling()}>
            {t('delete')}
            </Button>
          }
        </View>
      </ScrollView>
    </View>
  );
}

FillingScreen.navigationOptions = {
  header: null,
};

export default withTheme(FillingScreen);

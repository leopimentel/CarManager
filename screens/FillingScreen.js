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
import { vehicles as v, fuels as f, spendingType } from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase } from '../utils/date'
import { databaseFloatFormat, databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';

function FillingScreen({ theme, route }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(moment().format(t('dateFormat')))

  const [totalFuel, setTotalFuel] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [fuelTypeView, setFuelTypeView] = useState(t('alcohol'))
  const [km, setKm] = useState()

  const [totalFuel2, setTotalFuel2] = useState()
  const [pricePerUnit2, setPricePerUnit2] = useState()
  const [fuelType2, setFuelType2] = useState(2)
  const [fuelTypeView2, setFuelTypeView2] = useState(t('alcohol'))

  const [observation, setObservation] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codAbastecimento, setCodAbastecimento] = useState()
  const [codAbastecimentoCombustivel, setCodAbastecimentoCombustivel] = useState()
  const [codAbastecimentoCombustivel2, setCodAbastecimentoCombustivel2] = useState()
  const [codGasto, setCodGasto] = useState()
  const [codGasto2, setCodGasto2] = useState()
  const [isTwoFuelTypes, setIsTwoFuelTypes] = useState()
  const vehicles = v;
  //@todo today only one vehicle is supported
  const vehicleId = vehicles[0].index;
  const fuels = f;
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    totalFuel: [false, ''],
    pricePerUnit: [false, ''],
    km: [false, ''],
    totalFuel2: [false, ''],
    pricePerUnit2: [false, ''],
  })

  useEffect(() => {
    if (route.params && route.params.CodAbastecimento) {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `SELECT A.Data_Abastecimento, CAST(A.KM AS TEXT) AS KM, A.Observacao, A.TanqueCheio,
           AC.Codigo, AC.CodCombustivel, CAST(AC.Valor_Litro AS TEXT) AS Valor_Litro, CAST(AC.Total AS TEXT) AS Total,
           G.CodGasto
           FROM Abastecimento A
           INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
           INNER JOIN Gasto G ON G.CodAbastecimento = AC.CodAbastecimento
            AND (G.Codigo_Abastecimento_Combustivel IS NULL OR
              G.Codigo_Abastecimento_Combustivel IS NOT NULL AND G.Codigo_Abastecimento_Combustivel = AC.Codigo)
           WHERE A.CodAbastecimento = ?
           ORDER BY AC.Codigo`,
          [route.params.CodAbastecimento],
          function(_, results) {
            if (results.rows.length) {
              const abastecimento = results.rows.item(0)
              setCodAbastecimento(route.params.CodAbastecimento)
              setTotalFuel(abastecimento.Total)
              setFillingDate(moment(abastecimento.Data_Abastecimento, 'YYYY-MM-DD').format(t('dateFormat')))
              setPricePerUnit(abastecimento.Valor_Litro)
              setObservation(abastecimento.Observacao)
              setFuelType(abastecimento.CodCombustivel)
              setKm(abastecimento.KM)
              setFullTank(abastecimento.TanqueCheio)
              setCodGasto(abastecimento.CodGasto)
              setCodAbastecimentoCombustivel(abastecimento.Codigo)

              for (let i=0; i<f.length; i++) {
                if (f[i].index === abastecimento.CodCombustivel) {
                  setFuelTypeView(f[i].value)
                  break
                }
              }
              if (results.rows.length === 2) {
                const abastecimento2 = results.rows.item(1)
                setTotalFuel2(abastecimento2.Total)
                setPricePerUnit2(abastecimento2.Valor_Litro)
                setFuelType2(abastecimento2.CodCombustivel)
                setCodGasto2(abastecimento2.CodGasto)
                setCodAbastecimentoCombustivel2(abastecimento2.Codigo)
                setIsTwoFuelTypes(true)
                for (let i=0; i<f.length; i++) {
                  if (f[i].index === abastecimento2.CodCombustivel) {
                    setFuelTypeView2(f[i].value)
                    break
                  }
                }
              } else {
                setTotalFuel2(null)
                setPricePerUnit2(null)
                setCodGasto2(null)
                setCodAbastecimentoCombustivel2(null)
                setIsTwoFuelTypes(false)
                setFuelTypeView2(t('alcohol'))
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
            'DELETE FROM Abastecimento_Combustivel WHERE Codigo = ?',
            [codAbastecimentoCombustivel],
            function(tx) {
              tx.executeSql(
                `DELETE FROM Gasto WHERE CodGasto = ?`,
                [codGasto],
                function(tx) {
                  if (!codAbastecimentoCombustivel2) {
                    console.log(`Filling ${codAbastecimento} removed`)
                    setVisibleDialog(true)
                    setLoading(false)
                    clearForm()
                  } else {
                    tx.executeSql(
                      'DELETE FROM Abastecimento_Combustivel WHERE Codigo = ?',
                      [codAbastecimentoCombustivel2],
                      function(tx) {
                        tx.executeSql(
                          `DELETE FROM Gasto WHERE CodGasto = ?`,
                          [codGasto2],
                          function() {
                            console.log(`Filling ${codAbastecimento} removed`)
                            setVisibleDialog(true)
                            setLoading(false)
                            clearForm()
                          }, handleDatabaseError
                        )
                      }, handleDatabaseError
                    );
                  }
                }, handleDatabaseError
              )
            }, handleDatabaseError
          );
        }, handleDatabaseError
      );
    })
  }

  const handleDatabaseError = function (_, error) {
    console.log(error)
    setLoading(false)
    return true
  }

  const clearForm = () => {
    setFillingDate(moment().format(t('dateFormat')))
    setTotalFuel(null)
    setTotalFuel2(null)
    setPricePerUnit(null)
    setPricePerUnit2(null)
    setObservation(null)
    setKm(null)
    setCodAbastecimento(null)
    setCodAbastecimentoCombustivel(null)
    setCodGasto(null)
    setCodAbastecimentoCombustivel2(null)
    setCodGasto2(null)
    setIsTwoFuelTypes(false)
    setFormErrors({
      totalFuel: [false, ''],
      pricePerUnit: [false, ''],
      km: [false, ''],
      totalFuel2: [false, ''],
      pricePerUnit2: [false, ''],
    })
  }

  const saveFilling = () => {
    if (!pricePerUnit || pricePerUnit < 0) {
      setFormErrors({...formErrors, pricePerUnit: [true, t('errorMessage.pricePerUnit')]})
      return false
    }

    if (!totalFuel || totalFuel < 0) {
      setFormErrors({...formErrors, totalFuel: [true, t('errorMessage.totalFuel')]})
      return false
    }

    if (!km || km < 0) {
      setFormErrors({...formErrors, km: [true, t('errorMessage.km')]})
      return false
    }

    if (isTwoFuelTypes) {
      if (!pricePerUnit2 || pricePerUnit2 < 0) {
        setFormErrors({...formErrors, pricePerUnit2: [true, t('errorMessage.pricePerUnit')]})
        return false
      }

      if (!totalFuel2 || totalFuel2 < 0) {
        setFormErrors({...formErrors, totalFuel2: [true, t('errorMessage.totalFuel')]})
        return false
      }
    }

    const fillingDateSqlLite = fromUserDateToDatabase(fillingDate)
    setLoading(true)
    db.transaction(function(tx) {
      if (!codAbastecimento) {
        tx.executeSql(
          `INSERT INTO Abastecimento (CodVeiculo, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES (?, ?, ?, ?, ?)`,
          [vehicleId, fillingDateSqlLite, km, observation, isFullTank],
          function(tx, res) {
            const insertId = res.insertId
            tx.executeSql(
              'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
              [insertId, fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel],
              function(tx, res) {
                const codAbastecimentoCombustivelInserted = res.insertId
                tx.executeSql(
                  `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [vehicleId, fillingDateSqlLite, spendingType[0].index, totalFuel, observation, insertId, codAbastecimentoCombustivelInserted],
                  function(tx) {
                    if (!isTwoFuelTypes) {
                      console.log(`Filling ${insertId} inserted`)
                      setLoading(false)
                      setVisibleDialog(true)
                      clearForm()
                    } else {
                      tx.executeSql(
                        'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
                        [insertId, fuelType2, totalFuel2/pricePerUnit2, pricePerUnit2, totalFuel2],
                        function(tx, res) {
                          const codAbastecimentoCombustivelInserted2 = res.insertId
                          tx.executeSql(
                            `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [vehicleId, fillingDateSqlLite, spendingType[0].index, totalFuel2, observation, insertId, codAbastecimentoCombustivelInserted2],
                            function() {
                              console.log(`Filling ${insertId} inserted`)
                              clearForm()
                              setLoading(false)
                              setVisibleDialog(true)
                            }, handleDatabaseError
                          )
                        }, handleDatabaseError
                      )
                    }
                  }, handleDatabaseError
                )
              }, handleDatabaseError
            );
          }, handleDatabaseError
        );
      } else {
        tx.executeSql(
          `UPDATE Abastecimento
           SET CodVeiculo = ?, Data_Abastecimento = ?, KM = ?, Observacao = ?, TanqueCheio = ?
           WHERE CodAbastecimento = ?`,
          [vehicleId, fillingDateSqlLite, km, observation, isFullTank, codAbastecimento],
          function(tx) {
            tx.executeSql(
              `UPDATE Abastecimento_Combustivel
               SET CodCombustivel = ?, Litros = ?, Valor_Litro = ?, Total = ?
               WHERE Codigo = ?
               `,
              [fuelType, totalFuel/pricePerUnit, pricePerUnit, totalFuel, codAbastecimentoCombustivel],
              function(tx) {
                tx.executeSql(
                  `UPDATE Gasto
                   SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?
                   WHERE CodGasto = ?`,
                  [vehicleId, fillingDateSqlLite, spendingType[0].index, totalFuel, observation, codGasto],
                  function(tx) {
                    if (!codAbastecimentoCombustivel2) {
                      console.log(`Filling ${codAbastecimento} updated`)
                      setVisibleDialog(true)
                      clearForm()
                      setLoading(false)
                    } else {
                      if (isTwoFuelTypes) {
                        tx.executeSql(
                          `UPDATE Abastecimento_Combustivel
                           SET CodCombustivel = ?, Litros = ?, Valor_Litro = ?, Total = ?
                           WHERE Codigo = ?
                           `,
                          [fuelType2, totalFuel2/pricePerUnit2, pricePerUnit2, totalFuel2, codAbastecimentoCombustivel2],
                          function(tx) {
                            tx.executeSql(
                              `UPDATE Gasto
                               SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?
                               WHERE CodGasto = ?`,
                              [vehicleId, fillingDateSqlLite, spendingType[0].index, totalFuel2, observation, codGasto2],
                              function() {
                                console.log(`Filling ${codAbastecimento} updated`)
                                setVisibleDialog(true)
                                clearForm()
                                setLoading(false)
                              }, handleDatabaseError
                            )
                          }, handleDatabaseError
                        );
                      } else {
                        tx.executeSql(
                          `DELETE FROM Abastecimento_Combustivel
                           WHERE Codigo = ?
                           `,
                          [codAbastecimentoCombustivel2],
                          function(tx) {
                            tx.executeSql(
                              `DELETE FROM Gasto WHERE CodGasto = ?`,
                              [codGasto2],
                              function() {
                                console.log(`Filling ${codAbastecimento} updated`)
                                setVisibleDialog(true)
                                clearForm()
                                setLoading(false)
                              }, handleDatabaseError
                            )
                          }, handleDatabaseError
                        );
                      }
                    }
                  }, handleDatabaseError
                )
              }, handleDatabaseError
            );
          }, handleDatabaseError
        );
      }
    });
  }

  if (loading) {
    return <Loading loading={loading} />
  }
  return (
    <View style={styles.container}>

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
          {/* <Dropdown label={t('vehicle')} data={vehicles} value='Meu'/> */}
        </View>
        <View  style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.fullTank}> {t('isTwoFuels')} </Text>
          <Switch
            value={isTwoFuelTypes}
            onValueChange={() => { setIsTwoFuelTypes(!isTwoFuelTypes); }}
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
          <TextInput
            label={t('pricePerUnit')}
            value={pricePerUnit}
            onChangeText={text => {
              setPricePerUnit(databaseFloatFormat(text))
              setFormErrors({...formErrors, pricePerUnit: [false, '']})
            }}
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
            onChangeText={text => {
              setFormErrors({...formErrors, totalFuel: [false, '']})
              setTotalFuel(databaseFloatFormat(text))
            }}
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
          onChangeText={text => {
            setKm(databaseIntegerFormat(text))
            setFormErrors({...formErrors, km: [false, '']})
          }}
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

      {isTwoFuelTypes &&
      <>
        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Dropdown label={t('fuel')} data={fuels} value={fuelTypeView2} onChangeText={(value) => {
              setFuelType2(fuels.filter(fuel => fuel.value === value)[0].index)
            }}/>
          </View>
        </View>

        <View style={styles.splitRow}>
          <View style={{flex: 1}}>
            <TextInput
              label={t('pricePerUnit')}
              value={pricePerUnit2}
              onChangeText={text => {
                setPricePerUnit2(databaseFloatFormat(text))
                setFormErrors({...formErrors, pricePerUnit2: [false, '']})
              }}
              style={{ marginRight: 5, flex: 1 }}
              placeholder={t('pricePerUnit')}
              keyboardType={'numeric'}
              mode='outlined'
            />

            {formErrors.pricePerUnit2[0] && <HelperText type="error" visible={formErrors.pricePerUnit2[0]} padding='none'>
              {formErrors.pricePerUnit2[1]}
            </HelperText>}
          </View>

          <View style={{flex: 1}}>
            <TextInput
              label={t('fillingTotal')}
              value={totalFuel2}
              onChangeText={text => {
                setFormErrors({...formErrors, totalFuel2: [false, '']})
                setTotalFuel2(databaseFloatFormat(text))
              }}
              keyboardType={'numeric'}
              mode='outlined'
              style={{ flex: 1 }}
            />

            {formErrors.totalFuel2[0] && <HelperText type="error" visible={formErrors.totalFuel2[0]} padding='none'>
              {formErrors.totalFuel2[1]}
            </HelperText>}
          </View>
        </View>
      </>
      }

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveFilling()}>
        {t('confirm')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {codAbastecimento &&
          <Button style={{ flex: 1, marginTop: 10, marginRight: 5, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => removeFilling()}>
          {t('delete')}
          </Button>
        }
        <Button style={{ flex: 1, marginTop: 10, backgroundColor: Colors.accent }} labelStyle={{fontSize: 15}}
        uppercase={false} compact icon="eraser" mode="contained" onPress={() => clearForm()}>
        {t('clearFields')}
        </Button>
      </View>
    </ScrollView>
  </View>
  )
}

FillingScreen.navigationOptions = {
  header: null,
};

export default withTheme(FillingScreen);

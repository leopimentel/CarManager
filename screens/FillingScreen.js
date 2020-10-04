import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Switch, Dialog, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { db } from '../database'
import { vehicles as v, fuels as f, spendingTypes } from '../constants/fuel'
import { HelperText } from 'react-native-paper';
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'
import { ucfirst } from '../utils/string'
import { databaseFloatFormat, databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';
import {Picker} from '@react-native-community/picker';
import { useIsFocused } from '@react-navigation/native'

function FillingScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [totalFuel, setTotalFuel] = useState()
  const [pricePerUnit, setPricePerUnit] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [km, setKm] = useState()
  const [litters, setLitters] = useState()

  const [totalFuel2, setTotalFuel2] = useState()
  const [pricePerUnit2, setPricePerUnit2] = useState()
  const [litters2, setLitters2] = useState()
  const [fuelType2, setFuelType2] = useState(2)
  
  const [observation, setObservation] = useState()
  const [isFullTank, setFullTank] = useState(true)
  const [visibleDialog, setVisibleDialog] = useState(false)
  const [codAbastecimento, setCodAbastecimento] = useState()
  const [codAbastecimentoCombustivel, setCodAbastecimentoCombustivel] = useState()
  const [codAbastecimentoCombustivel2, setCodAbastecimentoCombustivel2] = useState()
  const [codGasto, setCodGasto] = useState()
  const [codGasto2, setCodGasto2] = useState()
  const [isTwoFuelTypes, setIsTwoFuelTypes] = useState()
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState();
  const fuels = f;
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({
    totalFuel: [false, ''],
    pricePerUnit: [false, ''],
    km: [false, ''],
    litters: [false, ''],
    totalFuel2: [false, ''],
    pricePerUnit2: [false, ''],
    litters2: [false, ''],
  })
  
  const isFocused = useIsFocused()

  const computeBasedOnLitters = (_) => {
    if (totalFuel && litters) {
      setPricePerUnit((totalFuel / litters).toFixed(3).toString())
    }
  }

  const computeBasedOnPricePerUnit = (_) => {
    if (totalFuel && pricePerUnit) {
      setLitters((totalFuel / pricePerUnit).toFixed(3).toString())
    }
  }

  const computeBasedOnLitters2 = (_) => {
    if (totalFuel2 && litters2) {
      setPricePerUnit2((totalFuel2 / litters2).toFixed(3).toString())
    }
  }

  const computeBasedOnPricePerUnit2 = (_) => {
    if (totalFuel2 && pricePerUnit2) {
      setLitters2((totalFuel2 / pricePerUnit2).toFixed(3).toString())
    }
  }

  useEffect(() => {
    db.transaction(function(tx) {
      tx.executeSql(
        `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
        [],
        function(_, results) {
          if (results.rows.length) {
            let cars = []
            for (let i = 0; i < results.rows.length; i++) {
              cars.push({
                index: results.rows.item(i).CodVeiculo,
                value: results.rows.item(i).Descricao
              });
            }
            setVehicles(cars)
          }
        }
      )
    })
  }, [isFocused])

  useEffect(() => {
    if (route.params && route.params.CodAbastecimento) {
      setLoading(true)
      db.transaction(function(tx) {
        tx.executeSql(
          `SELECT A.Data_Abastecimento, CAST(A.KM AS TEXT) AS KM, A.Observacao, A.TanqueCheio,
           AC.Codigo, AC.CodCombustivel, CAST(AC.Valor_Litro AS TEXT) AS Valor_Litro, CAST(AC.Total AS TEXT) AS Total,
           CAST(AC.Litros AS TEXT) AS Litros, G.CodGasto, A.CodVeiculo
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
              setFillingDate(moment(abastecimento.Data_Abastecimento, 'YYYY-MM-DD').toDate())
              setPricePerUnit(abastecimento.Valor_Litro)
              setObservation(abastecimento.Observacao)
              setFuelType(abastecimento.CodCombustivel)
              setKm(abastecimento.KM)
              setFullTank(abastecimento.TanqueCheio)
              setCodGasto(abastecimento.CodGasto)
              setCodAbastecimentoCombustivel(abastecimento.Codigo)
              setVehicleId(abastecimento.CodVeiculo)
              setLitters(abastecimento.Litros)

              if (results.rows.length === 2) {
                const abastecimento2 = results.rows.item(1)
                setTotalFuel2(abastecimento2.Total)
                setPricePerUnit2(abastecimento2.Valor_Litro)
                setFuelType2(abastecimento2.CodCombustivel)
                setCodGasto2(abastecimento2.CodGasto)
                setCodAbastecimentoCombustivel2(abastecimento2.Codigo)
                setIsTwoFuelTypes(true)
                setLitters2(abastecimento2.Litros)
              } else {
                setTotalFuel2(null)
                setPricePerUnit2(null)
                setCodGasto2(null)
                setCodAbastecimentoCombustivel2(null)
                setIsTwoFuelTypes(false)
                setLitters2(null)
              }
            }
          }
        )

        setLoading(false)
      });
    } else {
      db.transaction(function(tx) {
        tx.executeSql(
          `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V`,
          [],
          function(_, results) {
            if (results.rows.length) {
              let cars = []
              for (let i = 0; i < results.rows.length; i++) {
                cars.push({
                  index: results.rows.item(i).CodVeiculo,
                  value: results.rows.item(i).Descricao
                });
              }
              setVehicleId(cars[0].index)
            }
          }
        )
      })
    }
  }, [route.params])

  const removeFilling = () => {
    const confirmFilling = () => {
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

    Alert.alert(
      t('confirmDelete'),
      '',
      [
        {
          text: t('yes'), onPress: () => confirmFilling()
        },
        { text: t('no'), style: "cancel" }
      ]
    );
    
  }

  const handleDatabaseError = function (_, error) {
    console.log(error)
    setLoading(false)
    return true
  }

  const clearForm = () => {
    setFillingDate(new Date())
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
    setLitters(null)
    setLitters2(null)
    setFormErrors({
      totalFuel: [false, ''],
      pricePerUnit: [false, ''],
      km: [false, ''],
      totalFuel2: [false, ''],
      pricePerUnit2: [false, ''],
      litters: [false, ''],
      litters2: [false, ''],
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

    if (!litters || litters < 0) {
      setFormErrors({...formErrors, litters: [true, t('errorMessage.volume')]})
      return false
    }

    if (Math.abs(litters * pricePerUnit - totalFuel) > 0.01) {
      //setFormErrors({...formErrors, litters: [true, t('errorMessage.computedTotalValue')]})
      Alert.alert(t('errorMessage.computedTotalValue'));
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

      if (!litters2 || litters2 < 0) {
        setFormErrors({...formErrors, litters2: [true, t('errorMessage.volume')]})
        return false
      }

      if (Math.abs(litters2 * pricePerUnit2 - totalFuel2) > 0.01) {
        //setFormErrors({...formErrors, litters2: [true, t('errorMessage.computedTotalValue')]})
        Alert.alert(t('errorMessage.computedTotalValue'));
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
                  `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel, observation, insertId, codAbastecimentoCombustivelInserted, km],
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
                            `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel2, observation, insertId, codAbastecimentoCombustivelInserted2, km],
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
              [fuelType, litters, pricePerUnit, totalFuel, codAbastecimentoCombustivel],
              function(tx) {
                tx.executeSql(
                  `UPDATE Gasto
                   SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?
                   WHERE CodGasto = ?`,
                  [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel, observation, km, codGasto],
                  function(tx) {
                    if (!codAbastecimentoCombustivel2) {
                      console.log(`Filling ${codAbastecimento} updated ${km}`)
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
                          [fuelType2, litters2, pricePerUnit2, totalFuel2, codAbastecimentoCombustivel2],
                          function(tx) {
                            tx.executeSql(
                              `UPDATE Gasto
                               SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?
                               WHERE CodGasto = ?`,
                              [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel2, observation, km, codGasto2],
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
        <Dialog.Title>{t('savedFilling')}</Dialog.Title>
        <Dialog.Actions>
          <Button uppercase={false} mode="outlined" onPress={() => {
            setVisibleDialog(false)
            navigation.navigate('Consumption', {CodVeiculo: vehicleId})
          }}>{t('seeComsumption')}</Button>
          <Button uppercase={false} style={{marginLeft: 5}} mode="contained" onPress={() => setVisibleDialog(false)}>{t('close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>

    <ScrollView style={styles.container} keyboardShouldPersistTaps='always'>
      {showDatePicker &&
        <DateTimePicker
          value={fillingDate}
          mode="date"
          onChange={(_, selectedDate) => {
            setShowDatePicker(!showDatePicker);
            setFillingDate(selectedDate || fillingDate)              
          }}
        />}
      <Button style={{ backgroundColor: Colors.tintColor }} labelStyle={{fontSize: 20}}
        uppercase={false} compact icon="gas-station" mode="contained" onPress={() => clearForm()}>
        {t('new')}
      </Button>

        {vehicles.length > 1 && <Picker label={t('vehicle')} selectedValue={vehicleId} onValueChange={itemValue => setVehicleId(itemValue)}>
          {
            vehicles.map(vehicle => <Picker.Item label={ucfirst(vehicle.value)} value={vehicle.index} key={vehicle.index}/>)
          }  
        </Picker>}

      <View style={styles.splitRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
            label={t('fillingDate')}
            value={fromDatabaseToUserDate(fillingDate)}
            mode='outlined'
            style={{flex: 1}}
            editable={false}
            onPress={() => {setShowDatePicker(true)}}
          />
          </TouchableOpacity>
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
          <Picker selectedValue={fuelType} onValueChange={itemValue => setFuelType(itemValue)}>
            {
              fuels.map(fuel => <Picker.Item label={fuel.value} value={fuel.index} key={fuel.index}/>)
            }  
          </Picker>
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

        <View style={{flex: 1}}>
          
        <TextInput
            label={t('currency') + t('fillingTotal')}
            value={totalFuel}
            onChangeText={text => {
              setFormErrors({...formErrors, totalFuel: [false, '']})
              setTotalFuel(databaseFloatFormat(text))
            }}
            keyboardType={'numeric'}
            mode='outlined'
            style={{ marginLeft: 5, flex: 1 }}
          />

          {formErrors.totalFuel[0] && <HelperText type="error" visible={formErrors.totalFuel[0]} padding='none'>
            {formErrors.totalFuel[1]}
          </HelperText>}
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={{flex: 1}}>
        <TextInput
            label={t('currency') + t('pricePerUnit')}
            value={pricePerUnit}
            onChangeText={text => {
              setPricePerUnit(databaseFloatFormat(text))
              setFormErrors({...formErrors, pricePerUnit: [false, '']})
            }}
            style={{ flex: 1 }}
            placeholder={t('pricePerUnit')}
            keyboardType={'numeric'}
            mode='outlined'
            onBlur={(e) => computeBasedOnPricePerUnit(e)}
          />

          {formErrors.pricePerUnit[0] && <HelperText type="error" visible={formErrors.pricePerUnit[0]} padding='none'>
            {formErrors.pricePerUnit[1]}
          </HelperText>}
        </View>

        <View style={{flex: 1}}>
          <TextInput
            label={t('volume')}
            value={litters}
            onChangeText={text => {
              setFormErrors({...formErrors, litters: [false, '']})
              setLitters(databaseFloatFormat(text))
            }}
            keyboardType={'numeric'}
            mode='outlined'
            style={{ marginLeft: 5, flex: 1 }}
            onBlur={(e) => computeBasedOnLitters(e)}
          />

          {formErrors.litters[0] && <HelperText type="error" visible={formErrors.litters[0]} padding='none'>
            {formErrors.litters[1]}
          </HelperText>}
        </View>
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
        <View style={{...styles.splitRow, marginTop:10}}>
          <View style={{ flex: 1 }}>
            <Picker selectedValue={fuelType2} onValueChange={itemValue => setFuelType2(itemValue)}>
              {
                fuels.map(fuel => <Picker.Item label={fuel.value} value={fuel.index} key={fuel.index}/>)
              }
            </Picker>
          </View>

          <View style={{flex: 1}}>
  <TextInput
    label={t('currency') + t('fillingTotal')}
    value={totalFuel2}
    onChangeText={text => {
      setFormErrors({...formErrors, totalFuel2: [false, '']})
      setTotalFuel2(databaseFloatFormat(text))
    }}
    keyboardType={'numeric'}
    mode='outlined'
    style={{ marginLeft: 5, flex: 1 }}
  />

  {formErrors.totalFuel2[0] && <HelperText type="error" visible={formErrors.totalFuel2[0]} padding='none'>
    {formErrors.totalFuel2[1]}
  </HelperText>}
</View>
        </View>

        <View style={styles.splitRow}>

          <View style={{flex: 1}}>
            <TextInput
              label={t('currency') + t('pricePerUnit')}
              value={pricePerUnit2}
              onChangeText={text => {
                setPricePerUnit2(databaseFloatFormat(text))
                setFormErrors({...formErrors, pricePerUnit2: [false, '']})
              }}
              style={{ flex: 1 }}
              placeholder={t('currency') + t('pricePerUnit')}
              keyboardType={'numeric'}
              mode='outlined'
              onBlur={(e) => computeBasedOnPricePerUnit2(e)}
            />

            {formErrors.pricePerUnit2[0] && <HelperText type="error" visible={formErrors.pricePerUnit2[0]} padding='none'>
              {formErrors.pricePerUnit2[1]}
            </HelperText>}
          </View>

          <View style={{flex: 1}}>
          <TextInput
            label={t('volume')}
            value={litters2}
            onChangeText={text => {
              setFormErrors({...formErrors, litters2: [false, '']})
              setLitters2(databaseFloatFormat(text))
            }}
            keyboardType={'numeric'}
            mode='outlined'
            style={{ marginLeft: 5, flex: 1 }}
            onBlur={(e) => computeBasedOnLitters2(e)}
          />

          {formErrors.litters2[0] && <HelperText type="error" visible={formErrors.litters2[0]} padding='none'>
            {formErrors.litters2[1]}
          </HelperText>}
        </View>
        </View>
      </>
      }

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveFilling()}>
        {t('save')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {codAbastecimento &&
          <Button style={{ flex: 1, marginTop: 10, marginRight: 5, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => removeFilling()}>
          {t('delete')}
          </Button>
        }
      </View>
    </ScrollView>
  </View>
  )
}

FillingScreen.navigationOptions = {
  header: null,
};

export default withTheme(FillingScreen);

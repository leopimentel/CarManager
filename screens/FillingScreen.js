import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { withTheme, Button, TextInput, Switch, Dialog, Portal, HelperText } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { t } from '../locales'
import { getStyles } from './style'
import { fetchVehicles, fetchFillingById, saveFillingDb, deleteFilling } from '../database/queries'
import { fuels as f, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { fromDatabaseToUserDate } from '../utils/date'
import { databaseFloatFormat, databaseIntegerFormat } from '../utils/number'
import { Loading } from '../components/Loading'
import Colors from '../constants/Colors';
import {Picker} from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native'
import { NumericFormat } from 'react-number-format';
import VehiclePicker from '../components/VehiclePicker';

function FillingScreen({ theme, route, navigation }) {
  const styles = getStyles(theme)
  const [fillingDate, setFillingDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [totalFuel, setTotalFuel] = useState(0)
  const [pricePerUnit, setPricePerUnit] = useState()
  const [fuelType, setFuelType] = useState(2)
  const [km, setKm] = useState()
  const [litters, setLitters] = useState()

  const [totalFuel2, setTotalFuel2] = useState(0)
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
  const [discount, setDiscount] = useState(0)
  const [formErrors, setFormErrors] = useState({
    totalFuel: [false, ''],
    pricePerUnit: [false, ''],
    km: [false, ''],
    litters: [false, ''],
    totalFuel2: [false, ''],
    pricePerUnit2: [false, ''],
    litters2: [false, ''],
    discount: [false, ''],
  })
  
  const isFocused = useIsFocused()

  const OnBlurLitters = (_) => {
    if (litters && pricePerUnit) {
      setTotalFuel((litters * pricePerUnit).toFixed(2).toString())
      return
    }

    if (totalFuel && litters) {
      setPricePerUnit((totalFuel / litters).toFixed(3).toString())
      return
    }
  }

  const OnBlurTotalFuel = (_) => {
    if (totalFuel && pricePerUnit) {
      setLitters((totalFuel / pricePerUnit).toFixed(3).toString())
      return
    }

    if (totalFuel && litters) {
      setPricePerUnit((totalFuel / litters).toFixed(3).toString())
      return
    }
  }

  const OnBlurPricePerUnit = (_) => {
    if (litters && pricePerUnit) {
      setTotalFuel((litters * pricePerUnit).toFixed(2).toString())
      return
    }

    if (totalFuel && pricePerUnit) {
      setLitters((totalFuel / pricePerUnit).toFixed(3).toString())
      return
    }
  }

  const OnBlurLitters2 = (_) => {
    if (litters2 && pricePerUnit2) {
      setTotalFuel2((litters2 * pricePerUnit2).toFixed(2).toString())
      return
    }

    if (totalFuel2 && litters2) {
      setPricePerUnit2((totalFuel2 / litters2).toFixed(3).toString())
      return
    }
  }

  const OnBlurTotalFuel2 = (_) => {
    if (totalFuel2 && pricePerUnit2) {
      setLitters2((totalFuel2 / pricePerUnit2).toFixed(3).toString())
      return
    }

    if (totalFuel2 && litters2) {
      setPricePerUnit2((totalFuel2 / litters2).toFixed(3).toString())
      return
    }
  }

  const OnBlurPricePerUnit2 = (_) => {
    if (litters2 && pricePerUnit2) {
      setTotalFuel2((litters2 * pricePerUnit2).toFixed(2).toString())
      return
    }

    if (totalFuel2 && pricePerUnit2) {
      setLitters2((totalFuel2 / pricePerUnit2).toFixed(3).toString())
      return
    }
  }

  useEffect(() => {
    async function fetchData() {
        let results = await fetchVehicles();
        
        let cars = []
        if (results.length) {            
          for (const row of results) {
            cars.push({
              index: row.CodVeiculo,
              value: row.Descricao
            });
            console.log(row)
          }            
        }
        setVehicleId(cars[0].index)
        setVehicles(cars)
    }
    fetchData()
  }, [isFocused])

  useEffect(() => {
    async function fetchData() {
      if (route.params && route.params.CodAbastecimento) {
        setLoading(true)
        let results = await fetchFillingById(route.params.CodAbastecimento);

        if (results.length) {
          const abastecimento = results[0]
          setCodAbastecimento(route.params.CodAbastecimento)
          setTotalFuel(abastecimento.Total)
          setFillingDate(moment(abastecimento.Data_Abastecimento, 'YYYY-MM-DD').toDate())
          setPricePerUnit(parseFloat(abastecimento.Valor_Litro).toFixed(3).toString())
          setObservation(abastecimento.Observacao)
          setFuelType(abastecimento.CodCombustivel)
          setKm(abastecimento.KM)
          setFullTank(abastecimento.TanqueCheio)
          setCodGasto(abastecimento.CodGasto)
          setCodAbastecimentoCombustivel(abastecimento.Codigo)
          setVehicleId(abastecimento.CodVeiculo)
          setLitters(parseFloat(abastecimento.Litros).toFixed(3).toString())
          setDiscount(abastecimento.Desconto)

          if (results.length === 2) {
            const abastecimento2 = results[1]
            setTotalFuel2(abastecimento2.Total)
            setPricePerUnit2(parseFloat(abastecimento2.Valor_Litro).toFixed(3).toString())
            setFuelType2(abastecimento2.CodCombustivel)
            setCodGasto2(abastecimento2.CodGasto)
            setCodAbastecimentoCombustivel2(abastecimento2.Codigo)
            setIsTwoFuelTypes(true)
            setLitters2(parseFloat(abastecimento2.Litros).toFixed(3).toString())
          } else {
            setTotalFuel2(0)
            setPricePerUnit2(null)
            setCodGasto2(null)
            setCodAbastecimentoCombustivel2(null)
            setIsTwoFuelTypes(false)
            setLitters2(null)
          }
        }

        setLoading(false)
      } else {
        let results = await fetchVehicles();
        if (results.length) {
          let cars = []
          for (const row of results) {
            cars.push({
              index: row.CodVeiculo,
              value: row.Descricao
            });
          }
          setVehicleId(cars[0].index)
        }
      }
    }
    fetchData()
  }, [route.params])

  const removeFilling = () => {
    const confirmFilling = async () => {
      setLoading(true)
      await deleteFilling(codAbastecimento, codAbastecimentoCombustivel, codGasto, codAbastecimentoCombustivel2, codGasto2);
      console.log(`Filling ${codAbastecimento} removed`)
      setVisibleDialog(true)
      setLoading(false)
      clearForm()
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

  const clearForm = () => {
    setFillingDate(new Date())
    setTotalFuel(0)
    setTotalFuel2(0)
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
    setDiscount(0)
    setFormErrors({
      totalFuel: [false, ''],
      pricePerUnit: [false, ''],
      km: [false, ''],
      totalFuel2: [false, ''],
      pricePerUnit2: [false, ''],
      litters: [false, ''],
      litters2: [false, ''],
      discount: [false, ''],
    })
  }

  const saveFilling = async () => {
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
        Alert.alert(t('errorMessage.computedTotalValue'));
        return false
      }
    }

    setLoading(true)
    const data = {
      vehicleId, fillingDate, km, observation, isFullTank, totalFuel, pricePerUnit, fuelType, discount,
      litters, isTwoFuelTypes, totalFuel2, pricePerUnit2, fuelType2, litters2, codAbastecimentoCombustivel,
      codGasto, codAbastecimentoCombustivel2, codGasto2
    };
    await saveFillingDb(data, !!codAbastecimento, codAbastecimento);
    console.log(`Filling ${codAbastecimento || 'new'} ${codAbastecimento ? 'updated' : 'inserted'}`)
    setVisibleDialog(true)
    clearForm()
    setLoading(false)
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

      <VehiclePicker
        vehicles={vehicles}
        vehicleId={vehicleId}
        setVehicleId={setVehicleId}
        style={styles.picker}
      />

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
          <Picker dropdownIconColor="#000" style={styles.picker} selectedValue={fuelType} onValueChange={itemValue => setFuelType(itemValue)}>
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
            label={t('odometer')}
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
            label={t('currency') + t('fillingSubTotal')}
            value={totalFuel}
            onChangeText={text => {
              setFormErrors({...formErrors, totalFuel: [false, '']})
              setTotalFuel(databaseFloatFormat(text))
            }}
            keyboardType={'numeric'}
            mode='outlined'
            style={{ marginLeft: 5, flex: 1 }}
            onBlur={() => OnBlurTotalFuel()}
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
            onBlur={(e) => OnBlurPricePerUnit(e)}
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
            onBlur={(e) => OnBlurLitters(e)}
          />

          {formErrors.litters[0] && <HelperText type="error" visible={formErrors.litters[0]} padding='none'>
            {formErrors.litters[1]}
          </HelperText>}
        </View>
      </View>

      { <View style={styles.splitRow}>
        <TextInput label={t('currency') + t('discount')}
          value={discount}
          onChangeText={text => {
            setDiscount(databaseFloatFormat(text))
            setFormErrors({...formErrors, discount: [false, '']})
          }}
          mode='outlined'
          placeholder={t('discount')}
          style={{flex: 1}}
          keyboardType={'numeric'}
        />
      </View> }

      <View style={styles.splitRow}>
        <TextInput label={t('observation')}
          value={observation}
          onChangeText={text => setObservation(text)}
          mode='outlined'
          placeholder={t('fillingObservation')}
          style={{flex: 1}}
        />
      </View>

      <Text>{t('totalWithDiscount')}: <NumericFormat value={(parseFloat(totalFuel) + (totalFuel2 ? parseFloat(totalFuel2) : 0) - (discount ? parseFloat(discount) : 0)).toFixed(2)} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={t('currency')} renderText={value => (<Text style={{fontWeight: 'bold'}}>{value}</Text>)} /></Text>

      {isTwoFuelTypes &&
      <>
        <View style={{...styles.splitRow, marginTop:10}}>
          <View style={{ flex: 1 }}>
            <Picker dropdownIconColor="#000" style={styles.picker} selectedValue={fuelType2} onValueChange={itemValue => setFuelType2(itemValue)}>
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
    onBlur={() => OnBlurTotalFuel2()}
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
              onBlur={(e) => OnBlurPricePerUnit2(e)}
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
            onBlur={(e) => OnBlurLitters2(e)}
          />

          {formErrors.litters2[0] && <HelperText type="error" visible={formErrors.litters2[0]} padding='none'>
            {formErrors.litters2[1]}
          </HelperText>}
        </View>
        </View>
      </>
      }

      <View style={styles.splitRow}>
        <Button style={{ flex: 1, marginTop: 10, marginBottom: 0 }} labelStyle={{fontSize: 25}}
        uppercase={false} compact icon="content-save" mode="contained" onPress={() => saveFilling()}>
        {t('save')}
        </Button>
      </View>

      <View style={styles.splitRow}>
        {codAbastecimento &&
          <Button style={{ flex: 1, marginTop: 10, backgroundColor: Colors.negativeColor }} labelStyle={{fontSize: 15}}
          uppercase={false} compact icon="delete" mode="contained" onPress={() => removeFilling()}>
          {t('delete')}
          </Button>
        }
      </View>
    </ScrollView>
  </View>
  )
}

export default withTheme(FillingScreen);

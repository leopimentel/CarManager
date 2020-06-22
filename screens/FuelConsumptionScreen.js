import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import { withTheme } from 'react-native-paper';
import { vehicles as v, fuels as f, timeFilter, decimalSeparator, thousandSeparator } from '../constants/fuel'
import { getStyles } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row } from 'react-native-table-component';
import { db } from '../database'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'
import { Loading } from '../components/Loading'
import NumberFormat from 'react-number-format';
import { tableBorderColor } from '../constants/Colors'

function FuelConsumptionScreen({ theme }) {
  const styles = getStyles(theme)
  const [fillingPeriod, setFillingPeriod] = useState({
    startFillingDate: moment().subtract(1, 'months').format(t('dateFormat')),
    endFillingDate: moment().format(t('dateFormat'))
  })
  const [fuelType, setFuelType] = useState(0)
  const [tableData, setTableData] = useState([])
  const [totalSum, setTotalSum] = useState(0)
  const [totalAverage, setTotalAverage] = useState(0)
  const vehicles = v;
  const fuels = [{
    index: 0,
    value: t('all')
  }, ...f];
  const timeOptions = timeFilter;
  const [loading, setLoading] = useState(false)
  const tableHead = [
    {title: t('date'), width: 80},
    {title:t('fuel'), width: 100},
    {title:t('volume'), width: 60},
    {title:'KM', width: 65},
    {title:t('value'), width: 50},
    {title:t('total'), width: 70},
    {title:t('average'), width: 50},
    {title:t('fullTank'), width: 50},
    {title:t('milleage'), width: 50},
    {title:'$' + t('milleage'), width: 50},
    {title:t('mixed'), width: 100},
    {title:t('observation'), width: 500},
  ];

  const isFocused = useIsFocused()

  const setPeriod = (index) => {
    let startDate = moment().subtract(1, 'months')
    let endDate = moment()
    switch (index) {
      case 'three_months':
        startDate = moment().subtract(3, 'months')
        break
      case 'six_months':
        startDate = moment().subtract(6, 'months')
        break
      case 'current_month':
        startDate = moment().startOf('month');
        break
      case 'current_year':
        startDate = moment().startOf('year');
        break
      case 'previous_month':
        startDate = moment().subtract(1,'months').startOf('month');
        endDate = moment().subtract(1,'months').endOf('month');
        break
      case 'previous_year':
        startDate = moment().subtract(1, 'years').startOf('year')
        endDate = moment().subtract(1, 'years').endOf('year')
        break
      default:
        break
    }

    setFillingPeriod({
      startFillingDate: startDate.format(t('dateFormat')),
      endFillingDate: endDate.format(t('dateFormat'))
    })
  }

  useEffect(() => {
    if (!isFocused) {
      return
    }

    setLoading(true)

    db.transaction(function(tx) {
      tx.executeSql(`
        SELECT A.CodAbastecimento,
        A.Data_Abastecimento,
        A.KM,
        A.Observacao,
        A.TanqueCheio,
        AC.CodCombustivel,
        AC.Litros,
        AC.Valor_Litro,
        AC.Total
        FROM Abastecimento A
        INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
        WHERE A.CodVeiculo = 1
        AND A.Data_Abastecimento >= ? AND A.Data_Abastecimento <= ?
        ORDER BY A.KM DESC
      `,
      [fromUserDateToDatabase(fillingPeriod.startFillingDate), fromUserDateToDatabase(fillingPeriod.endFillingDate)],
      function(tx, results) {
        const callback = (nextFilling) => {
          const temp = [];
          let totalSumAcc = 0
          let totalAverageAcc = 0
          let totalCount = 0
          for (let i = 0; i < results.rows.length; i++) {
            const filling = results.rows.item(i)
            if (filling.CodCombustivel !== fuelType && fuelType !== 0) {
              continue
            }

            let accomplishedKm
            let average
            nextFilling = i === 0 ? nextFilling : results.rows.item(i - 1)
            if (nextFilling) {
              accomplishedKm = nextFilling.KM - filling.KM
              average = accomplishedKm / nextFilling.Litros
            }

            temp.push([
              fromDatabaseToUserDate(filling.Data_Abastecimento),
              fuels[filling.CodCombustivel].value,
              filling.Litros.toFixed(2),
              filling.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
              filling.Valor_Litro,
              filling.Total,
              average ? average.toFixed(2) : '',
              filling.TanqueCheio ? t('yes'): t('no'),
              accomplishedKm,
              accomplishedKm ? (filling.Total / accomplishedKm).toFixed(2) : '',
              t('no'),
              filling.Observacao,
            ]);

            totalSumAcc += filling.Total
            if (average) {
              totalAverageAcc += average
              totalCount++
            }
          }
          setTableData(temp)
          setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
          setTotalAverage(totalCount ? (totalAverageAcc/totalCount).toFixed(2) : 0)
          setLoading(false)
        }

        if (results.rows.length) {
          tx.executeSql(`
            SELECT A.KM, AC.Litros
            FROM Abastecimento A
            INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
            WHERE A.CodVeiculo = 1
            AND A.KM > ?
            ORDER BY A.KM
            LIMIT 1
          `,
            [results.rows.item(0).KM],
            (tx, fillings) => {
              let nextFilling
              if (fillings.rows.length) {
                nextFilling = fillings.rows.item(0)
              }

              return callback(nextFilling)
            }, function(_, error) {
              console.log(error)
              setLoading(false)
            })
        } else {
          setLoading(false)
          setTableData([])
          setTotalSum(0)
          setTotalAverage(0)
        }
      }, function(_, error) {
        console.log(error)
        setLoading(false)
      })
    })
  }, [isFocused, fuelType, fillingPeriod]);

  return (
    <View style={styles.container}>
      <Loading loading={loading} />
      <ScrollView>
        <View style={{ ...styles.splitRow}}>
          <View style={{ flex: 8 }}>
            <Dropdown style={{flex: 1}} label={t('vehicle')} data={vehicles} value='Meu'/>
          </View>
          <View style={{ flex: 1 }}/>
          <View style={{ flex: 8 }}>
            <Dropdown label={t('fuel')} data={fuels} value={t('all')} onChangeText={(value, index) => {
              setFuelType(index)
             } }/>
          </View>
        </View>
        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('startDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={fillingPeriod.startFillingDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setFillingPeriod({
                ...fillingPeriod,
                startFillingDate: date
              })}}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('endDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={fillingPeriod.endFillingDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setFillingPeriod({
                ...fillingPeriod,
                endFillingDate: date
              })}}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Dropdown style={{flex: 1}} label={t('period')} data={timeOptions} value={timeOptions[0].value} onChangeText={(value, index, data) => setPeriod(data[index].index)}/>
          </View>
        </View>

        <ScrollView horizontal>
          <View>
            <Table borderStyle={{borderWidth: 1, borderColor: tableBorderColor}}>
              <Row data={tableHead.map(row => row.title)} style={styles.header} widthArr={tableHead.map(row => row.width)} textStyle={[styles.text, {color: 'white'}]}/>
            </Table>
            <ScrollView>
              <Table borderStyle={{borderWidth: 1, borderColor: tableBorderColor}}>
                {
                  tableData.map((rowData, index) => (
                    <Row
                      key={index}
                      data={rowData}
                      style={[styles.row, index%2 && {backgroundColor: 'transparent'}]}
                      textStyle={styles.text}
                      widthArr={tableHead.map(row => row.width)}
                    />
                  ))
                }
              </Table>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={{ flex: 1, marginTop: 5 }}>
          <Text>{t('total')}: <NumberFormat value={totalSum} displayType={'text'} isNumericString={true} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} prefix={'$ '} renderText={value => (<Text>{value}</Text>)} /></Text>
          <Text>{t('averageOfAverages')}: <NumberFormat value={totalAverage} isNumericString={true} displayType={'text'} thousandSeparator={thousandSeparator} decimalSeparator={decimalSeparator} suffix=' KM/L' renderText={value => (<Text>{value}</Text>)} /></Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default withTheme(FuelConsumptionScreen);

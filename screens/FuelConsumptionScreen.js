import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import { withTheme, ActivityIndicator, Colors } from 'react-native-paper';
import { vehicles as v, fuels as f, timeFilter} from '../constants/fuel'
import { getStyles } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row } from 'react-native-table-component';
import { db } from '../database'
import { useIsFocused } from '@react-navigation/native'
import { fromUserDateToDatabase, fromDatabaseToUserDate } from '../utils/date'

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
        SELECT * FROM
        (
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
        )
        UNION ALL
        SELECT * FROM
        (
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
          ORDER BY A.KM DESC
          LIMIT 1
        )
      `,
      [fromUserDateToDatabase(fillingPeriod.startFillingDate), fromUserDateToDatabase(fillingPeriod.endFillingDate)],
      function(tx, results) {
        const callback = (previousFillingKM) => {
          const temp = [];
          let totalSumAcc = 0
          let totalAverageAcc = 0
          let totalCount = 0
          for (let i = 0; i < results.rows.length - 1; i++) {
            const lastFillingCodAbastecimento = results.rows.item(results.rows.length - 1).CodAbastecimento
            const filling = results.rows.item(i)
            if (filling.CodCombustivel !== fuelType && fuelType !== 0) {
              continue
            }
            let accomplishedKm = 0
            let average = 0
            if (i < results.rows.length - 2) {
              const previousFilling = results.rows.item(i+1)
              accomplishedKm = filling.KM - previousFilling.KM
              average = filling.CodAbastecimento === lastFillingCodAbastecimento ? 0 : accomplishedKm / filling.Litros
            } else if (typeof previousFillingKM !== 'undefined') {
              accomplishedKm = filling.KM - previousFillingKM
              average = filling.CodAbastecimento === lastFillingCodAbastecimento ? 0 : accomplishedKm / filling.Litros
            }

            temp.push([
              fromDatabaseToUserDate(filling.Data_Abastecimento),
              fuels[filling.CodCombustivel].value,
              filling.Litros,
              filling.KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
              filling.Valor_Litro,
              filling.Total,
              average ? average.toFixed(2) : '?',
              filling.TanqueCheio ? t('yes'): t('no'),
              accomplishedKm,
              (filling.Total / accomplishedKm).toFixed(2),
              t('no'),
              filling.Observacao,
            ]);

            totalSumAcc += filling.Total
            totalAverageAcc += average
            if (filling.CodAbastecimento !== lastFillingCodAbastecimento) {
              totalCount++
            }
          }
          setTableData(temp)
          setTotalSum(totalSumAcc ? totalSumAcc.toFixed(2) : 0)
          setTotalAverage(totalCount ? (totalAverageAcc/totalCount).toFixed(2) : 0)
          setLoading(false)
        }

        if (results.rows.length > 1) {
          tx.executeSql(`
            SELECT A.KM
            FROM Abastecimento A
            WHERE A.CodVeiculo = 1
            AND A.KM < ?
            ORDER BY A.KM DESC
            LIMIT 1`,
            [results.rows.item(results.rows.length - 2).KM],
            (tx, previousFilling) => {
              for (let i = 0; i < previousFilling.rows.length; i++) {
                return callback(previousFilling.rows.item(i).KM)
              }
              return callback()
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
      {loading && <ActivityIndicator animating={true} color={Colors.red800} style={{backgroundColor: Colors.grey100}}/>}
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

          <View  style={{ flex: 1 }}>
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
            <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
              <Row data={tableHead.map(row => row.title)} style={styles.header} widthArr={tableHead.map(row => row.width)} textStyle={[styles.text, {color: 'white'}]}/>
            </Table>
            <ScrollView>
              <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
                {
                  tableData.map((rowData, index) => (
                    <Row
                      key={index}
                      data={rowData}
                      style={[styles.row, index%2 && {backgroundColor: 'none'}]}
                      textStyle={styles.text}
                      widthArr={tableHead.map(row => row.width)}
                    />
                  ))
                }
              </Table>
            </ScrollView>
          </View>
        </ScrollView>

        <Text>{t('total')}: $ {totalSum} </Text>
        <Text>{t('averageOfAverages')}: {totalAverage} KM/L</Text>
      </ScrollView>
    </View>
  );
}

export default withTheme(FuelConsumptionScreen);

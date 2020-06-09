import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Dropdown } from 'react-native-material-dropdown';
import DatePicker from 'react-native-datepicker'
import { withTheme } from 'react-native-paper';
import { vehicles as v, fuels as f, timeFilter} from '../constants/fuel'
import { getStyles } from './style'
import { t } from '../locales'
import moment from 'moment';
import { Table, Row } from 'react-native-table-component';
import { db } from '../database'


function LinksScreen({ theme }) {
  const styles = getStyles(theme)
  const [startFillingDate, setStartFillingDate] = useState(moment().format(t('dateFormat')))
  const [endFillingDate, setEndFillingDate] = useState(moment().format(t('dateFormat')))
  const [fuelType, setFuelType] = useState(2)
  const [tableData, setTableData] = useState([])
  const vehicles = v;
  const fuels = f;
  const timeOptions = timeFilter;
  const tableHead = [
    'Data',
    'Combustível',
    'Litros',
    'KM',
    'Valor',
    'Total',
    'Média',
    'Tanque Cheio',
    'KM rodado',
    '$ KM Rodado',
    'Mistura Combustível',
    'Observação',
  ];
  const widthArr = [
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    500,
  ]

  // https://docs.expo.io/versions/latest/sdk/sqlite/
  // https://www.npmjs.com/package/react-native-data-table
  // https://aboutreact.com/example-of-sqlite-database-in-react-native/
  // https://github.com/expo/examples/blob/master/with-sqlite/App.js
  useEffect(() => {
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
        WHERE A.CodVeiculo = 1 AND AC.CodCombustivel = ?
        ORDER BY A.Data_Abastecimento DESC
        LIMIT 200
        `, [fuelType],
        function(tx, results) {
          const temp = [];
          for (let i = 0; i < results.rows.length; i++) {
            const abastecimento = results.rows.item(i)
            console.log(abastecimento)
            temp.push([
              abastecimento.Data_Abastecimento,
              abastecimento.CodCombustivel,
              abastecimento.Litros,
              abastecimento.KM,
              abastecimento.Valor_Litro,
              abastecimento.Total,
              5,
              abastecimento.TanqueCheio,
              4,
              6,
              0,
              abastecimento.Observacao,
            ]);
          }
          setTableData(temp)
        }
      )
    })

  }, [setEndFillingDate]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={{ ...styles.splitRow}}>
          <View style={{ flex: 8 }}>
            <Dropdown style={{flex: 1}} label={t('vehicle')} data={vehicles} value='Meu'/>
          </View>
          <View style={{ flex: 1 }}></View>
          <View style={{ flex: 8 }}>
            <Dropdown label={t('fuel')} data={fuels} value={t('alcohol')} onChangeText={(value, index) => setFuelType(index) }/>
          </View>
        </View>
        <View style={styles.splitRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('startDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={startFillingDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setStartFillingDate(date)}}
            />
          </View>

          <View  style={{ flex: 1 }}>
            <Text style={styles.dateLabel}> {t('endDate')} </Text>
            <DatePicker
              style={{ flex: 1, width: 100 }}
              date={endFillingDate}
              mode="date"
              format={t('dateFormat')}
              confirmBtnText={t('confirm')}
              cancelBtnText={t('cancel')}
              locale="pt_br"
              showIcon={false}
              onDateChange={(date) => {setEndFillingDate(date)}}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Dropdown style={{flex: 1}} label={'Período'} data={timeOptions} value=''/>
          </View>
        </View>

        <ScrollView horizontal>
          <View>
            <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
              <Row data={tableHead} style={styles.header} widthArr={widthArr} textStyle={styles.text}/>
            </Table>
            <ScrollView>
              <Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
                {
                  tableData.map((rowData, index) => (
                    <Row
                      key={index}
                      data={rowData}
                      style={[styles.row, index%2 && {backgroundColor: '#F7F6E7'}]}
                      textStyle={styles.text}
                      widthArr={widthArr}
                    />
                  ))
                }
              </Table>
            </ScrollView>
          </View>
        </ScrollView>

        <Text>Total R$ 149,99</Text>
        <Text>Média da média: 10.0 KM/L</Text>
      </ScrollView>
    </View>
  );
}

export default withTheme(LinksScreen);

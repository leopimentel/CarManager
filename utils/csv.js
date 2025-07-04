import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing'

// Example:
// let csv = arrayToCSV([
//   [1, '2', '"3"'],
//   [true, null, undefined],
// ]);
// Result:
// "1","2","""3"""
// "true","null","undefined"
const arrayToCSV = (data) => {
    return data.map(row =>
        row
        .map(v => typeof v === 'undefined' || v === null? '' : String(v))  // convert every value to String
        .map(v => v.replaceAll('"', '""'))  // escape double colons
        .map(v => `"${v}"`)  // quote it
        .join(',')  // comma-separated
      ).join('\r\n');  // rows starting on new lines
}

const exportTableToCSV = async (tableHead, tableData, csvFileName, encoding = 'utf8') => {
    const fuelConsumptionDir = `${FileSystem.documentDirectory}/${csvFileName}`
    const csv = arrayToCSV([tableHead, ...tableData])
    console.log("Before writing CSV file", csv)
    await FileSystem.writeAsStringAsync(fuelConsumptionDir, csv, {
        encoding: encoding,
    });
    console.log("After writing CSV file")
    
    try{
        await Sharing.shareAsync(fuelConsumptionDir);
    } catch {
    }
}

export {
    arrayToCSV,
    exportTableToCSV
}
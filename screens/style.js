import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Toast from 'react-native-simple-toast'

function getStyles(theme) {
    const { colors } = theme;
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
            padding: 5
        },
        dateIcon: {
            position: 'absolute',
            left: 0,
            top: 4,
            marginLeft: 0,
            display: 'none'
        },
        dateLabel: { color: colors.placeholder, fontSize: 12, paddingTop: 5 },
        fullTank: { color: colors.placeholder, paddingTop: 5, marginBottom: 0 },
        splitRow: {flexDirection: 'row', justifyContent:'space-between'},
        header: { height: 50, backgroundColor: Colors.tableHeaderColor },
        text: { textAlign: 'center', fontWeight: '300' },
        dataWrapper: { marginTop: -1 },
        row: { height: 50, backgroundColor: Colors.tableEvenRowColor, flexDirection: 'row' },
        btn: { backgroundColor: Colors.primary,  borderRadius: 2, justifyContent: 'center' },
        btnText: { textAlign: 'center', color: '#fff' },
        picker: { flex: 1, justifyContent: 'center', backgroundColor: '#fff', color: '#000' }
    });
}

const toastError = msg => Toast.show(msg, Toast.LONG);

export {
    getStyles,
    toastError
}
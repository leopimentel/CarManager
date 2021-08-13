import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Toast from 'react-native-tiny-toast'

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
        fullTank: { color: colors.placeholder, paddingTop: 5 },
        splitRow: {flexDirection: 'row', justifyContent:'space-between'},
        header: { height: 50, backgroundColor: Colors.tableHeaderColor },
        text: { textAlign: 'center', fontWeight: '100' },
        dataWrapper: { marginTop: -1 },
        row: { height: 50, backgroundColor: Colors.tableEvenRowColor, flexDirection: 'row' },
        btn: { backgroundColor: Colors.primary,  borderRadius: 2, justifyContent: 'center' },
        btnText: { textAlign: 'center', color: '#fff' },
        picker: { height: 40, flex: 1, justifyContent: 'center' }
    });
}

const toastError = msg => Toast.show(msg, {
    position: Toast.position.center,
    containerStyle:{
        backgroundColor: '#f00',
        borderRadius: 15,
    },
    textStyle:{
        color:'#fff',
    },
    imgStyle:{},
    mask:false,
    maskStyle:{},
    duration: 2000,
    animation: true,
});

export {
    getStyles,
    toastError
}
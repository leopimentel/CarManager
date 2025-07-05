import React, { useContext, useEffect } from 'react';
import { withTheme, IconButton, Badge } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { AppContext } from "../providers/BellProvider";

const styles = StyleSheet.create({
    badge: {
      position: 'absolute',
      top: 10,
      right: 3,
    }
});

function Bell(props) 
{
    const { notificationCount, notify } = useContext(AppContext);
    
    useEffect(() => {
        notify()
    }, [notify])

    return <>
        <IconButton size={34} iconColor={Colors.primary} icon="bell" onPress={() => props.onPress() }/>
        <Badge style={styles.badge}>{notificationCount}</Badge>
    </>
}

export default withTheme(Bell);

import React, { createContext, useState } from "react";
import { db } from '../database'

export const AppContext = createContext();

const BellProvider = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  
  const notify = () => {
    db.transaction(function(tx) {
      tx.executeSql(
      `
          SELECT COUNT(1) AS TotalReminders
          FROM Lembrete L
          WHERE L.Finalizado = 0
          AND (
              (L.DataLembrete IS NOT NULL AND date('now', 'localtime') >= L.DataLembrete)                
              OR 
              (
                  L.KM IS NOT NULL AND L.KM < (
                      SELECT 
                      MAX(COALESCE(A.KM, G.KM, 0)) 
                      FROM Gasto G
                      LEFT JOIN Abastecimento A ON A.CodAbastecimento = G.CodAbastecimento
                  )
              )
          )
      `,
      [],
      function(_, results) {
          if (results.rows.length) {
            setNotificationCount(results.rows.item(0).TotalReminders)            
          }
      },
      function(error) {
          console.error(error)
      }
      )
    })   
  };

  const value = { notificationCount, notify }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
};

export default BellProvider;
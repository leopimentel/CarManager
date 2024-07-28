import React, { createContext, useState } from "react";
import { db } from '../database'

export const AppContext = createContext();

const BellProvider = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  
  const notify = async () => {
    const result = await db.getFirstAsync(
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
      []);

    setNotificationCount(result.TotalReminders)
  }

  const value = { notificationCount, notify }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
};

export default BellProvider;
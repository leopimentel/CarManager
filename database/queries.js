import { db } from './index';
import { fromUserDateToDatabase } from '../utils/date';
import { spendingTypes } from '../constants/fuel';

// Fetch all vehicles, ordered by whether they are the primary vehicle
export const fetchVehicles = async () => {
  return await db.getAllAsync(
    `SELECT V.CodVeiculo, V.Descricao FROM Veiculo V
     LEFT JOIN VeiculoPrincipal VP ON VP.CodVeiculo = V.CodVeiculo
     ORDER BY VP.CodVeiculo IS NOT NULL DESC`,
    []
  );
};

// Fetch filling data by CodAbastecimento
export const fetchFillingById = async (codAbastecimento) => {
  return await db.getAllAsync(
    `SELECT A.Data_Abastecimento, CAST(A.KM AS TEXT) AS KM, A.Observacao, A.TanqueCheio,
      AC.Codigo, AC.CodCombustivel, CAST(AC.Valor_Litro AS TEXT) AS Valor_Litro, CAST(AC.Total AS TEXT) AS Total,
      CAST(AC.Litros AS TEXT) AS Litros, CAST(AC.Desconto AS TEXT) AS Desconto, G.CodGasto, A.CodVeiculo
      FROM Abastecimento A
      INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
      INNER JOIN Gasto G ON G.CodAbastecimento = AC.CodAbastecimento
      AND (G.Codigo_Abastecimento_Combustivel IS NULL OR
        G.Codigo_Abastecimento_Combustivel IS NOT NULL AND G.Codigo_Abastecimento_Combustivel = AC.Codigo)
      WHERE A.CodAbastecimento = ?
      ORDER BY AC.Codigo`,
    [codAbastecimento]
  );
};

// Save a new filling or update an existing one
export const saveFillingDb = async (data, isUpdate = false, codAbastecimento = null) => {
  const {
    vehicleId, fillingDate, km, observation, isFullTank, totalFuel, pricePerUnit, fuelType, discount,
    litters, isTwoFuelTypes, totalFuel2, pricePerUnit2, fuelType2, litters2, codAbastecimentoCombustivel,
    codGasto, codAbastecimentoCombustivel2, codGasto2
  } = data;

  const fillingDateSqlLite = fromUserDateToDatabase(fillingDate);

  return await db.withTransactionAsync(async (tx) => {
    let insertId = codAbastecimento;
    if (!isUpdate) {
      // Insert new filling
      let res = await db.runAsync(
        `INSERT INTO Abastecimento (CodVeiculo, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES (?, ?, ?, ?, ?)`,
        [vehicleId, fillingDateSqlLite, km, observation, isFullTank]
      );
      insertId = res.lastInsertRowId;

      // Insert first fuel type
      res = await db.runAsync(
        'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total, Desconto) VALUES (?, ?, ?, ?, ?, ?)',
        [insertId, fuelType, totalFuel / pricePerUnit, pricePerUnit, totalFuel, discount]
      );
      const codAbastecimentoCombustivelInserted = res.lastInsertRowId;

      await db.runAsync(
        `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel - discount, observation, insertId, codAbastecimentoCombustivelInserted, km]
      );

      if (isTwoFuelTypes) {
        // Insert second fuel type if applicable
        res = await db.runAsync(
          'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
          [insertId, fuelType2, totalFuel2 / pricePerUnit2, pricePerUnit2, totalFuel2]
        );
        const codAbastecimentoCombustivelInserted2 = res.lastInsertRowId;

        await db.runAsync(
          `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel2, observation, insertId, codAbastecimentoCombustivelInserted2, km]
        );
      }
    } else {
      // Update existing filling
      await db.runAsync(
        `UPDATE Abastecimento
         SET CodVeiculo = ?, Data_Abastecimento = ?, KM = ?, Observacao = ?, TanqueCheio = ?
         WHERE CodAbastecimento = ?`,
        [vehicleId, fillingDateSqlLite, km, observation, isFullTank, codAbastecimento]
      );

      await db.runAsync(
        `UPDATE Abastecimento_Combustivel
          SET CodCombustivel = ?, Litros = ?, Valor_Litro = ?, Total = ?, Desconto = ?
          WHERE Codigo = ?`,
        [fuelType, litters, pricePerUnit, totalFuel, discount, codAbastecimentoCombustivel]
      );

      await db.runAsync(
        `UPDATE Gasto
         SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?
         WHERE CodGasto = ?`,
        [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel, observation, km, codGasto]
      );

      if (codAbastecimentoCombustivel2) {
        if (isTwoFuelTypes) {
          await db.runAsync(
            `UPDATE Abastecimento_Combustivel
              SET CodCombustivel = ?, Litros = ?, Valor_Litro = ?, Total = ?
              WHERE Codigo = ?`,
            [fuelType2, litters2, pricePerUnit2, totalFuel2, codAbastecimentoCombustivel2]
          );

          await db.runAsync(
            `UPDATE Gasto
              SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?
              WHERE CodGasto = ?`,
            [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel2, observation, km, codGasto2]
          );
        } else {
          await db.runAsync(
            `DELETE FROM Abastecimento_Combustivel
              WHERE Codigo = ?`,
            [codAbastecimentoCombustivel2]
          );

          await db.runAsync(
            `DELETE FROM Gasto WHERE CodGasto = ?`,
            [codGasto2]
          );
        }
      } else if (isTwoFuelTypes) {
        // If second fuel type was added during update
        let res = await db.runAsync(
          'INSERT INTO Abastecimento_Combustivel (CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES (?, ?, ?, ?, ?)',
          [codAbastecimento, fuelType2, totalFuel2 / pricePerUnit2, pricePerUnit2, totalFuel2]
        );
        const codAbastecimentoCombustivelInserted2 = res.lastInsertRowId;

        await db.runAsync(
          `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [vehicleId, fillingDateSqlLite, spendingTypes[0].index, totalFuel2, observation, codAbastecimento, codAbastecimentoCombustivelInserted2, km]
        );
      }
    }
    return insertId;
  });
};

// Delete a filling by CodAbastecimento
export const deleteFilling = async (codAbastecimento, codAbastecimentoCombustivel, codGasto, codAbastecimentoCombustivel2 = null, codGasto2 = null) => {
  return await db.withTransactionAsync(async (tx) => {
    await db.runAsync(
      `DELETE FROM Abastecimento WHERE CodAbastecimento = ?`,
      [codAbastecimento]
    );

    await db.runAsync(
      'DELETE FROM Abastecimento_Combustivel WHERE Codigo = ?',
      [codAbastecimentoCombustivel]
    );

    await db.runAsync(
      `DELETE FROM Gasto WHERE CodGasto = ?`,
      [codGasto]
    );

    if (codAbastecimentoCombustivel2) {
      await db.runAsync(
        'DELETE FROM Abastecimento_Combustivel WHERE Codigo = ?',
        [codAbastecimentoCombustivel2]
      );

      await db.runAsync(
        `DELETE FROM Gasto WHERE CodGasto = ?`,
        [codGasto2]
      );
    }
  });
};

// Update the primary vehicle
export const updatePrimaryVehicle = async (vehicleId) => {
  return await db.runAsync(
    `UPDATE VeiculoPrincipal SET CodVeiculo = ?`,
    [vehicleId]
  );
};

// Fetch the earliest filling date for a vehicle
export const fetchEarliestFillingDate = async (vehicleId) => {
  return await db.getFirstAsync(
    `SELECT MIN(A.Data_Abastecimento) AS Data_Abastecimento
     FROM Abastecimento A
     WHERE A.CodVeiculo = ?`,
    [vehicleId]
  );
};

// Fetch fuel consumption data for a vehicle within a date range
export const fetchFuelConsumptionData = async (vehicleId, startDate, endDate) => {
  return await db.getAllAsync(
    `SELECT A.CodAbastecimento,
        A.Data_Abastecimento,
        A.KM,
        A.Observacao,
        A.TanqueCheio,
        GROUP_CONCAT(AC.CodCombustivel) AS CodCombustivel,
        SUM(AC.Litros) AS Litros,
        (SUM(AC.Total) / SUM(AC.Litros)) AS Valor_Litro,
        SUM(AC.Total) AS Total,
        COALESCE(SUM(AC.Desconto), 0) AS Desconto
     FROM Abastecimento A
     INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
     WHERE A.CodVeiculo = ?
     AND A.Data_Abastecimento >= ? AND A.Data_Abastecimento <= ?
     GROUP BY AC.CodAbastecimento
     ORDER BY A.KM DESC`,
    [vehicleId, startDate, endDate]
  );
};

// Fetch the next filling after a specific KM for a vehicle
export const fetchNextFillingAfterKM = async (vehicleId, km) => {
  return await db.getFirstAsync(
    `SELECT A.KM, AC.Litros
     FROM Abastecimento A
     INNER JOIN Abastecimento_Combustivel AC ON AC.CodAbastecimento = A.CodAbastecimento
     WHERE A.CodVeiculo = ?
     AND A.KM > ?
     ORDER BY A.KM
     LIMIT 1`,
    [vehicleId, km]
  );
};

// Fetch the earliest spending date for a vehicle
export const fetchEarliestSpendingDate = async (vehicleId) => {
  return await db.getFirstAsync(
    `SELECT MIN(G.Data) AS Data
     FROM Gasto G
     WHERE G.CodVeiculo = ?`,
    [vehicleId]
  );
};

// Fetch spending report data for a vehicle within a date range
export const fetchSpendingReportData = async (vehicleId, startDate, endDate) => {
  return await db.getAllAsync(
    `SELECT
        G.CodAbastecimento,
        G.CodGasto,
        G.Data,
        G.Valor,
        G.CodGastoTipo,
        G.Observacao,
        COALESCE(A.KM, G.KM) AS KM,
        G.Oficina
     FROM Gasto G
     LEFT JOIN Abastecimento A ON A.CodAbastecimento = G.CodAbastecimento
     WHERE G.CodVeiculo = ?
     AND G.Data >= ? AND G.Data <= ?
     ORDER BY G.Data DESC, G.KM DESC`,
    [vehicleId, startDate, endDate]
  );
};

// Fetch spending details by CodGasto
export const fetchSpendingById = async (codGasto) => {
  return await db.getFirstAsync(
    `SELECT
       G.Data,
       G.CodGastoTipo,
       G.Valor,
       G.Observacao,
       G.KM,
       G.CodVeiculo,
       G.Oficina
     FROM Gasto G
     WHERE G.CodGasto = ?`,
    [codGasto]
  );
};

// Save a new spending or update an existing one
export const saveSpendingDb = async (data, isUpdate = false, codGasto = null) => {
  const { vehicleId, date, spendingType, price, observation, km, autoRepair } = data;
  const dateSqlLite = fromUserDateToDatabase(date);

  if (!isUpdate) {
    let res = await db.runAsync(
      `INSERT INTO Gasto (CodVeiculo, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel, KM, Oficina) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicleId, dateSqlLite, spendingType, price, observation, null, null, km, autoRepair]
    );
    return res.lastInsertRowId;
  } else {
    await db.runAsync(
      `UPDATE Gasto
       SET CodVeiculo = ?, Data = ?, CodGastoTipo = ?, Valor = ?, Observacao = ?, KM = ?, Oficina = ?
       WHERE CodGasto = ?`,
      [vehicleId, dateSqlLite, spendingType, price, observation, km, autoRepair, codGasto]
    );
    return codGasto;
  }
};

// Delete a spending by CodGasto
export const deleteSpending = async (codGasto) => {
  return await db.runAsync(
    `DELETE FROM Gasto WHERE CodGasto = ?`,
    [codGasto]
  );
};

// Fetch all reminder types
export const fetchReminderTypes = async () => {
  return await db.getAllAsync(
    `SELECT L.Descricao, L.CodLembreteTipo FROM LembreteTipo L`,
    []
  );
};

// Fetch reminder details by CodLembrete
export const fetchReminderById = async (codLembrete) => {
  return await db.getFirstAsync(
    `SELECT
       L.CodVeiculo, L.DataCadastro, L.CodLembreteTipo,
       L.KM, L.DataLembrete, L.Observacao, L.Finalizado, L.CodGasto
     FROM Lembrete L
     WHERE L.CodLembrete = ?`,
    [codLembrete]
  );
};

// Save a new reminder or update an existing one
export const saveReminder = async (data, isUpdate = false, codLembrete = null) => {
  const { vehicleId, dateCadastro, reminderType, km, dateLembrete, observation, done, spendingId } = data;
  const dateCadastroSqlLite = fromUserDateToDatabase(dateCadastro);
  const dateLembreteSqlLite = dateLembrete ? fromUserDateToDatabase(dateLembrete) : null;

  if (!isUpdate) {
    let res = await db.runAsync(
      `INSERT INTO Lembrete 
       (CodVeiculo, DataCadastro, CodLembreteTipo, KM, DataLembrete, Observacao, Finalizado, CodGasto) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicleId, dateCadastroSqlLite, reminderType, km, dateLembreteSqlLite, observation, done, spendingId]
    );
    return res.lastInsertRowId;
  } else {
    await db.runAsync(
      `UPDATE Lembrete
       SET CodVeiculo = ?, DataCadastro = ?, CodLembreteTipo = ?, KM = ?, DataLembrete = ?, Observacao = ?, Finalizado = ?, CodGasto = ?
       WHERE CodLembrete = ?`,
      [vehicleId, dateCadastroSqlLite, reminderType, km, dateLembreteSqlLite, observation, done, spendingId, codLembrete]
    );
    return codLembrete;
  }
};

// Delete a reminder by CodLembrete
export const deleteReminder = async (codLembrete) => {
  return await db.runAsync(
    `DELETE FROM Lembrete WHERE CodLembrete = ?`,
    [codLembrete]
  );
};

// Fetch all reminders with associated data
export const fetchReminders = async () => {
  return await db.getAllAsync(
    `SELECT L.CodLembrete, L.CodVeiculo, L.DataCadastro, L.CodLembreteTipo,
     L.KM, L.DataLembrete, L.Observacao, L.Finalizado, L.CodGasto, LT.Descricao,
     V.Descricao AS Veiculo,
     (L.DataLembrete IS NOT NULL AND date('now', 'localtime') >= L.DataLembrete) AS DateTriggered,
     (
       L.KM IS NOT NULL AND L.KM <= (
           SELECT 
           MAX(COALESCE(A.KM, G.KM, 0)) 
           FROM Gasto G
           LEFT JOIN Abastecimento A ON A.CodAbastecimento = G.CodAbastecimento
       )
     ) AS KMTriggered
     FROM Lembrete L
     INNER JOIN LembreteTipo LT ON LT.CodLembreteTipo = L.CodLembreteTipo
     INNER JOIN Veiculo V ON V.CodVeiculo = L.CodVeiculo
     ORDER BY L.Finalizado ASC, DateTriggered DESC, KMTriggered DESC, L.DataCadastro DESC`,
    []
  );
};

// Insert a new vehicle
export const insertVehicle = async (description) => {
  let res = await db.runAsync(
    `INSERT INTO Veiculo (Descricao) VALUES (?)`,
    [description]
  );
  return res.lastInsertRowId;
};

// Update a vehicle's description
export const updateVehicle = async (vehicleId, description) => {
  return await db.runAsync(
    `UPDATE Veiculo SET Descricao = ? WHERE CodVeiculo = ?`,
    [description, vehicleId]
  );
};

// Delete a vehicle and associated data
export const deleteVehicle = async (vehicleId) => {
  return await db.withTransactionAsync(async (tx) => {
    await db.runAsync(
      `DELETE FROM Veiculo WHERE CodVeiculo = ?`,
      [vehicleId]
    );
    await db.runAsync(
      `DELETE FROM Gasto WHERE CodVeiculo = ?`,
      [vehicleId]
    );
    await db.runAsync(
      `DELETE FROM Abastecimento_Combustivel 
       WHERE CodAbastecimento IN (SELECT CodAbastecimento FROM Abastecimento WHERE CodVeiculo = ?)`,
      [vehicleId]
    );
    await db.runAsync(
      `DELETE FROM Abastecimento WHERE CodVeiculo = ?`,
      [vehicleId]
    );
  });
};

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system'

const databaseName = 'carManager.db';

const openDatabase = () => {
    db = SQLite.openDatabaseSync(databaseName);
    return db
}

let db = openDatabase();

const closeDatabase = () => db.closeSync();

const databaseFilePath = `${FileSystem.documentDirectory}/SQLite/${databaseName}`

const migrateUp = (useMock = __DEV__) => {
    let testData = ''
    let dropTablesStr = ''
    let testData3 = ''
    if (useMock) {
        testData = mock()
        testData3 = mock3()
        dropTablesStr = dropTables()
    }

    /**
     *
     * @type {{"1": string[]}} key = version value array of statement
     */
    const migrations = {
        1: `
            ${dropTablesStr}

            create table if not exists Versao
            (
                Versao INTEGER PRIMARY KEY,
                Data_Cadastro DATETIME default CURRENT_TIMESTAMP
            );

            create table if not exists Abastecimento
            (
                CodAbastecimento INTEGER
                    primary key autoincrement,
                CodVeiculo INTEGER,
                Data_Cadastro DATETIME default CURRENT_TIMESTAMP,
                Data_Abastecimento DATE,
                KM BIGINT default 0,
                Observacao VARCHAR(200),
                TanqueCheio INTEGER default 1
            );

            create table if not exists Abastecimento_Combustivel
            (
                Codigo INTEGER
                    primary key autoincrement,
                CodAbastecimento INTEGER,
                CodCombustivel INTEGER,
                Litros FLOAT default 0,
                Valor_Litro FLOAT default 0,
                Total FLOAT default 0
            );

            create table if not exists Combustivel
            (
                CodCombustivel INTEGER
                    primary key,
                Descricao VARCHAR(50)
            );

            INSERT OR IGNORE INTO Combustivel (CodCombustivel, Descricao) VALUES
            (1, 'Gasolina'),
            (2, 'Álcool'),
            (3, 'Diesel'),
            (4, 'Gás Natural'),
            (5, 'Gasolina Aditivada');

            create table if not exists Gasto
            (
                CodGasto INTEGER
                    primary key autoincrement,
                CodVeiculo INTEGER,
                Data_Cadastro DATETIME default CURRENT_TIMESTAMP,
                Data DATE,
                CodGastoTipo INTEGER,
                Valor FLOAT default 0,
                Observacao VARCHAR(200),
                CodAbastecimento INTEGER,
                Codigo_Abastecimento_Combustivel INTEGER,
                KM BIGINT
            );

            create table if not exists GastoTipo
            (
                CodGastoTipo INTEGER
                    primary key,
                Descricao VARCHAR(50)
            );

            INSERT OR IGNORE INTO GastoTipo (CodGastoTipo, Descricao) VALUES
            (1, 'Combustível'),
            (2, 'Óleo'),
            (3, 'Manutenção');

            create table if not exists Veiculo
            (
                CodVeiculo INTEGER
                    primary key autoincrement,
                Placa VARCHAR(7),
                Descricao VARCHAR(15)
            );

            INSERT OR IGNORE INTO Veiculo (CodVeiculo, Placa, Descricao) VALUES
            (1, null, 'meu');

            ${testData}

            `.split(';').map(statement => statement.trim()).filter(Boolean),
        2: `INSERT OR IGNORE INTO GastoTipo (CodGastoTipo, Descricao) VALUES
            (4, 'Seguro'),
            (5, 'Imposto'),
            (6, 'Pedágio'),
            (7, 'Estacionamento');
            
            ALTER TABLE Gasto ADD COLUMN Oficina VARCHAR(255);
            
            `.split(';').map(statement => statement.trim()).filter(Boolean),
        3: `
            create table if not exists LembreteTipo
            (
                CodLembreteTipo INTEGER PRIMARY KEY,
                Descricao TEXT
            );

            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (1, 'Troca de óleo');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (2, 'Troca de filtro de óleo');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (3, 'Troca de filtro de combustível');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (4, 'Troca de filtro de ar do motor');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (5, 'Troca de filtro do ar condicionado');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (6, 'Revisão');
            INSERT OR IGNORE INTO LembreteTipo (CodLembreteTipo, Descricao) VALUES (7, 'Manutenção');
            
            create table if not exists Lembrete
            (
                CodLembrete INTEGER PRIMARY KEY autoincrement,
                CodVeiculo INTEGER,
                DataCadastro TEXT,
                CodLembreteTipo INTEGER,
                KM INTEGER,
                DataLembrete TEXT,
                Observacao TEXT,
                Finalizado INTEGER DEFAULT 0,
                CodGasto INTEGER
            );

            ${testData3}
            `.split(';').map(statement => statement.trim()).filter(Boolean),
        4: `
            create table if not exists VeiculoPrincipal
            (
                CodVeiculo INTEGER
            );

            insert into VeiculoPrincipal 
            select CodVeiculo from Veiculo limit 1;

            `.split(';').map(statement => statement.trim()).filter(Boolean),
        5: `
            ALTER TABLE Abastecimento_Combustivel ADD COLUMN Desconto FLOAT default 0;

            `.split(';').map(statement => statement.trim()).filter(Boolean),
        6: `
            INSERT OR IGNORE INTO Combustivel (CodCombustivel, Descricao) VALUES (6, 'Etanol Aditivado');

            `.split(';').map(statement => statement.trim()).filter(Boolean)
    }

    const migrateVersions = (versionsToMigrate) => {
        versionsToMigrate.sort().map((version, idx) => {
            for (let j = 0; j < migrations[version].length; j++) {
                db.execSync(migrations[version][j], []);
                console.log('statement success', migrations[version][j])
            }

            if (idx === versionsToMigrate.length - 1) {
                console.log('registering new version', version)
                let row = db.runSync('INSERT OR IGNORE INTO Versao (Versao) VALUES (?)', [version])
                console.log('Database version updated to ' + version, row.lastInsertRowId)
            }
        })
        if (!versionsToMigrate.length) {
            console.log('No database versions to update')
        }
    }

    db.withTransactionSync(() => {
        const dbVersion = 0
        if (!useMock) {
            try {
                dbVersion = db.getFirstSync('SELECT Versao FROM Versao ORDER BY Versao DESC LIMIT 1', []).Versao
            } catch{
                
            }
        }
        console.log("Current database version is: " + dbVersion);
        const versionsToMigrate = Object.keys(migrations).filter(migration => migration > dbVersion)
        migrateVersions(versionsToMigrate)
    })
}
const dropTables = () => {
    return `
        DROP TABLE IF EXISTS Versao;

        DROP TABLE IF EXISTS Abastecimento;

        DROP TABLE IF EXISTS Abastecimento_Combustivel;

        DROP TABLE IF EXISTS Combustivel;

        DROP TABLE IF EXISTS Gasto;

        DROP TABLE IF EXISTS GastoTipo;

        DROP TABLE IF EXISTS Veiculo;

        DROP TABLE IF EXISTS VeiculoPrincipal;

        DROP TABLE IF EXISTS Lembrete;

        DROP TABLE IF EXISTS LembreteTipo;
    `;
}

const mock3 = () => {
    return `
    INSERT OR IGNORE INTO Lembrete (CodLembrete, CodVeiculo, DataCadastro,
        CodLembreteTipo, KM, DataLembrete, Observacao, Finalizado, CodGasto) VALUES
    (1, 1, date(strftime('%Y-%m-%d','now', 'localtime')), 1, 85900, date(strftime('%Y-%m-%d','now', 'localtime'), '+1 day'), 'Lembrete para não esquecer', 0, null);
    `
}

const mock = () => {
    return `
    INSERT OR IGNORE INTO Veiculo (CodVeiculo, Placa, Descricao) VALUES
    (2, null, 'corsa');
    
    INSERT OR IGNORE INTO Abastecimento (CodAbastecimento, CodVeiculo, Data_Cadastro, Data_Abastecimento, KM, Observacao, TanqueCheio) VALUES
    (1, 1, '2017-02-06 22:17:30', '2017-02-06', 128729, 'posto Goiânia ', 1),
    (2, 1, '2017-02-06 22:19:37', '2017-02-06', 128329, 'início ', 1),
    (3, 1, '2017-02-16 21:59:08', '2017-02-16', 129052, 'posto Goiania ', 1),
    (4, 1, '2017-02-25 15:51:59', '2017-02-25', 129357, 'posto espigão ', 1),
    (5, 1, '2017-03-07 21:47:55', '2017-03-07', 129658, 'posto Goiania ', 1),
    (6, 1, '2017-03-10 19:26:51', '2017-03-10', 129763, 'shelll jaragua andou 100km com 1/4 tanque', 1),
    (7, 1, '2017-03-20 08:39:27', '2017-03-20', 130082, 'posto lado iaça andou 1/4 de tanque gasolina e o resto de álcool ', 1),
    (8, 1, '2017-03-29 13:58:36', '2017-03-27', 130389, 'posto goiania', 1),
    (9, 1, '2017-04-09 15:44:21', '2017-04-09', 130788, 'posto shell roosvelt', 1),
    (10, 1, '2017-04-12 22:41:33', '2017-04-12', 130923, 'extra', 1),
    (11, 1, '2017-04-26 21:15:11', '2017-04-26', 131349, 'Goiânia ', 1),
    (12, 1, '2017-05-10 21:46:52', '2017-05-10', 131803, 'goiania', 1),
    (13, 1, '2017-05-23 21:45:13', '2017-05-23', 132235, 'goiania', 1),
    (14, 1, '2017-06-05 22:05:44', '2017-06-05', 132671, 'posto petrobras goiania', 1),
    (15, 1, '2017-06-09 20:13:55', '2017-06-09', 132797, 'gasolina posto goiania', 1),
    (16, 1, '2017-06-14 19:43:56', '2017-06-15', 133268, 'posto shell perto tia Sonia ', 1),
    (17, 1, '2017-06-22 23:10:38', '2017-06-22', 133574, 'posto ipiranga João naves', 1),
    (18, 1, '2017-07-05 21:34:05', '2017-07-05', 133946, 'goiania ', 1),
    (19, 1, '2017-07-17 19:13:13', '2017-07-17', 134312, 'extra', 1),
    (20, 1, '2017-07-20 21:30:44', '2017-07-20', 134430, 'posto Goiania petrobras', 1),
    (21, 1, '2017-07-26 21:35:55', '2017-07-26', 134640, 'posto Goiania ', 1),
    (22, 1, '2017-08-03 20:24:22', '2017-08-03', 134897, 'extra', 1),
    (23, 1, '2017-08-08 09:06:55', '2017-08-08', 135139, 'goiania ', 1),
    (24, 1, '2017-08-13 10:55:11', '2017-08-13', 135327, 'posto bretas patricia', 1),
    (25, 1, '2017-08-19 10:01:20', '2017-08-19', 135567, 'posto extra ', 1),
    (26, 1, '2017-08-31 11:25:50', '2017-08-31', 135813, 'goiania', 1),
    (27, 1, '2017-08-31 12:56:53', '2017-08-31', 135973, 'extra', 1),
    (28, 1, '2017-09-04 20:41:29', '2017-09-04', 136144, 'jd patricia', 1),
    (29, 1, '2017-09-09 11:08:59', '2017-09-09', 136285, 'Goiânia ', 1),
    (30, 1, '2017-09-16 16:15:14', '2017-09-16', 136479, 'petrobras jd patrícia ', 1),
    (31, 1, '2017-09-22 18:47:36', '2017-09-22', 136697, 'Shell jaragua', 1),
    (32, 1, '2017-10-01 19:55:20', '2017-10-01', 136981, 'jd pat', 1),
    (33, 1, '2017-10-14 12:58:21', '2017-10-14', 137352, 'jd pat', 1),
    (34, 1, '2017-10-20 14:02:25', '2017-10-20', 137550, 'buriti', 1),
    (35, 1, '2017-10-22 18:15:22', '2017-10-22', 137898, 'decio', 1),
    (36, 1, '2017-10-30 08:52:14', '2017-10-30', 138128, 'posto colibri', 1),
    (37, 1, '2017-11-05 18:40:36', '2017-11-05', 138396, 'decio buriti', 1),
    (38, 1, '2017-11-08 08:58:46', '2017-11-08', 138469, 'posto jd patrícia puis tb na partida frio', 1),
    (39, 1, '2017-11-18 17:49:36', '2017-11-18', 138786, 'decio', 1),
    (40, 1, '2017-11-20 14:55:48', '2017-11-18', 138908, 'posto ipiranga anel viario', 1),
    (41, 1, '2017-12-01 19:34:19', '2017-12-01', 139247, 'posto colibri ', 0),
    (42, 1, '2017-12-06 07:46:21', '2017-12-05', 139336, 'colibri ', 0),
    (43, 1, '2017-12-10 20:22:00', '2017-12-10', 139443, 'posto jd pat bretas', 0),
    (44, 1, '2017-12-16 18:08:38', '2017-12-16', 135598, 'posto colibri ', 1),
    (45, 1, '2017-12-20 19:56:36', '2017-12-20', 139740, 'Shell jaragua', 1),
    (46, 1, '2017-12-30 13:17:51', '2017-12-30', 140047, 'decio buriti', 1),
    (47, 1, '2018-01-02 19:56:55', '2018-01-02', 140223, 'Shell jaragua ', 1),
    (48, 1, '2018-01-07 20:54:32', '2018-01-07', 140317, 'colibri ', 1),
    (49, 1, '2018-01-19 19:24:45', '2018-01-19', 140655, 'posto shell jaragua', 1),
    (50, 1, '2018-01-26 20:21:44', '2018-01-26', 140845, 'açai', 1),
    (51, 1, '2018-01-28 18:41:48', '2018-01-28', 141008, 'posto decio buriti', 1),
    (52, 1, '2018-02-04 17:53:05', '2018-02-04', 141212, 'bretas jd patrícia ', 1),
    (53, 1, '2018-02-18 08:21:10', '2018-02-18', 141525, 'Shell rondom  km mais ou menos', 1),
    (54, 1, '2018-02-24 08:23:09', '2018-02-24', 141732, 'Shell goiania', 1),
    (55, 1, '2018-03-07 19:35:18', '2018-03-07', 141988, 'Shell jaragua', 1),
    (56, 1, '2018-03-17 20:31:11', '2018-03-17', 142284, 'br goiania ', 1),
    (57, 1, '2018-03-23 20:07:16', '2018-03-23', 142426, 'assai', 1),
    (58, 1, '2018-03-30 10:17:58', '2018-03-30', 142644, 'buriti ', 1),
    (59, 1, '2018-04-01 17:13:39', '2018-04-01', 143041, 'buriti', 1),
    (60, 1, '2018-04-09 19:52:08', '2018-04-09', 143230, 'posto Zé picanha', 1),
    (61, 1, '2018-05-04 19:52:42', '2018-05-04', 143822, 'goiania pretrobras', 1),
    (62, 1, '2018-05-16 09:09:39', '2018-05-16', 144115, 'goiania', 1),
    (63, 1, '2018-05-22 09:52:19', '2018-05-22', 144287, 'espigão ', 1),
    (64, 1, '2018-05-31 10:58:02', '2018-05-31', 144414, 'colibri ', 1),
    (65, 1, '2018-05-31 13:30:39', '2018-05-31', 144599, 'posto araxa ale', 1),
    (66, 1, '2018-05-31 16:18:06', '2018-05-31', 144711, 'petrobras BR antes luz', 1),
    (67, 1, '2018-06-02 20:30:08', '2018-06-02', 145012, 'ipiranga bh', 1),
    (68, 1, '2018-06-04 11:50:04', '2018-06-04', 145094, 'petrobras do mau', 1),
    (69, 1, '2018-06-04 14:14:08', '2018-06-04', 145289, 'posto caxuxa luz', 1),
    (70, 1, '2018-06-04 15:05:13', '2018-06-04', 145341, '', 1),
    (71, 1, '2018-06-08 14:39:26', '2018-06-08', 145705, 'decio buriti', 1),
    (72, 1, '2018-06-08 14:47:28', '2018-06-08', 145987, 'jk cristalina ', 1),
    (73, 1, '2018-07-03 00:05:52', '2018-07-02', 146515, 'decio', 1),
    (74, 1, '2018-07-03 00:06:53', '2018-07-02', 146137, 'decio ', 1),
    (75, 1, '2018-07-03 00:08:24', '2018-07-02', 146754, 'jd patricia ', 1),
    (76, 1, '2018-07-03 00:08:57', '2018-07-02', 146906, 'jd patricia ', 1),
    (77, 1, '2018-07-10 20:06:07', '2018-07-10', 147125, 'posto Moura goiania', 1),
    (78, 1, '2018-07-15 15:33:52', '2018-07-15', 147344, 'petrobras bretas', 1),
    (79, 1, '2018-08-02 00:11:55', '2018-08-02', 147597, 'posto shell jaragua ', 1),
    (80, 1, '2018-08-09 19:23:14', '2018-08-09', 147917, 'shell jaragua ', 1),
    (81, 1, '2018-08-19 17:16:49', '2018-08-18', 148180, 'decio palacio', 1),
    (82, 1, '2018-08-28 19:41:26', '2018-08-28', 148470, 'shell jaragua', 1),
    (83, 1, '2018-09-04 20:23:14', '2018-09-04', 148701, 'shell jaragua ', 1),
    (84, 1, '2018-09-15 14:57:05', '2018-09-15', 148916, 'shell jaragua', 1),
    (85, 1, '2018-09-21 19:35:49', '2018-09-21', 149098, 'shell jaragua ', 1),
    (86, 1, '2018-09-30 16:01:59', '2018-09-30', 149335, 'petrobras jd patricia', 1),
    (87, 1, '2018-10-08 19:40:07', '2018-10-08', 149498, 'ipiranga assai', 1),
    (88, 1, '2018-10-17 20:40:40', '2018-10-17', 149777, 'petrobras jd patricia', 1),
    (89, 1, '2018-10-22 18:43:16', '2018-10-22', 149868, 'shell jaravua', 1),
    (90, 1, '2018-11-01 19:12:12', '2018-11-01', 150143, 'posto shell jaragua ', 1),
    (91, 1, '2018-11-10 16:48:19', '2018-11-10', 150323, 'petrobras jd patricia', 1),
    (92, 1, '2018-11-20 22:27:08', '2018-11-20', 150576, 'petrobras jd patricia ', 1),
    (93, 1, '2018-12-10 12:20:07', '2018-12-10', 150830, 'shell rondon Pacheco ', 1),
    (94, 1, '2018-12-22 10:57:53', '2018-12-22', 151132, 'shell jaragua ', 1),
    (95, 1, '2018-12-31 15:29:11', '2018-12-31', 151588, 'shell jaragua', 1),
    (96, 1, '2019-01-11 18:20:11', '2019-01-11', 151832, 'petrobras decio', 1),
    (97, 1, '2019-01-27 18:43:52', '2019-01-27', 152176, 'BR jd patricia ', 1),
    (98, 1, '2019-02-01 11:23:03', '2019-02-01', 152359, 'petrobras jd patricia ', 1),
    (99, 1, '2019-02-10 15:09:59', '2019-02-10', 152545, 'BR jd patricia', 0),
    (100, 1, '2019-02-16 12:44:05', '2019-02-16', 152695, 'shell jaragua', 1),
    (101, 1, '2019-03-02 11:59:37', '2019-03-02', 153000, 'petrobras jd patricia ', 0),
    (102, 1, '2019-03-07 08:24:12', '2019-03-07', 153193, 'petrobras as mega', 1),
    (103, 1, '2019-03-20 00:49:58', '2019-03-20', 153456, '', 1),
    (104, 1, '2019-04-04 20:45:56', '2019-04-04', 153828, 'petrobras jd patricia ', 1),
    (105, 1, '2019-04-07 13:34:10', '2019-03-30', 153700, 'jd patricia br', 0),
    (106, 1, '2019-04-17 19:59:20', '2019-04-17', 154080, 'petrobras espigao', 1),
    (107, 1, '2019-04-24 21:00:09', '2019-04-24', 154367, 'bretas jd patricia ', 1),
    (108, 1, '2019-05-02 19:39:28', '2019-05-02', 154571, 'shell getulio', 1),
    (109, 1, '2019-05-05 23:42:17', '2019-05-05', 154817, 'petrobras caldas', 0),
    (110, 1, '2019-05-10 22:01:02', '2019-05-10', 155105, 'petrobras jd patricia ', 1),
    (111, 1, '2019-05-15 09:10:13', '2019-05-15', 155234, 'shell jaragua', 1),
    (112, 1, '2019-05-26 17:29:31', '2019-05-26', 155478, 'petr jd patricia ', 1),
    (113, 1, '2019-06-06 20:54:51', '2019-06-06', 155743, 'posto ', 1),
    (114, 1, '2019-06-13 18:42:41', '2019-06-13', 156049, 'assai', 1),
    (115, 1, '2019-06-22 10:56:38', '2019-06-22', 156294, 'shell jaragua ', 1),
    (116, 1, '2019-06-29 20:17:09', '2019-06-29', 156550, 'espigao ', 1),
    (117, 1, '2019-07-07 21:21:20', '2019-07-07', 156699, 'espigão ', 1),
    (118, 1, '2019-07-14 21:32:00', '2019-07-14', 156874, 'petrobras jd patricia ', 1),
    (119, 1, '2019-07-22 19:04:20', '2019-07-22', 157100, 'extra', 1),
    (120, 1, '2019-08-04 18:38:38', '2019-08-04', 157522, 'assai', 1),
    (121, 1, '2019-08-05 21:19:37', '2019-07-31', 157376, 'Yara botou ', 1),
    (122, 1, '2019-08-13 20:40:23', '2019-08-13', 157766, 'ipiranga perto de casa', 1),
    (123, 1, '2019-08-28 12:58:20', '2019-08-23', 158109, 'ipiranga perto de casa ', 1),
    (124, 1, '2019-09-04 18:30:59', '2019-09-04', 158434, 'ipiranga perto de casa ', 1),
    (125, 1, '2019-09-17 20:00:49', '2019-09-17', 158795, 'shell jaragua ', 1),
    (126, 1, '2019-09-19 20:25:16', '2019-09-19', 158931, 'assai', 1),
    (127, 1, '2019-09-28 10:21:43', '2019-09-28', 159221, 'alcool shell rondon', 1),
    (128, 1, '2019-10-05 17:43:50', '2019-10-05', 159381, 'shell goiania', 1),
    (129, 1, '2019-10-19 11:28:15', '2019-10-19', 159597, 'decio buriti', 1),
    (130, 1, '2019-10-26 09:55:17', '2019-10-26', 159864, 'shell jaragua', 1),
    (131, 1, '2019-10-27 19:18:11', '2019-10-27', 160181, 'shell jaragua', 1),
    (132, 1, '2019-11-09 16:38:27', '2019-11-07', 160494, 'posto ipiranga perto casa', 1),
    (133, 1, '2019-11-23 18:09:19', '2019-11-21', 160772, 'ipiranga perto de casa ', 1),
    (134, 1, '2019-12-01 00:03:57', '2019-11-30', 161030, 'espigao ', 1),
    (135, 1, '2019-12-08 14:43:13', '2019-12-07', 161278, 'espigao ', 1),
    (136, 1, '2019-12-15 16:46:32', '2019-12-15', 161512, 'petrobras jd patricia ', 1),
    (137, 1, '2019-12-22 14:13:01', '2019-12-21', 161734, 'ipiranga perto de casa ', 1),
    (138, 1, '2019-12-31 00:05:53', '2019-12-30', 162040, 'petrobras raulino cota Pacheco ', 1),
    (139, 1, '2020-01-06 23:18:23', '2020-01-04', 162266, 'shell jaragua ', 1),
    (140, 1, '2020-01-12 22:40:50', '2020-01-12', 162517, 'decio buriti ', 1),
    (141, 1, '2020-01-24 00:38:14', '2020-01-20', 162823, 'ipiranga perto de casa ', 1),
    (142, 1, '2020-01-30 12:26:10', '2020-01-28', 163070, 'ipiranga perto de casa ', 1),
    (143, 1, '2020-02-02 22:28:18', '2020-02-02', 163318, 'shell perto rodoviaria', 1),
    (144, 1, '2020-02-17 00:22:42', '2020-02-16', 163669, 'ipiranga perto de casa ', 1),
    (145, 1, '2020-02-17 00:25:09', '2020-02-12', 163577, 'ipiranga nicomedes ', 1),
    (146, 1, '2020-02-25 00:30:25', '2020-02-22', 163897, 'ipiranga perto de casa ', 1),
    (147, 1, '2020-04-07 22:55:30', '2020-03-31', 164185, 'ipiranga perto de casa (tava 2,80 o álcool) 5l foi do meu irmão ', 1),
    (148, 1, '2020-04-19 21:48:36', '2020-03-31', 164310, 'alcool ipiranga perto de casa ', 1),
    (149, 1, '2020-04-19 21:51:45', '2020-04-17', 164494, 'decio buriti ', 1),
    (150, 1, '2020-04-19 21:52:38', '2020-04-17', 164609, 'decio buriti ', 1),
    (152, 1, '2020-04-26 11:44:22', '2020-04-24', 164719, 'ipiranga assai ', 1),
    (153, 1, '2020-05-24 23:57:53', '2020-05-23', 165248, 'decio buriti ', 1),
    (154, 1, '2020-05-25 00:00:24', '2020-05-10', 164966, 'posto espigão ', 1),
    (155, 1, '2020-06-03 21:46:47', '2020-05-25', 165592, 'ipiranga duque de caxias', 1),
    (156, 1, '2020-06-12 17:55:57', '2020-06-10', 165840, 'posto jaragua ', 1),
    (157, 1, '2020-06-21 11:59:42', '2020-06-20', 166136, 'posto karaiba', 1),
    (159, 1, '2020-06-29 23:31:31', '2020-06-27', 166437, 'ipiranga duque de caxias ', 1),
    (160, 1, '2020-07-06 09:23:09', '2020-07-05', 166788, 'shell jaragua ', 1),
    (161, 1, '2020-07-14 13:16:08', '2020-07-13', 167090, 'posto karaiba ', 1);

    INSERT OR IGNORE INTO Abastecimento_Combustivel (Codigo, CodAbastecimento, CodCombustivel, Litros, Valor_Litro, Total) VALUES
    (3, 3, 2, 39.773, 2.64, 105),
    (9, 4, 2, 41.108, 2.59, 106.47),
    (10, 1, 1, 41.06, 2.68, 110.04),
    (11, 2, 1, 0.002, 5, 0.01),
    (12, 5, 2, 40.498, 2.47, 100.03),
    (14, 6, 2, 13.456, 3.49, 46.96),
    (17, 7, 4, 27.908, 3.379, 94.3),
    (19, 8, 2, 40.283, 3.36, 135.35),
    (20, 9, 1, 40.5, 3.399, 137.66),
    (21, 10, 1, 12.18, 3.349, 40.79),
    (22, 11, 1, 40.69, 3.81, 155.03),
    (24, 12, 1, 39.895, 3.81, 152),
    (25, 13, 1, 38.773, 3.74, 145.01),
    (28, 15, 2, 15.599, 3.59, 56),
    (29, 14, 1, 39.711, 2.77, 110),
    (32, 16, 4, 40, 2.985, 119.4),
    (33, 17, 4, 33.493, 2.7, 90.43),
    (37, 18, 4, 40.927, 2.934, 120.08),
    (39, 19, 4, 38.56, 2.569, 99.06),
    (41, 20, 2, 15.049, 3.49, 52.52),
    (44, 22, 4, 23.203, 3.131, 72.65),
    (45, 23, 4, 23.035, 3.69, 85),
    (47, 21, 4, 22.338, 3.79, 84.66),
    (48, 24, 4, 19.616, 2.579, 50.59),
    (53, 25, 2, 24.319, 2.459, 59.8),
    (55, 27, 1, 16.979, 3.519, 59.75),
    (56, 26, 4, 25, 3.2, 80),
    (57, 28, 2, 22.222, 2.34, 52),
    (58, 29, 4, 13.601, 3.73, 50.73),
    (60, 30, 2, 20.361, 2.299, 46.81),
    (61, 31, 4, 25.97, 3.084, 80.09),
    (62, 32, 4, 31.878, 2.934, 93.53),
    (63, 33, 2, 27.596, 2.899, 80),
    (64, 34, 2, 38.911, 2.699, 105.02),
    (65, 35, 2, 41.512, 2.699, 112.04),
    (66, 36, 1, 26.93, 3.899, 105),
    (67, 37, 2, 28.529, 2.699, 77),
    (68, 38, 5, 7.891, 4.059, 32.03),
    (69, 39, 2, 37.951, 2.899, 110.02),
    (70, 40, 2, 12.712, 2.799, 35.58),
    (71, 41, 1, 11.908, 4.199, 50),
    (74, 42, 1, 11.908, 4.199, 50),
    (76, 44, 2, 17.864, 2.799, 50),
    (77, 43, 1, 16.672, 2.999, 50),
    (78, 45, 2, 40.092, 2.95, 118.27),
    (79, 46, 2, 40.19, 2.999, 120.53),
    (80, 47, 2, 16.715, 4.25, 71.04),
    (81, 48, 1, 13.73, 4.499, 61.77),
    (82, 49, 1, 38.249, 3.17, 121.25),
    (83, 50, 2, 23.619, 3.139, 74.14),
    (84, 51, 2, 19.061, 3.099, 59.07),
    (85, 52, 2, 27.815, 3.099, 86.2),
    (86, 53, 2, 41.098, 2.959, 121.61),
    (87, 54, 2, 26.165, 2.79, 73),
    (88, 55, 2, 37.941, 2.899, 109.99),
    (89, 56, 2, 38.279, 2.899, 110.97),
    (90, 57, 2, 19.081, 3.059, 58.37),
    (91, 58, 2, 28.49, 3.199, 91.14),
    (92, 59, 2, 41.601, 3.199, 133.08),
    (93, 60, 2, 26.48, 3.199, 84.71),
    (95, 61, 2, 38.241, 3.07, 117.4),
    (98, 62, 2, 37.412, 2.94, 109.99),
    (99, 63, 2, 23.411, 2.99, 70),
    (100, 64, 2, 19.74, 4.999, 98.68),
    (101, 65, 1, 12.632, 3.096, 39.11),
    (102, 66, 1, 10.028, 4.659, 46.72),
    (103, 67, 1, 27.561, 4.899, 135.02),
    (104, 68, 1, 9.412, 4.999, 47.05),
    (105, 69, 1, 10.214, 4.899, 50.04),
    (109, 72, 1, 23.14, 4.79, 110.84),
    (110, 71, 1, 30.618, 4.899, 150),
    (111, 70, 1, 8.195, 4.799, 39.33),
    (112, 73, 2, 24.501, 4.899, 120.03),
    (113, 74, 2, 10.438, 4.79, 50),
    (114, 75, 2, 24.341, 2.799, 68.13),
    (115, 76, 2, 16.899, 2.699, 45.61),
    (116, 77, 1, 27.007, 4.37, 118.02),
    (117, 78, 1, 21.68, 4.999, 108.38),
    (118, 79, 2, 26.679, 2.999, 80.01),
    (119, 80, 2, 37.829, 2.819, 106.64),
    (120, 81, 2, 35.947, 2.929, 105.29),
    (121, 82, 2, 39.71, 2.93, 116.35),
    (122, 83, 2, 31.84, 2.93, 93.29),
    (123, 84, 2, 29.509, 2.93, 86.46),
    (125, 85, 2, 26.298, 2.95, 77.58),
    (126, 86, 2, 32.967, 2.899, 95.57),
    (127, 87, 2, 22.35, 2.749, 61.44),
    (128, 88, 2, 37.426, 2.999, 112.24),
    (129, 89, 2, 12.39, 2.899, 35.92),
    (130, 90, 2, 36.771, 2.899, 106.6),
    (131, 91, 2, 25.76, 2.979, 76.74),
    (132, 92, 2, 37.13, 2.889, 107.27),
    (133, 93, 2, 36.098, 2.499, 90.21),
    (134, 94, 1, 38.531, 4.649, 179.13),
    (135, 95, 2, 19.881, 3.019, 60.02),
    (136, 96, 1, 33.142, 4.599, 152.42),
    (137, 97, 2, 19.529, 2.78, 54.29),
    (138, 98, 2, 27.085, 2.789, 75.54),
    (139, 99, 1, 16.784, 2.979, 50),
    (141, 100, 2, 31.861, 2.859, 91.09),
    (143, 102, 2, 37.77, 3.189, 120.45),
    (144, 101, 2, 16.667, 3, 50),
    (145, 103, 2, 36.913, 2.98, 110),
    (146, 104, 2, 40.375, 3.039, 122.7),
    (147, 105, 2, 15.156, 3.299, 50),
    (148, 106, 2, 34.65, 3.039, 105.3),
    (149, 107, 1, 36.142, 4.699, 169.83),
    (150, 108, 2, 20.298, 3.09, 62.72),
    (151, 109, 1, 14.315, 4.89, 70),
    (152, 110, 2, 37.299, 2.899, 108.13),
    (153, 111, 2, 17.702, 2.789, 49.37),
    (154, 112, 2, 35.605, 2.899, 103.22),
    (155, 113, 2, 38.978, 2.75, 107.19),
    (156, 114, 2, 40.143, 2.79, 112),
    (157, 115, 2, 32.281, 2.959, 95.52),
    (158, 116, 2, 34.339, 2.699, 92.68),
    (159, 117, 2, 22.89, 2.699, 61.78),
    (160, 118, 2, 24.555, 2.63, 64.58),
    (161, 119, 2, 31.798, 2.619, 83.28),
    (162, 120, 2, 20.529, 2.419, 49.66),
    (164, 121, 2, 42.802, 2.57, 110),
    (165, 122, 5, 34.85, 4.499, 156.79),
    (166, 123, 5, 33.73, 4.499, 151.75),
    (167, 124, 5, 34.91, 4.499, 157.06),
    (168, 125, 2, 36.332, 2.579, 93.7),
    (169, 126, 2, 21.801, 2.599, 56.66),
    (170, 127, 2, 38.292, 2.799, 107.18),
    (171, 128, 2, 21.362, 2.79, 59.6),
    (172, 129, 1, 29.1, 4.699, 136.74),
    (173, 130, 1, 27.41, 4.44, 121.7),
    (174, 131, 2, 25.782, 2.859, 73.71),
    (175, 132, 2, 35.946, 2.99, 107.48),
    (177, 133, 2, 35.268, 2.999, 105.77),
    (179, 135, 2, 29.091, 3.299, 95.97),
    (180, 134, 2, 34.321, 2.879, 98.81),
    (182, 136, 2, 30.186, 3.279, 98.98),
    (183, 137, 1, 28.65, 4.999, 143.22),
    (184, 138, 2, 31.071, 3.259, 101.26),
    (185, 139, 2, 26.599, 3.199, 85.09),
    (186, 140, 1, 29.283, 4.799, 140.53),
    (187, 141, 2, 31.41, 3.199, 100.48),
    (190, 142, 2, 30.006, 3.159, 94.79),
    (191, 143, 2, 31.138, 3.199, 99.61),
    (193, 145, 2, 35.641, 3.159, 112.59),
    (194, 144, 2, 13.121, 3.159, 41.45),
    (195, 146, 2, 32.121, 3.079, 98.9),
    (197, 147, 2, 39.123, 2.441, 95.5),
    (199, 149, 5, 19.18, 4.099, 78.62),
    (200, 150, 5, 10.337, 4.099, 42.37),
    (201, 148, 5, 17.481, 4.029, 70.43),
    (203, 152, 2, 11.88, 2.399, 28.5),
    (204, 153, 1, 33.309, 3.899, 129.87),
    (205, 154, 2, 28.26, 2.69, 76.02),
    (206, 155, 2, 36.902, 2.479, 91.48),
    (207, 156, 2, 25.718, 2.478, 63.73),
    (208, 157, 2, 35.472, 2.65, 94),
    (213, 159, 1, 36.279, 4.069, 147.62),
    (215, 160, 2, 34.033, 2.579, 87.77),
    (216, 160, 1, 0.269, 4.089, 1.1),
    (218, 161, 2, 35.101, 2.97, 104.25);

    INSERT OR IGNORE INTO Gasto (CodGasto, CodVeiculo, Data_Cadastro, Data, CodGastoTipo, Valor, Observacao, CodAbastecimento, Codigo_Abastecimento_Combustivel) VALUES
    (3, 1, '2017-02-16 21:59:08', '2017-02-16', 1, 105, 'posto Goiania ', 3, null),
    (9, 1, '2017-02-25 15:51:59', '2017-02-25', 1, 106.47, 'posto espigão ', 4, null),
    (10, 1, '2017-02-26 23:41:08', '2017-02-06', 1, 110.04, 'posto Goiânia ', 1, null),
    (11, 1, '2017-02-26 23:41:35', '2017-02-06', 1, 0.01, 'início ', 2, null),
    (12, 1, '2017-03-07 21:47:55', '2017-03-07', 1, 100.03, 'posto Goiania ', 5, null),
    (14, 1, '2017-03-10 19:36:31', '2017-03-10', 1, 46.96, 'shelll jaragua andou 100km com 1/4 tanque', 6, null),
    (17, 1, '2017-03-20 14:52:45', '2017-03-20', 1, 94.3, 'posto lado iaça andou 1/4 de tanque gasolina e o resto de álcool ', 7, null),
    (19, 1, '2017-04-01 17:56:17', '2017-03-27', 1, 135.35, 'posto goiania', 8, null),
    (20, 1, '2017-04-08 14:49:36', '2017-04-08', 2, 97, 'oleo e filtro só a prox. é 2k a mais', null, null),
    (21, 1, '2017-04-09 15:44:21', '2017-04-09', 1, 137.66, 'posto shell roosvelt', 9, null),
    (22, 1, '2017-04-12 22:41:33', '2017-04-12', 1, 40.79, 'extra', 10, null),
    (23, 1, '2017-04-25 21:22:25', '2017-04-23', 3, 100, 'luz led ', null, null),
    (24, 1, '2017-04-26 21:15:11', '2017-04-26', 1, 155.03, 'Goiânia ', 11, null),
    (25, 1, '2017-05-01 11:50:19', '2017-04-29', 3, 60, 'coifa', null, null),
    (27, 1, '2017-05-12 13:52:14', '2017-05-10', 1, 152, 'goiania', 12, null),
    (28, 1, '2017-05-23 21:45:14', '2017-05-23', 1, 145.01, 'goiania', 13, null),
    (31, 1, '2017-06-09 20:29:19', '2017-06-09', 1, 56, 'gasolina posto goiania', 15, null),
    (32, 1, '2017-06-09 20:30:25', '2017-06-05', 1, 110, 'posto petrobras goiania', 14, null),
    (35, 1, '2017-06-15 17:05:24', '2017-06-15', 1, 119.4, 'posto shell perto tia Sonia ', 16, null),
    (36, 1, '2017-06-22 23:10:38', '2017-06-22', 1, 90.43, 'posto ipiranga João naves', 17, null),
    (40, 1, '2017-07-06 12:48:15', '2017-07-05', 1, 120.08, 'goiania ', 18, null),
    (42, 1, '2017-07-18 23:28:12', '2017-07-17', 1, 99.06, 'extra', 19, null),
    (44, 1, '2017-07-20 21:43:22', '2017-07-20', 1, 52.52, 'posto Goiania petrobras', 20, null),
    (47, 1, '2017-08-03 20:24:50', '2017-08-03', 1, 72.65, 'extra', 22, null),
    (48, 1, '2017-08-08 09:06:55', '2017-08-08', 1, 85, 'goiania ', 23, null),
    (50, 1, '2017-08-15 10:03:14', '2017-07-26', 1, 84.66, 'posto Goiania ', 21, null),
    (51, 1, '2017-08-15 10:03:30', '2017-08-13', 1, 50.59, 'posto bretas patricia', 24, null),
    (56, 1, '2017-08-19 10:08:33', '2017-08-19', 1, 59.8, 'posto extra ', 25, null),
    (58, 1, '2017-08-31 12:56:53', '2017-08-31', 1, 59.75, 'extra', 27, null),
    (59, 1, '2017-08-31 12:59:17', '2017-08-31', 1, 80, 'goiania', 26, null),
    (60, 1, '2017-09-04 20:41:29', '2017-09-04', 1, 52, 'jd patricia', 28, null),
    (61, 1, '2017-09-09 11:08:59', '2017-09-09', 1, 50.73, 'Goiânia ', 29, null),
    (62, 1, '2017-09-09 12:39:28', '2017-09-09', 2, 135, 'oleo +filtro apenas', null, null),
    (64, 1, '2017-09-16 18:00:47', '2017-09-16', 1, 46.81, 'petrobras jd patrícia ', 30, null),
    (65, 1, '2017-09-22 18:47:36', '2017-09-22', 1, 80.09, 'Shell jaragua', 31, null),
    (66, 1, '2017-10-01 19:55:20', '2017-10-01', 1, 93.53, 'jd pat', 32, null),
    (67, 1, '2017-10-14 12:58:21', '2017-10-14', 1, 80, 'jd pat', 33, null),
    (68, 1, '2017-10-20 14:02:25', '2017-10-20', 1, 105.02, 'buriti', 34, null),
    (69, 1, '2017-10-22 18:15:22', '2017-10-22', 1, 112.04, 'decio', 35, null),
    (70, 1, '2017-10-30 08:52:14', '2017-10-30', 1, 105, 'posto colibri', 36, null),
    (71, 1, '2017-11-05 18:40:36', '2017-11-05', 1, 77, 'decio buriti', 37, null),
    (72, 1, '2017-11-08 08:58:46', '2017-11-08', 1, 32.03, 'posto jd patrícia puis tb na partida frio', 38, null),
    (73, 1, '2017-11-18 17:49:37', '2017-11-18', 1, 110.02, 'decio', 39, null),
    (74, 1, '2017-11-20 14:55:51', '2017-11-18', 1, 35.58, 'posto ipiranga anel viario', 40, null),
    (75, 1, '2017-12-01 19:34:19', '2017-12-01', 1, 50, 'posto colibri ', 41, null),
    (78, 1, '2017-12-06 07:47:46', '2017-12-05', 1, 50, 'colibri ', 42, null),
    (80, 1, '2017-12-16 18:08:38', '2017-12-16', 1, 50, 'posto colibri ', 44, null),
    (81, 1, '2017-12-19 00:52:55', '2017-12-10', 1, 50, 'posto jd pat bretas', 43, null),
    (82, 1, '2017-12-20 19:56:36', '2017-12-20', 1, 118.27, 'Shell jaragua', 45, null),
    (83, 1, '2017-12-30 13:17:51', '2017-12-30', 1, 120.53, 'decio buriti', 46, null),
    (84, 1, '2018-01-02 19:56:55', '2018-01-02', 1, 71.04, 'Shell jaragua ', 47, null),
    (85, 1, '2018-01-07 20:54:32', '2018-01-07', 1, 61.77, 'colibri ', 48, null),
    (86, 1, '2018-01-19 19:24:45', '2018-01-19', 1, 121.25, 'posto shell jaragua', 49, null),
    (87, 1, '2018-01-26 20:21:44', '2018-01-26', 1, 74.14, 'açai', 50, null),
    (88, 1, '2018-01-28 18:41:48', '2018-01-28', 1, 59.07, 'posto decio buriti', 51, null),
    (89, 1, '2018-02-04 17:53:05', '2018-02-04', 1, 86.2, 'bretas jd patrícia ', 52, null),
    (90, 1, '2018-02-11 02:23:33', '2018-02-11', 3, 90, 'palhetas', null, null),
    (91, 1, '2018-02-18 08:21:10', '2018-02-18', 1, 121.61, 'Shell rondom  km mais ou menos', 53, null),
    (92, 1, '2018-02-24 08:23:09', '2018-02-24', 1, 73, 'Shell goiania', 54, null),
    (93, 1, '2018-03-07 19:35:18', '2018-03-07', 1, 109.99, 'Shell jaragua', 55, null),
    (94, 1, '2018-03-17 20:31:11', '2018-03-17', 1, 110.97, 'br goiania ', 56, null),
    (95, 1, '2018-03-23 20:07:16', '2018-03-23', 1, 58.37, 'assai', 57, null),
    (96, 1, '2018-03-30 10:17:58', '2018-03-30', 1, 91.14, 'buriti ', 58, null),
    (97, 1, '2018-04-01 17:13:39', '2018-04-01', 1, 133.08, 'buriti', 59, null),
    (98, 1, '2018-04-09 19:52:08', '2018-04-09', 1, 84.71, 'posto Zé picanha', 60, null),
    (99, 1, '2018-04-30 00:05:04', '2018-04-28', 2, 175, 'oleo e filtro + filtro combustível + filtro de ar condicionado ', null, null),
    (101, 1, '2018-05-05 10:00:07', '2018-05-04', 1, 117.4, 'goiania pretrobras', 61, null),
    (104, 1, '2018-05-16 13:11:35', '2018-05-16', 1, 109.99, 'goiania', 62, null),
    (105, 1, '2018-05-22 09:52:19', '2018-05-22', 1, 70, 'espigão ', 63, null),
    (106, 1, '2018-05-31 10:58:02', '2018-05-31', 1, 98.68, 'colibri ', 64, null),
    (107, 1, '2018-05-31 13:30:39', '2018-05-31', 1, 39.11, 'posto araxa ale', 65, null),
    (108, 1, '2018-05-31 16:18:06', '2018-05-31', 1, 46.72, 'petrobras BR antes luz', 66, null),
    (109, 1, '2018-06-02 20:30:08', '2018-06-02', 1, 135.02, 'ipiranga bh', 67, null),
    (110, 1, '2018-06-04 11:50:04', '2018-06-04', 1, 47.05, 'petrobras do mau', 68, null),
    (111, 1, '2018-06-04 14:14:08', '2018-06-04', 1, 50.04, 'posto caxuxa luz', 69, null),
    (115, 1, '2018-06-08 20:24:05', '2018-06-08', 1, 110.84, 'jk cristalina ', 72, null),
    (116, 1, '2018-06-08 20:24:56', '2018-06-08', 1, 150, 'decio buriti', 71, null),
    (117, 1, '2018-06-09 23:28:15', '2018-06-04', 1, 39.33, '', 70, null),
    (118, 1, '2018-07-03 00:05:52', '2018-07-02', 1, 120.03, 'decio', 73, null),
    (119, 1, '2018-07-03 00:06:53', '2018-07-02', 1, 50, 'decio ', 74, null),
    (120, 1, '2018-07-03 00:08:24', '2018-07-02', 1, 68.13, 'jd patricia ', 75, null),
    (121, 1, '2018-07-03 00:08:57', '2018-07-02', 1, 45.61, 'jd patricia ', 76, null),
    (122, 1, '2018-07-10 20:06:07', '2018-07-10', 1, 118.02, 'posto Moura goiania', 77, null),
    (123, 1, '2018-07-15 15:33:52', '2018-07-15', 1, 108.38, 'petrobras bretas', 78, null),
    (124, 1, '2018-08-02 00:11:55', '2018-08-02', 1, 80.01, 'posto shell jaragua ', 79, null),
    (125, 1, '2018-08-09 19:23:14', '2018-08-09', 1, 106.64, 'shell jaragua ', 80, null),
    (126, 1, '2018-08-19 17:16:49', '2018-08-18', 1, 105.29, 'decio palacio', 81, null),
    (127, 1, '2018-08-28 19:41:26', '2018-08-28', 1, 116.35, 'shell jaragua', 82, null),
    (128, 1, '2018-09-04 20:23:14', '2018-09-04', 1, 93.29, 'shell jaragua ', 83, null),
    (129, 1, '2018-09-15 14:57:05', '2018-09-15', 1, 86.46, 'shell jaragua', 84, null),
    (131, 1, '2018-09-21 19:37:51', '2018-09-21', 1, 77.58, 'shell jaragua ', 85, null),
    (132, 1, '2018-09-30 16:01:59', '2018-09-30', 1, 95.57, 'petrobras jd patricia', 86, null),
    (133, 1, '2018-10-08 19:40:07', '2018-10-08', 1, 61.44, 'ipiranga assai', 87, null),
    (134, 1, '2018-10-17 20:40:40', '2018-10-17', 1, 112.24, 'petrobras jd patricia', 88, null),
    (135, 1, '2018-10-22 18:43:16', '2018-10-22', 1, 35.92, 'shell jaravua', 89, null),
    (136, 1, '2018-11-01 00:40:22', '2018-09-25', 3, 341.9, 'bomba dagua, mangueira', null, null),
    (137, 1, '2018-11-01 19:12:12', '2018-11-01', 1, 106.6, 'posto shell jaragua ', 90, null),
    (138, 1, '2018-11-10 16:48:19', '2018-11-10', 1, 76.74, 'petrobras jd patricia', 91, null),
    (139, 1, '2018-11-20 22:27:08', '2018-11-20', 1, 107.27, 'petrobras jd patricia ', 92, null),
    (140, 1, '2018-12-10 12:20:08', '2018-12-10', 1, 90.21, 'shell rondon Pacheco ', 93, null),
    (141, 1, '2018-12-22 10:48:16', '2018-12-22', 3, 160, 'óleo + filtro de óleo + filtro ar condicionado ', null, null),
    (142, 1, '2018-12-22 10:57:53', '2018-12-22', 1, 179.13, 'shell jaragua ', 94, null),
    (143, 1, '2018-12-31 15:29:11', '2018-12-31', 1, 60.02, 'shell jaragua', 95, null),
    (144, 1, '2019-01-05 15:47:41', '2019-01-03', 3, 16.21, 'Dpvat 2019', null, null),
    (146, 1, '2019-01-11 13:53:16', '2019-01-03', 3, 952.68, 'seguro do carro Jan - Jul', null, null),
    (147, 1, '2019-01-11 13:53:47', '2019-01-18', 3, 102.41, 'TX licenciamento 2019', null, null),
    (148, 1, '2019-01-11 13:54:07', '2019-01-18', 3, 501.31, 'ipva 2019', null, null),
    (149, 1, '2019-01-11 18:20:11', '2019-01-11', 1, 152.42, 'petrobras decio', 96, null),
    (150, 1, '2019-01-27 18:36:20', '2019-01-23', 3, 125, 'freios 152k', null, null),
    (151, 1, '2019-01-27 18:38:52', '2019-01-03', 3, 19, 'pedagio', null, null),
    (152, 1, '2019-01-27 18:43:52', '2019-01-27', 1, 54.29, 'BR jd patricia ', 97, null),
    (153, 1, '2019-02-01 11:23:03', '2019-02-01', 1, 75.54, 'petrobras jd patricia ', 98, null),
    (154, 1, '2019-02-10 15:09:59', '2019-02-10', 1, 50, 'BR jd patricia', 99, null),
    (156, 1, '2019-02-16 12:45:00', '2019-02-16', 1, 91.09, 'shell jaragua', 100, null),
    (158, 1, '2019-03-07 08:24:12', '2019-03-07', 1, 120.45, 'petrobras as mega', 102, null),
    (159, 1, '2019-03-07 11:10:38', '2019-03-02', 1, 50, 'petrobras jd patricia ', 101, null),
    (160, 1, '2019-03-20 00:49:58', '2019-03-20', 1, 110, '', 103, null),
    (161, 1, '2019-04-04 20:45:56', '2019-04-04', 1, 122.7, 'petrobras jd patricia ', 104, null),
    (162, 1, '2019-04-07 13:34:10', '2019-03-30', 1, 50, 'jd patricia br', 105, null),
    (163, 1, '2019-04-07 13:35:01', '2019-04-04', 3, 74, 'Tubo de água do radiador/motor mais presilia capu', null, null),
    (164, 1, '2019-04-17 19:59:20', '2019-04-17', 1, 105.3, 'petrobras espigao', 106, null),
    (165, 1, '2019-04-24 21:00:09', '2019-04-24', 1, 169.83, 'bretas jd patricia ', 107, null),
    (166, 1, '2019-05-01 11:33:06', '2019-05-01', 3, 15, 'pneu furado', null, null),
    (167, 1, '2019-05-02 19:39:28', '2019-05-02', 1, 62.72, 'shell getulio', 108, null),
    (168, 1, '2019-05-05 23:42:17', '2019-05-05', 1, 70, 'petrobras caldas', 109, null),
    (169, 1, '2019-05-10 22:01:02', '2019-05-10', 1, 108.13, 'petrobras jd patricia ', 110, null),
    (170, 1, '2019-05-15 09:10:13', '2019-05-15', 1, 49.37, 'shell jaragua', 111, null),
    (171, 1, '2019-05-26 17:29:31', '2019-05-26', 1, 103.22, 'petr jd patricia ', 112, null),
    (172, 1, '2019-06-06 20:54:51', '2019-06-06', 1, 107.19, 'posto ', 113, null),
    (173, 1, '2019-06-13 18:42:41', '2019-06-13', 1, 112, 'assai', 114, null),
    (174, 1, '2019-06-22 10:56:38', '2019-06-22', 1, 95.52, 'shell jaragua ', 115, null),
    (175, 1, '2019-06-29 20:17:09', '2019-06-29', 1, 92.68, 'espigao ', 116, null),
    (176, 1, '2019-07-07 21:21:20', '2019-07-07', 1, 61.78, 'espigão ', 117, null),
    (177, 1, '2019-07-07 21:24:48', '2019-07-07', 1, 3.03, 'gasolina frio', null, null),
    (178, 1, '2019-07-14 21:32:00', '2019-07-14', 1, 64.58, 'petrobras jd patricia ', 118, null),
    (179, 1, '2019-07-22 19:04:20', '2019-07-22', 1, 83.28, 'extra', 119, null),
    (180, 1, '2019-08-04 18:38:38', '2019-08-04', 1, 49.66, 'assai', 120, null),
    (182, 1, '2019-08-05 21:20:17', '2019-07-31', 1, 110, 'Yara botou ', 121, null),
    (183, 1, '2019-08-13 20:40:23', '2019-08-13', 1, 156.79, 'ipiranga perto de casa', 122, null),
    (184, 1, '2019-08-28 12:58:20', '2019-08-23', 1, 151.75, 'ipiranga perto de casa ', 123, null),
    (185, 1, '2019-09-04 18:30:59', '2019-09-04', 1, 157.06, 'ipiranga perto de casa ', 124, null),
    (186, 1, '2019-09-17 20:00:49', '2019-09-17', 1, 93.7, 'shell jaragua ', 125, null),
    (187, 1, '2019-09-19 20:25:16', '2019-09-19', 1, 56.66, 'assai', 126, null),
    (188, 1, '2019-09-28 10:21:43', '2019-09-28', 1, 107.18, 'alcool shell rondon', 127, null),
    (189, 1, '2019-10-05 17:43:50', '2019-10-05', 1, 59.6, 'shell goiania', 128, null),
    (190, 1, '2019-10-11 19:04:35', '2019-10-11', 3, 2100, 'pintura do carro', null, null),
    (191, 1, '2019-10-19 11:28:15', '2019-10-19', 1, 136.74, 'decio buriti', 129, null),
    (192, 1, '2019-10-26 09:55:17', '2019-10-26', 1, 121.7, 'shell jaragua', 130, null),
    (193, 1, '2019-10-26 09:57:32', '2019-10-26', 3, 200, 'óleo e filtro do motor, filtro ar condicionado, filtro ar do motor, filtro combustível, km159862 ', null, null),
    (194, 1, '2019-10-27 14:18:46', '2019-09-28', 3, 22, 'borrachinha do reservatório de gasolina de partida', null, null),
    (195, 1, '2019-10-27 19:18:11', '2019-10-27', 1, 73.71, 'shell jaragua', 131, null),
    (196, 1, '2019-11-09 16:38:27', '2019-11-07', 1, 107.48, 'posto ipiranga perto casa', 132, null),
    (197, 1, '2019-11-09 16:44:40', '2019-11-09', 3, 65, '2 lâmpadas H7 e de 2 traços (troquei hj o  H7 da direita)', null, null),
    (199, 1, '2019-11-23 18:10:41', '2019-11-21', 1, 105.77, 'ipiranga perto de casa ', 133, null),
    (201, 1, '2019-12-08 14:43:13', '2019-12-07', 1, 95.97, 'espigao ', 135, null),
    (202, 1, '2019-12-08 14:44:13', '2019-11-30', 1, 98.81, 'espigao ', 134, null),
    (204, 1, '2019-12-15 19:06:07', '2019-12-15', 1, 98.98, 'petrobras jd patricia ', 136, null),
    (205, 1, '2019-12-22 14:13:01', '2019-12-21', 1, 143.22, 'ipiranga perto de casa ', 137, null),
    (206, 1, '2019-12-31 00:05:53', '2019-12-30', 1, 101.26, 'petrobras raulino cota Pacheco ', 138, null),
    (207, 1, '2020-01-06 23:18:23', '2020-01-04', 1, 85.09, 'shell jaragua ', 139, null),
    (208, 1, '2020-01-12 22:40:50', '2020-01-12', 1, 140.53, 'decio buriti ', 140, null),
    (209, 1, '2020-01-24 00:38:14', '2020-01-20', 1, 100.48, 'ipiranga perto de casa ', 141, null),
    (212, 1, '2020-01-30 13:00:56', '2020-01-28', 1, 94.79, 'ipiranga perto de casa ', 142, null),
    (213, 1, '2020-02-02 22:28:18', '2020-02-02', 1, 99.61, 'shell perto rodoviaria', 143, null),
    (214, 1, '2020-02-11 22:48:12', '2020-02-11', 3, 488.84, 'ipva e dpvat', null, null),
    (216, 1, '2020-02-17 00:25:09', '2020-02-12', 1, 112.59, 'ipiranga nicomedes ', 145, null),
    (217, 1, '2020-02-17 00:25:30', '2020-02-16', 1, 41.45, 'ipiranga perto de casa ', 144, null),
    (218, 1, '2020-02-25 00:30:25', '2020-02-22', 1, 98.9, 'ipiranga perto de casa ', 146, null),
    (219, 1, '2020-02-25 00:37:07', '2019-12-31', 3, 471.81, 'seguro carro de outubro a dezembro ', null, null),
    (221, 1, '2020-04-07 22:56:25', '2020-03-31', 1, 95.5, 'ipiranga perto de casa (tava 2,80 o álcool) 5l foi do meu irmão ', 147, null),
    (223, 1, '2020-04-19 21:51:45', '2020-04-17', 1, 78.62, 'decio buriti ', 149, null),
    (224, 1, '2020-04-19 21:52:38', '2020-04-17', 1, 42.37, 'decio buriti ', 150, null),
    (225, 1, '2020-04-19 21:54:17', '2020-03-31', 1, 70.43, 'alcool ipiranga perto de casa ', 148, null),
    (227, 1, '2020-04-26 11:44:22', '2020-04-24', 1, 28.5, 'ipiranga assai ', 152, null),
    (228, 1, '2020-05-03 19:12:21', '2020-03-15', 3, 105.78, 'taxa de licenciamento ', null, null),
    (229, 1, '2020-05-24 23:57:53', '2020-05-23', 1, 129.87, 'decio buriti ', 153, null),
    (230, 1, '2020-05-25 00:00:24', '2020-05-10', 1, 76.02, 'posto espigão ', 154, null),
    (231, 1, '2020-05-25 16:14:27', '2020-05-25', 3, 270, 'kit reparo junta homocinetica lado direito dianteiro + palheta dianteira + alinhamento e balanceamento km 165392', null, null),
    (232, 1, '2020-06-03 21:46:47', '2020-05-25', 1, 91.48, 'ipiranga duque de caxias', 155, null),
    (233, 1, '2020-06-12 17:55:57', '2020-06-10', 1, 63.73, 'posto jaragua ', 156, null),
    (234, 1, '2020-06-21 11:59:42', '2020-06-20', 1, 94, 'posto karaiba', 157, null),
    (237, 1, '2020-06-29 23:31:31', '2020-06-27', 1, 147.62, 'ipiranga duque de caxias ', 159, null),
    (239, 1, '2020-07-04 11:32:43', '2020-06-29', 3, 308, 'troca mangueira 3 pontos + limpeza do sistema água radiador 166598', null, null),
    (242, 1, '2020-07-06 09:24:33', '2020-07-05', 1, 87.77, 'shell jaragua ', 160, null),
    (243, 1, '2020-07-11 12:53:39', '2020-07-11', 3, 200, 'óleo + filtro de óleo + filtro de ar do motor + filtro de ar condicionado ', null, null),
    (245, 1, '2020-07-14 13:16:24', '2020-07-13', 1, 104.25, 'posto karaiba ', 161, null);

    UPDATE Abastecimento
    SET Data_Abastecimento = date(strftime('%Y-%m-%d','now', 'localtime'),
    ('-' || cast(((select max(CodAbastecimento) from Abastecimento)-CodAbastecimento)*7 as text) || ' day'));

    UPDATE Gasto
    SET Data = (CASE WHEN CodGastoTipo = 1
      THEN date(strftime('%Y-%m-%d', 'now', 'localtime'), ('-' || cast(((SELECT max(CodAbastecimento)
                                                            FROM Abastecimento) - CodAbastecimento) * 7 AS TEXT) || ' day'))
                ELSE date(strftime('%Y-%m-%d', 'now', 'localtime'), ('-' || cast(Gasto.CodGasto AS TEXT) || ' day')) END);
    `;
}

export {
    openDatabase,
    closeDatabase,
    databaseName,
    databaseFilePath,
    migrateUp,
    db
}

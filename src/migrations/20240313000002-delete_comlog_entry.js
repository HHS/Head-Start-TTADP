const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `
        -- Delete communications log records as desired by a customer.
        -- Because there's no soft delete column (deletedAt), we're:
        
        -- Doing a hard DELETE FROM in the communications log and link tables (currently just CommunicationLogFiles)
        -- Removing any Files that only exist due to the Communication Log.

        -- The File removal step is intensive because currently there are many different ways
        -- for a File to be linked and all have to be checked before the File can be removed.

        -- Create the sets of things to be deleted and before counts
        DROP TABLE IF EXISTS before_set;
        CREATE TEMP TABLE before_set
        AS
        SELECT DISTINCT
          cl.id clid,
          clf.id clfid,
          clf."fileId" fid
        FROM "CommunicationLogs" cl
        LEFT JOIN "CommunicationLogFiles" clf
          ON clf."communicationLogId" = cl.id
        WHERE cl.id IN (788, 888);
        

        DROP TABLE IF EXISTS before_count;
        CREATE TEMP TABLE before_count
        AS
        SELECT
          COUNT(DISTINCT clid) comlog_count,
          COUNT(DISTINCT clfid) comlogfile_count,
          COUNT(DISTINCT fid) file_count
        FROM before_set;

        -- Check to see if any files are only present because of this communication log
        -- unfortunately there's currently many ways to link a file
        DROP TABLE IF EXISTS files_to_delete;
        CREATE TEMP TABLE files_to_delete
        AS
        WITH candidate_files AS (SELECT DISTINCT fid FROM before_set),
        file_links AS (
        SELECT
          fid,
          clf.id clfid,
          arf.id arfid,
          arof.id arofid,
          of.id ofid,
          otf.id otfid,
          srpf.id srpfid
        FROM candidate_files cf
        LEFT JOIN "CommunicationLogFiles" clf
          ON fid = clf."fileId"
          AND clf."communicationLogId" NOT IN (SELECT DISTINCT clid FROM before_set)
        LEFT JOIN "ActivityReportFiles" arf
          ON fid = arf."fileId"
        LEFT JOIN "ActivityReportObjectiveFiles" arof
          ON fid = arof."fileId"
        LEFT JOIN "ObjectiveFiles" of
          ON fid = of."fileId"
        LEFT JOIN "ObjectiveTemplateFiles" otf
          ON fid = otf."fileId"
        LEFT JOIN "SessionReportPilotFiles" srpf
          ON fid = srpf."fileId"
        )
        SELECT DISTINCT fid
        FROM file_links
        WHERE clfid IS NULL
          AND arfid IS NULL
          AND arofid IS NULL
          AND ofid IS NULL
          AND otfid IS NULL
          AND srpfid IS NULL
          AND fid IS NOT NULL;

        -- Actually start deleting records, starting with the link records
        DELETE FROM "CommunicationLogFiles" clf
        USING (SELECT DISTINCT clfid FROM before_set) b
        WHERE clf.id = b.clfid;

        DELETE FROM "Files" f
        USING files_to_delete
        WHERE f.id = fid;

        DELETE FROM "CommunicationLogs" cl
        USING (SELECT DISTINCT clid FROM before_set) b
        WHERE cl.id = b.clid;

        -- Show after counts
        DROP TABLE IF EXISTS after_count;
        CREATE TEMP TABLE after_count
        AS
        WITH target_logs AS (SELECT DISTINCT clid FROM before_set),
        deleted_files AS (
        SELECT fid
        FROM files_to_delete
        EXCEPT
        SELECT id
        FROM "Files"
        ),
        df_count AS (SELECT COUNT(*) cnt FROM deleted_files)
        SELECT
          COUNT(DISTINCT cl.id) comlog_count,
          COUNT(DISTINCT clf.id) comlogfile_count,
          COUNT(DISTINCT clf."fileId") file_count,
          dfc.cnt deleted_file_count
        FROM target_logs tl
        CROSS JOIN df_count dfc
        LEFT JOIN "CommunicationLogs" cl
          ON tl.clid = cl.id
        LEFT JOIN "CommunicationLogFiles" clf
          ON clf."communicationLogId" = cl.id
        GROUP BY 4;
        `,
        { transaction }
      )
    })
  },

  down: async () => {},
}

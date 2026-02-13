/* eslint-disable no-useless-computed-key */
const { QueryTypes } = require('sequelize')
const fs = require('fs')
const path = require('path')
const plantumlEncoder = require('plantuml-encoder')
const db = require('../models')
const { auditLogger } = require('../logger')

const colors = {
  ttahubBlue: '#264a64',
  ttahubMediumBlue: '#336A90',
  ttahubBlueLight: '#e2eff7',
  ttahubBlueLighter: '#eceef1',
  ttahubMediumDeepTeal: '#407972',
  ttahubDeepTealLight: '#EEF2EB',
  ttahubMagenta: '#A12854',
  ttahubMagentaLight: '#ffe8f0',
  ttahubOrange: '#e29f4d',
  ttahubOrangeLight: '#fff1e0',

  baseDarkest: '#1b1b1b',
  baseDark: '#565c65',
  baseLight: '#a9aeb1',
  baseLighter: '#dfe1e2',
  baseLightest: '#f0f0f0',
  grayTwo: '#f9f9f9',

  info: '#00bde3',
  infoLighter: '#e7f6f8',
  success: '#00a91c',
  successLighter: '#ecf3ec',
  successDarker: '#00a91c',
  error: '#d54309',
  errorLighter: '#f4e3db',

  warning: '#ffbe2e',
  warningLighter: '#faf3d1',
  errorDark: '#b50909',
  blueVividFocus: '#2491FF',

  textInk: '#1b1b1b',
  textLink: '#46789B',
  textVisited: '#8C39DB',
}

export function isCamelCase(str) {
  // Check if the first character is lowercase
  if (str.charAt(0) !== str.charAt(0).toLowerCase()) {
    return false
  }

  // Check if the string contains any whitespace
  if (/\s/.test(str)) {
    return false
  }

  // Check if the string contains any non-alphanumeric characters
  if (/[^a-zA-Z0-9]/.test(str)) {
    return false
  }

  // If none of the above conditions are true, the string is not in camel case
  return true
}

export function processEnum(name, table, schemaEnum, modelEnum) {
  let uml = modelEnum ? `enum ${name} {\n` : `!issue='${name} enum missing for table ${table}'\nenum ${name} #pink;line:red;line.bold;text:red {\n`

  schemaEnum?.forEach((sEnum) => {
    if (!modelEnum?.includes(sEnum)) {
      uml += ` !issue='value missing from model enum: ${sEnum}'\n`
    }
    uml += ` ${sEnum}\n`
  })
  if (Array.isArray(modelEnum)) {
    modelEnum?.forEach((mEnum) => {
      if (!schemaEnum?.includes(mEnum)) {
        uml += ` !issue='value missing from schema enum: ${mEnum}'\n`
      }
    })
  }
  uml += '}\n\n'
  uml += `${name} <|-- ${table}\n\n`
  return uml
}

export function processClassDefinition(schema, key) {
  let uml = schema.model ? `class ${key}{\n` : `!issue='model missing for table'\nclass ${key} #pink;line:red;line.bold;text:red {\n`
  const fields = schema.attributes.sort((a, b) => {
    const ax = `${!a.allowNull ? '*' : ''}${a.reference ? '!' : ''}${a.name}`
    const bx = `${!b.allowNull ? '*' : ''}${b.reference ? '!' : ''}${b.name}`
    if (b.name === 'id') return 1
    if (a.name === 'id') return -1
    return ax.localeCompare(bx)
  })
  const processedFields = []
  const foundEnums = []
  fields.forEach((field) => {
    let modelField
    processedFields.push(field.name)
    if (schema.model) {
      modelField = schema.model?.rawAttributes[field.name]
    }
    let column = ''
    const issues: string[] = []
    // mark fields that do not allow null
    if (field.allowNull !== (modelField?.allowNull ?? true)) {
      issues.push(`!issue='column should${field.allowNull ? '' : ' not'} allow null'`) //eslint-disable-line
    }
    if (!field.allowNull) {
      column += ' *'
    }

    // highlight name when not present in model
    if (schema.model && !modelField) {
      issues.push(`!issue='column missing from model'`) //eslint-disable-line
      column += ` <color:${colors.error}>${field.name}</color>: `
    } else {
      column += ` ${field.name} : `
    }

    // highlight type when not matched in model
    if (modelField && field.type !== modelField.type.toString().toLowerCase()) {
      issues.push(`!issue='column type does not match model: ${field.type} != ${modelField.type.toString().toLowerCase()}'`) //eslint-disable-line
      column += `<color:${colors.error}>${field.type}</color>`
    } else {
      column += `${field.type}`
    }

    if (modelField) {
      if (
        !(
          field.default === modelField.defaultValue ||
          field.default === modelField.defaultValue?.toString() ||
          field.default === modelField.defaultValue?.val
        ) &&
        field.default !== '<generated>' &&
        !((field.default === 'null' || field.default === null) && modelField.defaultValue === undefined) &&
        !(['updatedAt', 'createdAt'].includes(field.name) && ['now()', 'CURRENT_TIMESTAMP'].includes(field.default))
      ) {
        issues.push(`!issue='column default does not match model'`) //eslint-disable-line
      }
    }
    if (field.default) {
      column += ` : ${field.default}`
    }

    if (field.enumName) {
      foundEnums.push(processEnum(field.enumName, key, field.enums, modelField.type.type.values))
    }

    if (field.reference) {
      if (!modelField?.references) {
        issues.push(`!issue='column reference missing'`) //eslint-disable-line
      } else {
        const tableFieldReference = field.reference.replace('(', '.').replace(')', '')
        const wrapIfCapital = (s: string): string => (/[A-Z]/.test(s) ? `"${s}"` : s)
        const modelFieldReference = `"${modelField?.references?.model?.tableName || modelField?.references?.model}".${wrapIfCapital(modelField?.references?.key)}`
        if (tableFieldReference !== modelFieldReference) {
          issues.push(`!issue='column reference does not match model: ${tableFieldReference} !== ${modelFieldReference}'`) //eslint-disable-line
        }
      }
      column += ` : REFERENCES ${field.reference.replace('(', '.').replace(')', '')}`
    }

    if (issues.length > 0) {
      uml += `${issues.join('\n')}`
    }
    uml += `${column}\n`
  })

  uml += '}\n\n'

  if (foundEnums.length) {
    foundEnums.forEach((e) => {
      uml += e
    })
  }
  return uml
}

export function processAssociations(associations, tables, schemas) {
  let uml = "\n' Associations\n\n"

  interface Association {
    [key: string]: string[]
  }
  interface AssociationIssues {
    [key: string]: string[][]
  }
  const associationsByType: Association = {
    ['one-to-one']: [],
    ['one-to-many']: [],
    ['many-to-many']: [],
    ['missing-from-model']: [],
  }
  const associationIssuesByType: AssociationIssues = {
    ['one-to-one']: [],
    ['one-to-many']: [],
    ['many-to-many']: [],
    ['missing-from-model']: [],
  }

  const sourceTarget = {}

  schemas.forEach((schema) => {
    schema.attributes.forEach((attribute) => {
      if (attribute.reference) {
        const source = /"([^"]*)"/.exec(attribute.reference)[1]
        const target = schema?.table
        const key = `${source}***${target}`

        if (!sourceTarget[key]) {
          sourceTarget[key] = []
        }
      }
    })
  })

  // regroup associations into buckets for each table
  associations.forEach((association) => {
    const source = schemas.find((s) => s.model?.name === association.source.name)
    const target = schemas.find((s) => s.model?.name === association.target.name)

    let key = `${source?.table}***${target?.table}`
    if (association.associationType.toLowerCase().startsWith('belongstomany')) {
      const associationTables = [source?.table, target?.table]
      associationTables.sort()
      key = `${associationTables[0]}***${associationTables[1]}`
    } else if (association.associationType.toLowerCase().startsWith('belongs')) {
      key = `${target?.table}***${source?.table}`
    }
    if (!sourceTarget[key]) {
      sourceTarget[key] = []
    }
    sourceTarget[key].push(association)
  })

  Object.keys(sourceTarget)
    .sort()
    .forEach((key) => {
      let sourceNumber
      let targetNumber
      let relationKey = null

      const resourceNames = key.split('***')
      const leftResource = resourceNames[0]
      const rightResource = resourceNames[1]

      sourceTarget[key].forEach((association) => {
        switch (association.associationType.toLowerCase()) {
          case 'belongsto':
            sourceNumber = sourceNumber || 1
            targetNumber = targetNumber || 1
            break
          case 'belongstomany':
            sourceNumber = !sourceNumber || sourceNumber < 2 ? 2 : sourceNumber
            targetNumber = !targetNumber || targetNumber < 2 ? 2 : targetNumber
            break
          case 'hasone':
            sourceNumber = sourceNumber || 1
            targetNumber = targetNumber || 1
            break
          case 'hasmany':
            sourceNumber = sourceNumber || 1
            targetNumber = !targetNumber || targetNumber < 2 ? 2 : targetNumber
            break
          default:
            sourceNumber = sourceNumber || 1
            targetNumber = targetNumber || 1
            break
        }
      })
      const issues: string[] = []

      relationKey = sourceTarget[key].map((association) => association.as).join(',')

      let lineColor
      if (relationKey?.split(',').length === 1) {
        lineColor = colors.error
        issues.push(`!issue='associations need to be defined both directions'`) //eslint-disable-line
      } else {
        lineColor = '#black'
      }

      relationKey = [
        ...new Set(
          relationKey.split(',').map((r) => {
            const cleanR = r.trim()
            const isCamel = isCamelCase(cleanR)
            const isDistinct = relationKey.split(',').filter((v) => v === r).length === 1
            if (isCamel && isDistinct) return cleanR
            if (isCamel && !isDistinct) {
              issues.push(`!issue='associations need to be distinct'`) //eslint-disable-line
              return `<color:${colors.errorLighter}>${cleanR}</color>`
            }
            if (!isCamel && isDistinct) {
              issues.push(`!issue='associations need to be camel case'`) //eslint-disable-line
              return `<color:${colors.error}>${cleanR}</color>`
            }
            issues.push(`!issue='associations need to be distinct and camel case'`) //eslint-disable-line
            return `<color:${colors.errorDark}>${cleanR}</color>`
          })
        ),
      ].join(', ')

      if (sourceNumber === 1 && targetNumber === 1) {
        associationsByType['one-to-one'].push(`${leftResource} "1" --[${lineColor},plain,thickness=2]-- "1" ${rightResource} : ${relationKey}`)
        associationIssuesByType['one-to-one'].push(issues.map((i) => i))
      } else if ((sourceNumber === 1 && targetNumber === 2) || (sourceNumber === 2 && targetNumber === 1)) {
        associationsByType['one-to-many'].push(`${leftResource} "1" --[${lineColor},dashed,thickness=2]--{  "n" ${rightResource} : ${relationKey}`)
        associationIssuesByType['one-to-many'].push(issues.map((i) => i))
      } else if (sourceNumber === 2 && targetNumber === 2) {
        associationsByType['many-to-many'].push(`${leftResource} "n" }--[${lineColor},dotted,thickness=2]--{ "n" ${rightResource} : ${relationKey}`)
        associationIssuesByType['many-to-many'].push(issues.map((i) => i))
      } else {
        associationsByType['missing-from-model'].push(
          `${leftResource} o--[#yellow,bold,thickness=2]--o ${rightResource} : <color:${colors.blueVividFocus}>missing-from-model</color>`
        )
        associationIssuesByType['missing-from-model'].push(issues.map((i) => i))
      }
    })

  if (associationsByType['one-to-one'].length > 0) {
    uml += '\n'
    for (let i = 0; i < associationsByType['one-to-one'].length; i++) {
      //eslint-disable-line
      if (associationIssuesByType['one-to-one'][i]?.length > 0) {
        uml += `${associationIssuesByType['one-to-one'][i].join('\n')}\n`
      }
      uml += `${associationsByType['one-to-one'][i]}\n`
    }
  }
  if (associationsByType['one-to-many'].length > 0) {
    uml += '\n'
    for (let i = 0; i < associationsByType['one-to-many'].length; i++) {
      //eslint-disable-line
      if (associationIssuesByType['one-to-many'][i]?.length > 0) {
        uml += `${associationIssuesByType['one-to-many'][i].join('\n')}\n`
      }
      uml += `${associationsByType['one-to-many'][i]}\n`
    }
  }
  if (associationsByType['many-to-many'].length > 0) {
    uml += '\n'
    for (let i = 0; i < associationsByType['many-to-many'].length; i++) {
      //eslint-disable-line
      if (associationIssuesByType['many-to-many'][i]?.length > 0) {
        uml += `${associationIssuesByType['many-to-many'][i].join('\n')}\n`
      }
      uml += `${associationsByType['many-to-many'][i]}\n`
    }
  }
  if (associationsByType['missing-from-model'].length > 0) {
    uml += '\n'
    uml += `!issue='association missing from models'` //eslint-disable-line
    for (let i = 0; i < associationsByType['missing-from-model'].length; i++) {
      //eslint-disable-line
      if (associationIssuesByType['missing-from-model'][i]?.length > 0) {
        uml += `${associationIssuesByType['missing-from-model'][i].join('\n')}\n`
      }
      uml += `${associationsByType['missing-from-model'][i]}\n`
    }
  }
  return uml
}

export function writeUml(uml, dbRoot) {
  fs.writeFileSync(path.join(dbRoot, 'logical_data_model.puml'), uml)
  // update readme with uml
  const root = path.dirname((require.main || {}).filename || './')
  if (fs.existsSync(path.join(root, 'README.md'))) {
    let readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
    const umlRegex = /``` ?plantuml([\s\S]*?)'db\/uml\.puml\n```/ // eslint-disable-line no-useless-escape
    if (umlRegex.test(readme)) {
      const replacement = `\`\`\`plantuml\n${uml}\n'db/uml.puml\n\`\`\``
      readme = readme.replace(umlRegex, replacement)
      fs.writeFileSync(path.join(root, 'README.md'), readme)
    }
  }
}

async function writeEncoded(uml, dbRoot) {
  const encoded = plantumlEncoder.encode(uml)
  fs.writeFileSync(path.join(dbRoot, 'logical_data_model.encoded'), encoded)
}

async function generateUML(schemas, tables, root) {
  let uml = `@startuml
  ' avoid problems with angled crows feet
  skinparam linetype ortho
  skinparam class {
    BorderColor ${colors.ttahubMediumBlue}
    BorderThickness 2
  }
  ' Classes
  `
  const associations = []
  schemas.forEach((schema) => {
    if (schema.associations) {
      ;(Object.values(schema.associations) || []).forEach((association) => {
        associations.push(association)
      })
    }
    uml += processClassDefinition(schema, schema?.table)
  })

  uml += processAssociations(associations, tables, schemas)

  uml += '\n@enduml\n'

  writeUml(uml, root)
  await writeEncoded(uml, root)
}

export default async function generateUMLFromDB() {
  try {
    const tableData = await db.sequelize.query(
      `
      SELECT
        table_schema,
        table_name "table",
        json_agg(
          json_build_object(
            'ordinal', ordinal_position,
            'name', column_name,
            'type', CASE
                  WHEN data_type = 'USER-DEFINED' THEN 'enum'
                  WHEN data_type = 'character varying' THEN 'varchar(255)'
                  WHEN data_type = 'ARRAY' THEN
                    CASE
                      WHEN SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?') = 'varchar' THEN 'varchar(255)'
                      WHEN SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?') = 'int4' THEN 'integer'
                      ELSE SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?')
                    END || '[]'
                  WHEN data_type = 'numeric' THEN CONCAT('decimal(', numeric_precision, ',', numeric_scale, ')')
                  WHEN data_type = 'int4' THEN 'integer'
                  ELSE data_type
                END,
            'subtype', SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?'),
            'default', CASE
                  WHEN column_default LIKE 'nextval%' THEN '<generated>'
                  ELSE column_default
                END,
            'allowNull', is_nullable = 'YES',
            'reference', SUBSTRING(pg_get_constraintdef(oid) FROM 'REFERENCES ([^)]+[)])'),
            'subtype', SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?'),
            'enumName', CASE
                WHEN SUBSTRING(udt_name FROM '^[_]([^_]+)[_]?') = 'enum'
                THEN SUBSTRING(udt_name FROM '^[_](([^_]+[_]?)+)')
                else null
              END,
            'enums', (
              SELECT ARRAY_AGG(e.enumlabel ORDER BY e.enumlabel)
              FROM pg_type t
              LEFT JOIN pg_enum e
              ON e.enumtypid = t.oid
              WHERE '_' || t.typname = col.udt_name
            )
          )
          ORDER BY ordinal_position ASC
        ) "fields"
      FROM information_schema.columns col
      LEFT JOIN pg_constraint con
      ON col.table_name = regexp_replace(con.conrelid::regclass::TEXT,'"','','g')
      AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY ("' || col.column_name || '") REFERENCES %'
      WHERE table_schema = 'public'
      AND table_name != 'SequelizeMeta'
      --AND table_name NOT LIKE 'ZA%'
      GROUP BY 1,2
    `,
      {
        type: QueryTypes.SELECT,
      }
    )

    const tables = db.sequelize.models
    const schemas = tableData.map((td) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model: any = Object.values(db.sequelize.models)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((m: any) => m?.getTableName() === td?.table)
      return {
        table: td?.table,
        model,
        attributes: td.fields,
        associations: model?.associations,
      }
    })
    await generateUML(schemas, tables, 'docs')
  } catch (err) {
    auditLogger.error(err)
    throw err
  }
}

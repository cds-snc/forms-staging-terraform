const { RDSDataClient, ExecuteStatementCommand } = require("@aws-sdk/client-rds-data");
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const REGION = process.env.REGION;

exports.handler = async function (event) {
  var dbClient;
  // Connect to either local or AWS db
  if (process.env.AWS_SAM_LOCAL) {
    dbClient = new Client();
    if (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE && process.env.PGPASSWORD) {
      dbClient.connect();
    } else {
      return "Missing Environment Variables for DB config"
    }
  } else {
    dbClient = new RDSDataClient({ region: REGION });
  }

  /*
    Supported Methods:
    INSERT:
      - (Required) organisationName
    GET:
      - (Optional) organisationID. Returns all entries if not provided
    UPDATE:
      - All params are required for the first iteration of this lambda
      - (Required) organisationID
      - (Required) organisationNameEn
      - (Required) organisationNameFr
    DELETE:
      - (Required) organisationID to delete
  */
  
  const method = event.method;
  let organisationID = event.organisationID ? event.organisationID : null,
    organisationNameEn = event.organisationNameEn ? event.organisationNameEn : null,
    organisationNameFr = event.organisationNameFr ? event.organisationNameFr : null;
  
  let SQL = "",
    parameters = [];
  
  switch (method) {
    case "INSERT":
      if (organisationNameEn && organisationNameFr) {
        // generate new uuid
        organisationID = uuidv4();
        SQL = (!process.env.AWS_SAM_LOCAL) ?
          "INSERT INTO organisations (id, nameen, namefr) VALUES (:organisationID, :organisationNameEn, :organisationNameFr) RETURNING id"
          : "INSERT INTO organisations (id, nameen, namefr) VALUES ($1, $2, $3) RETURNING id";
        parameters = (!process.env.AWS_SAM_LOCAL) ? [
            {
              name: "id",
              value: {
                stringValue: organisationID,
              },
            },
            {
              name: "nameen",
              value: {
                stringValue: organisationNameEn,
              },
            },
            {
              name: "namefr",
              value: {
                stringValue: organisationNameFr,
              },
            },
          ]
          : [organisationID, organisationNameEn, organisationNameFr];
      } else {
        return { error: "Missing required Name in En and Fr"}
      }
      break;
    case "GET":
      // Get a specific org if given the id, all orgs if not
      if (organisationID) {
        SQL = (!process.env.AWS_SAM_LOCAL) ?
          "SELECT * FROM organisations WHERE id = :organisationID"
        : "SELECT * FROM organisations WHERE id = ($1)";
        parameters = (!process.env.AWS_SAM_LOCAL) ? [
          {
            name: "organisationID",
            value: {
              stringValue: organisationID,
            },
          },
        ]
        : [organisationID];
      } else {
        SQL = "SELECT * FROM organisations";
      }
      break;
    case "UPDATE":
      // needs an ID and both names for now - we'll just overwrite the whole thing for an MVP
      if (organisationID && organisationNameEn && organisationNameFr) {
        SQL = (!process.env.AWS_SAM_LOCAL)
          ? "UPDATE organisations SET nameen = :organisationNameEn, namefr = :organisationNameFr WHERE id = :organisationID"
          : "UPDATE organisations SET nameen = ($1), namefr = ($2) WHERE id = ($3)";
        parameters = (!process.env.AWS_SAM_LOCAL)
        ? [
          {
            name: "organisationNameEn",
            value: {
              stringValue: organisationNameEn,
            },
          },
          {
            name: "organisationNameFr",
            value: {
              stringValue: organisationNameFr,
            },
          },
          {
            name: "organisationID",
            value: {
              stringValue: organisationID,
            },
          },
        ]
        : [organisationID, organisationNameEn, organisationNameFr];
      } else {
        return { error: "Missing required Parameter" };
      }
      break;
    case "DELETE":
      // needs the id
      if (organisationID) {
        SQL = (!process.env.AWS_SAM_LOCAL)
          ? "DELETE from organisations WHERE id = :organisationID"
          : "DELETE from organisations WHERE id = ($1)";
        parameters = (!process.env.AWS_SAM_LOCAL)
        ? [
          {
            name: "organisationID",
            value: {
              stringValue: organisationID,
            },
          },
        ]
        : [organisationID];
      } else {
        return { error: "Missing required Parameter: OrganisationID" };
      }
      break;

  }

  if (!SQL) {
    return { error: "Method not supported" };
  }

  // this is copied from templates lambda with only minor changes..
  // maybe we can reuse this code somehow?
  if (process.env.AWS_SAM_LOCAL) {
    return await dbClient.query(SQL, parameters)
      .then((data) => {
        console.log("success");
        if (data.rows && data.rows.length > 0) {
          return { data: parseResponse(data.rows) };
        }
        return { data: data };
      })
      .catch((error) => {
        console.log("error:");
        console.log(error);
        return { error: error };
      });
  } else {
    const params = {
      database: process.env.DB_NAME,
      resourceArn: process.env.DB_ARN,
      secretArn: process.env.DB_SECRET,
      sql: SQL,
      includeResultMetadata: false, // set to true if we want metadata like column names
      parameters: parameters,
    };
    const command = new ExecuteStatementCommand(params);

    return await dbClient
      .send(command)
      .then((data) => {
        console.log("success");

        if (data.records && data.records.length > 0) {
          return { data: parseResponse(data.records) }
          //return { data: parseConfig(data.records) };
        }
        return { data: data };
      })
      .catch((error) => {
        console.log("error:");
        console.log(error);
        return { error: error };
      });
  }
}

const parseResponse = (records) => {
  const parsedRecords = records.map((record) => {
    let id,
      organisationNameEn,
      organisationNameFr;
    if (!process.env.AWS_SAM_LOCAL) {
      id = record[0].stringValue;
      if (record.length > 1) {
          organisationNameEn = record[1].stringValue
          organisationNameFr = record[2].stringValue
      }
    } else {
      id = record.id;
      organisationNameEn = record.nameen;
      organisationNameFr = record.namefr;
    }

    return {
      organisationID: id,
      organisationNameEn: organisationNameEn,
      organisationNameFr: organisationNameFr,
    };
  });
  return { records: parsedRecords };
}
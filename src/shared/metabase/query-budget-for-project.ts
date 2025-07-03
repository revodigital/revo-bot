import axios from "axios";

const METABASE_URL = process.env.METABASE_URL!;
const METABASE_API_KEY = process.env.METABASE_API_KEY!;

export async function queryBudgetProject(projectKey: string): Promise<any> {
  const response = await axios.post(
    `${METABASE_URL}/api/dataset`,
    {
      database: 2,
      type: "query",
      query: buildQueryPayload(projectKey),
      parameters: [],
    },
    {
      headers: {
        "x-api-key": METABASE_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

function buildQueryPayload(projectKey: string): any {
  return {
    joins: [
      {
        ident: "8k70JEDbj8TfnuNZQbrwe",
        strategy: "left-join",
        alias: "TimeEntry",
        condition: [
          "=",
          [
            "field",
            "id",
            {
              "base-type": "type/Integer",
            },
          ],
          [
            "field",
            212,
            {
              "base-type": "type/Integer",
              "join-alias": "TimeEntry",
            },
          ],
        ],
        "source-table": 43,
      },
      {
        ident: "INXhRUtvwls5Rt3PFaW90",
        strategy: "left-join",
        alias: "Project",
        condition: [
          "=",
          [
            "field",
            221,
            {
              "base-type": "type/Integer",
              "join-alias": "TimeEntry",
            },
          ],
          [
            "field",
            "id",
            {
              "base-type": "type/Integer",
              "join-alias": "Project",
            },
          ],
        ],
        "source-table": "card__38",
      },
    ],
    breakout: [
      [
        "field",
        "description",
        {
          "base-type": "type/Text",
        },
      ],
    ],
    aggregation: [
      [
        "median",
        [
          "field",
          "days",
          {
            "base-type": "type/Integer",
          },
        ],
      ],
      [
        "sum",
        [
          "field",
          218,
          {
            "base-type": "type/Float",
            "join-alias": "TimeEntry",
          },
        ],
      ],
      [
        "aggregation-options",
        [
          "/",
          [
            "sum",
            [
              "field",
              218,
              {
                "base-type": "type/Float",
                "join-alias": "TimeEntry",
              },
            ],
          ],
          8,
        ],
        {
          name: "logged in days",
          "display-name": "logged in days",
        },
      ],
      [
        "aggregation-options",
        [
          "-",
          [
            "median",
            [
              "field",
              "days",
              {
                "base-type": "type/Integer",
              },
            ],
          ],
          [
            "/",
            [
              "sum",
              [
                "field",
                218,
                {
                  "base-type": "type/Float",
                  "join-alias": "TimeEntry",
                },
              ],
            ],
            8,
          ],
        ],
        {
          name: "days left",
          "display-name": "days left",
        },
      ],
    ],
    "source-table": "card__42",
    "aggregation-idents": {
      "0": "OC-GCwLENFPMfVHTqRD5B",
      "1": "mK-v9wozqujQ6Spei586N",
      "2": "QdlH4_QQ-ufVv3-ARVsD2",
      "3": "-Vdvh1tUv9akaEuoQM6xc",
    },
    "breakout-idents": {
      "0": "MSCsdeZ00_rcgsFhdKWJI",
    },
    filter: [
      "=",
      [
        "field",
        191,
        {
          "base-type": "type/Text",
          "join-alias": "Project",
        },
      ],
      projectKey,
    ],
  };
}

import YAML from 'yaml';
import { Method } from 'axios';

export interface OpenApiFormat {
  openapi: string;
  info: {
    version?: string;
    title?: string;
  };
  servers?: { url: string; description?: string }[];
  paths?: {
    [path: string]: ApiPathFormat;
  };
}

interface ApiPathFormat {
  [method: string]: {
    summary?: string;
    description?: string;
    parameters?: any;
    responses?: { [status: number]: ApiResponseFormat };
  };
}

interface ApiResponseFormat {
  description?: string;
  content: {
    [content: string]: ResponseSchemaFromat;
  };
}

type ExampleSchemaFormat = ObjectSchemaFromat | ArraySchemaFromat;

interface ResponseSchemaFromat {
  schema?: ExampleSchemaFormat;
}

type SchemaType = 'object' | 'array';

interface SchemaFromatBase {
  type: SchemaType;
}

interface ObjectSchemaFromat extends SchemaFromatBase {
  type: 'object';
  properties: {
    [key: string]: any;
  };
}

interface ArraySchemaFromat extends SchemaFromatBase {
  type: 'array';
  items: any;
  expamples: any[];
}

export class OpenApi implements OpenApiFormat {
  openapi: string = '3.0.0';
  info: {
    version?: string;
    title?: string;
  } = {
    version: '1.0.0',
  };
  servers?: { url: string; description?: string }[] = [
    {
      url: 'https://takukobayashi.github.io/GovernmentOpenDataWebAPI/',
      description: '',
    },
  ];
  paths?: { [path: string]: ApiPathFormat } = {};

  private constructor(openApiFormat: OpenApiFormat) {
    this.openapi = openApiFormat.openapi;
    this.info = openApiFormat.info;
    this.servers = openApiFormat.servers;
    this.paths = openApiFormat.paths;
  }

  addApiPath({
    apiPath,
    method = 'get',
    status = 200,
    example = { type: 'object', properties: {} },
  }: {
    apiPath: string;
    method: Method;
    status: number;
    example: ExampleSchemaFormat;
  }) {
    this.paths = {
      ...this.paths,
      [apiPath]: {
        [method]: {
          responses: {
            [status]: {
              content: {
                'application/json': {
                  schema: example,
                },
              },
            },
          },
        },
      },
    };
  }

  toYaml(): string {
    return YAML.stringify(this);
  }

  static loadYaml(yamlString: string): OpenApi {
    return new OpenApi(YAML.parse(yamlString));
  }
}

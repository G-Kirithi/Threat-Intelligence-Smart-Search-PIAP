import dotenv from "dotenv";
dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

export enum Type {
  OBJECT = "OBJECT",
  STRING = "STRING",
  ARRAY = "ARRAY",
  INTEGER = "INTEGER",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN"
}

export class GoogleGenAI {
  constructor(options?: any) {
    console.log(`[Ollama] Initialized client targeting: ${OLLAMA_BASE_URL} (Model: ${OLLAMA_MODEL})`);
  }

  models = {
    generateContent: async (params: {
      model: string;
      contents: string;
      config?: {
        responseMimeType?: string;
        responseSchema?: any;
      };
    }) => {
      const url = `${OLLAMA_BASE_URL}/api/generate`;
      const isJson = params.config?.responseMimeType === "application/json";
      
      const payload: any = {
        model: OLLAMA_MODEL,
        prompt: params.contents,
        stream: false
      };

      if (isJson) {
        if (params.config?.responseSchema) {
          payload.format = convertSchema(params.config.responseSchema);
        } else {
          payload.format = "json";
        }
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();
        return {
          text: data.response || ""
        };
      } catch (error) {
        console.error("[Ollama generateContent Error]", error);
        throw error;
      }
    },

    generateContentStream: async (params: {
      model: string;
      contents: string;
      config?: any;
    }) => {
      const url = `${OLLAMA_BASE_URL}/api/generate`;
      const payload = {
        model: OLLAMA_MODEL,
        prompt: params.contents,
        stream: true
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Ollama stream error: Empty response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const queue: string[] = [];

        return {
          [Symbol.asyncIterator]: () => {
            return {
              next: async () => {
                if (queue.length > 0) {
                  return { value: { text: queue.shift()! }, done: false };
                }

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (buffer.trim()) {
                      try {
                        const json = JSON.parse(buffer.trim());
                        buffer = "";
                        if (json.response) {
                          return { value: { text: json.response }, done: false };
                        }
                      } catch (e) {
                        // ignore parsing error on stream close
                      }
                    }
                    return { done: true, value: undefined };
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  for (const line of lines) {
                    if (line.trim()) {
                      try {
                        const json = JSON.parse(line.trim());
                        if (json.response) {
                          queue.push(json.response);
                        }
                      } catch (e) {
                        console.error("[Ollama Stream chunk parsing error]", e);
                      }
                    }
                  }

                  if (queue.length > 0) {
                    return { value: { text: queue.shift()! }, done: false };
                  }
                }
              }
            };
          }
        };
      } catch (error) {
        console.error("[Ollama generateContentStream Error]", error);
        throw error;
      }
    }
  };
}

function convertSchema(genaiSchema: any): any {
  if (!genaiSchema) return undefined;
  
  const schema: any = {};
  
  if (genaiSchema.type) {
    switch (genaiSchema.type) {
      case Type.OBJECT:
        schema.type = "object";
        break;
      case Type.ARRAY:
        schema.type = "array";
        break;
      case Type.STRING:
        schema.type = "string";
        break;
      case Type.INTEGER:
        schema.type = "integer";
        break;
      case Type.NUMBER:
        schema.type = "number";
        break;
      case Type.BOOLEAN:
        schema.type = "boolean";
        break;
      default:
        schema.type = typeof genaiSchema.type === "string" ? genaiSchema.type.toLowerCase() : "string";
    }
  }

  if (genaiSchema.properties) {
    schema.properties = {};
    for (const key in genaiSchema.properties) {
      schema.properties[key] = convertSchema(genaiSchema.properties[key]);
    }
  }

  if (genaiSchema.items) {
    schema.items = convertSchema(genaiSchema.items);
  }

  if (genaiSchema.required) {
    schema.required = genaiSchema.required;
  }

  return schema;
}

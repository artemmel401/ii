function changeFormat(obj) {
  let newArray = [];
  for (let variant of obj.variants) {
    let newAnswers = []
    for (let answer of variant.tasks[0].answers) {
      newAnswers.push({ ...answer, id: Math.floor(Math.random() * 10000) });
    }
    let newTasks = []
    newTasks.push({...variant.tasks[0], id: Math.floor(Math.random() * 10000), answers: newAnswers})
    newArray.push({ ...variant, id: Math.floor(Math.random() * 10000), tasks: newTasks, title: '' });
  }
  return {
    variants: newArray
  }
}
async function checkValidation(obj, count) {
  const Ajv = require('ajv')
  const ajv = new Ajv()

  const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "variants": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "number" },
            "tasks": {
              "type": "array",
              "minItems": 1,
              "maxItems": 1,
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "number" },
                  "type": { "type": "string", "enum": ["text", "radio", "checkbox"] },
                  "content": { "type": "string" },
                  "answers": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "id": { "type": "number" },
                        "content": { "type": "string" },
                        "correct": { "type": "boolean" }
                      },
                      "required": ["id", "content", "correct"]
                    }
                  }
                },
                "required": ["id", "type", "content", "answers"]
              }
            }
          },
          "required": ["id", "tasks"]
        }
      }
    },
    "required": ["variants"]
  };

  const validate = ajv.compile(schema);
  return validate(obj);
}
async function generateTest(req)
{
    const jsonlint = require('jsonlint');

    const catalog = "b1g46tb0m05aust2pkfn";
    const key = "AQVN38fPgG2lasB3jDuglpi2TxGujJUgX6275rZY";

    const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${key}`
    }

    const prompt = `Выведи json файл по запросу тест по теме ${req["topic"]} 
    количество вопросов ${req["count"]} в формате: массив вопросов 
    называется variants, каждый вопрос объект с id и массивом tasks, который включает 
    один объект с строкой id, типом type (text - только один вариант ответа и он правильный, 
        radio - один правильный вариант ответа, checkbox - несколько правильных вариантов ответа), 
        названием вопроса content и массивом с вариантами ответа answers, каждый ответ это объект
         с id ответа, текстом ответа content, ключом correct, который принимает значение true, 
         если ответ правильный, иначе false`

    const maxTokens = "100000"; //TODO: формула подсчета
    const payload = {
        "modelUri": `gpt://${catalog}/yandexgpt`,
        "completionOptions": {
            "stream": false,
            "temperature": 0.6,
            "maxTokens": maxTokens
        },
        "messages": [
            {
                "role": "user",
                "text": prompt
            }
        ]
    };

    let res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    res = await res.json();

    const message = res["result"]["alternatives"]["0"]["message"]["text"]
    const match = message.match(/```json\n([\s\S]*?)```/);

    try
    {
        let obj = jsonlint.parse(match[1]);
        let variants = changeFormat(obj);

        if (await checkValidation(variants))
        {
          return variants;
        }
        else
        {
            console.error("Ошибка при валидации JSON:");
            return variants;
        }
    }
    catch (error)
    {
        console.error("Ошибка при парсинге JSON:", error);
        return null;
    }
}
async function regenerateTest(req)
{
    req["count"] = "1";
    return await generateTest(req)
}

const INPUT_JSON = {
    "topic": "История России 20 века",
    "count": "3",
}
function test_gen(req)
{
    const gen_res = generateTest(req);
    gen_res.then(r => {
        console.log(JSON.stringify(r));
    });
}
function test_regen(req)
{
    const regen_res = regenerateTest(req);
    regen_res.then(r => {
        console.log(JSON.stringify(r));
    });
}

//test_regen(INPUT_JSON);
test_gen(INPUT_JSON);
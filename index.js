async function changeFormat(obj)
{
    let newArray = [];
    for (let variant of obj.variants)
    {
        let newTasks = [];
        for (let task of variant.tasks)
        {
            let newAnswers = [];
            for (let answer of task.answers)
            {
                newAnswers.push({...answer, id: Math.floor(Math.random()*10000)});
            }
            newTasks.push({...task, answers: newAnswers});
        }
        newArray.push({...variant, id: Math.floor(Math.random()*10000), tasks: newTasks});
    }

    return {
        variants: newArray
    };
}
async function checkValidation(obj)
{
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
                        "id": { "type": "string" },
                        "tasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": { "type": "string" },
                                    "type": { "type": "string", "enum": ["text", "radio", "checkbox"] },
                                    "content": { "type": "string" },
                                    "answers": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "id": { "type": "string" },
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
    const catalog = "b1g46tb0m05aust2pkfn";
    const key = "AQVN38fPgG2lasB3jDuglpi2TxGujJUgX6275rZY";

    const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Api-Key ${key}`
    }

    const prompt = `Выведи json файл по запросу тест по теме ${req["topic"]} количество вопросов ${req["question_number"]} по ${req["answers_number"]} варианта ответа в формате: массив вопросов называется variants, каждый вопрос объект с id имассивом tasks, который включает объект с id, типом type (из: text - открытый вопрос, radio - вопрос с одним правильным ответом, checkbox - множественный выбор), названием вопроса content и массивом с вариантами ответа answers, каждый ответ это объект с id ответа, текстом ответа content, ключом correct, который принимает значение true, если ответ правильный, иначе false`

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
    const regex = /```json\n([\s\S]*?)```/;
    const match = message.match(regex);
    const obj = JSON.parse(match[1]);
    return await changeFormat(obj)
}

const input_data = {
    "topic":"История России 20 века",
    "question_number":"1",
    "answers_number":"4",
    "grade":"5 класс",
    "complexity":"очень сложный",
    "description":"тест по математике"
};
const res = generateTest(input_data);
res.then(r => {
    console.log(JSON.stringify(r));
});
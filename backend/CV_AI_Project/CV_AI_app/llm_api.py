#backend/CV_AI_Project/CV_AI_app/llm_api.py
import os
import requests
from dotenv import load_dotenv
import logging
import json


load_dotenv()
logger = logging.getLogger('CV_AI_app')
logger.debug(f"Current working directory in deepseek_api: {os.getcwd()}")  # Проверяем директорию
logger.debug(f"After load_dotenv in deepseek_api, DEEPSEEK_API_KEY: {os.getenv('DEEPSEEK_API_KEY', 'Not found')}")

MODEL=os.getenv("LLM")

def ask_deepseek(prompt, dialog_history=None, resume_text=None, model=MODEL, temperature=0.7):
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        logger.critical("API key not found in environment variables!")
        raise ValueError("API key not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


    messages = []
    if resume_text:
        messages.append({"role": "system", "content": f"Resume context: {resume_text[:2000]}"}) 
    if dialog_history:
        for msg in dialog_history:
            role = "user" if msg.sender == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})
            logger.debug(f"Added to context: {role} - {msg.content[:50]}...")


    #messages.append({"role": "user", "content": prompt})
    #logger.info(f"Sending request to DeepSeek: {prompt[:100]}...")

    if prompt.strip() == "Проанализируй резюме.":
        analysis_prompt = (
            "Ты — профессиональный HR-специалист и карьерный консультант. Проанализируй предоставленное резюме. "
            "Выполни следующие шаги:\n"
            "1. **Выдели сильные стороны резюме**: укажи, что сделано хорошо (например, конкретные достижения, ясное оформление, релевантный опыт), и объясни, почему это впечатляет с точки зрения работодателя.\n"
            "2. **Укажи слабые стороны резюме**: отметь, чего не хватает или что можно улучшить (например, недостаток количественных результатов, нечеткая структура, отсутствие ключевых навыков), и объясни, почему это проблема.\n"
            "3. **Дай конкретные рекомендации**: предложи, как улучшить слабые стороны (например, добавить конкретные достижения с цифрами, переформулировать описания, улучшить форматирование).\n"
            "4. Ответ должен быть структурированным, с четкими заголовками: 'Сильные стороны', 'Слабые стороны', 'Рекомендации по улучшению'.\n"
            "Учти контекст резюме и историю диалога, если они есть. Ответ должен быть на русском языке, профессиональным, но понятным."
            "Ответ должен быть структурированным, с заголовками (### Сильные стороны, ### Слабые стороны, ### Рекомендации по улучшению), переносами строк между пунктами и абзацами. Используй двойной перенос строки (\n\n) между секциями и одинарный (\n) для списков."
        )
        messages.append({"role": "user", "content": analysis_prompt})
    elif prompt.strip() == "start_mock_interview":
        mock_interview_prompt = (
            "Ты — профессиональный HR-специалист, проводящий мок-интервью. На основе предоставленного резюме начни интервью. "
            "1. Начни с сообщения: 'Сейчас мы будем проводить мок-интервью. Тебе станет доступна строка ввода, через которую ты будешь писать свои ответы, я буду задавать тебе вопросы по навыкам из твоего резюме, твоя задача отвечать на них так, как ты бы это сделал на настоящем собеседовании. Когда ты захочешь закончить, нажми кнопку 'Завершить интервью'.'\n"
            "2. Затем задай первый вопрос, основанный на навыках или опыте из резюме. Вопрос должен быть конкретным, профессиональным и связанным с ключевыми навыками или достижениями, указанными в резюме. Например, если в резюме указан навык 'Python', спроси: 'Расскажите, как вы использовали Python в одном из ваших проектов.'\n"
            "3. Ответ должен быть структурированным: начальное сообщение и вопрос разделены двойным переносом строки (\n\n). Используй профессиональный, но дружелюбный тон."
            "Ты — эксперт по найму и карьерному консультированию. Твоя задача — анализировать резюме, давать советы по его улучшению и проводить мок-интервью (тренировочные собеседования). Ты не должен отвечать ни на какие другие вопросы, которые не касаются резюме, карьерного развития или собеседований."
            "Если пользователь задаёт вопрос, не относящийся к этой теме, вежливо отклони его, например:«Я могу помочь только с анализом резюме и подготовкой к интервью. Если у вас есть такой вопрос, я с радостью помогу!»"
            "Твоя цель — быть строгим фильтром: только резюме и мок-интервью, ничего больше."
        )
        messages.append({"role": "user", "content": mock_interview_prompt})
    elif prompt.strip() == "check_vacancies":
        check_vacancies = (
            "Тебе было предоставлено резюме. Найди название профессии, на которую написано резюме. Если название профессии не написано, то по стэку, навыкам и описанию предположи его сам."
            "Написать тебе нужно только название вакансии и ничего больше."
        )
        messages.append({"role": "user", "content": check_vacancies})
    else:
        messages.append({"role": "user", "content": prompt})

    logger.info(f"Sending request to DeepSeek: {prompt[:100]}...")

    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=10  # 10-second timeout
        )
        response.raise_for_status()

        result = response.json()
        ai_response = result["choices"][0]["message"]["content"]
        logger.debug(f"response: {ai_response[:100]}...")

        return ai_response
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        raise Exception(f"API request failed: {str(e)}")
    except KeyError as e:
        logger.error(f"Invalid API response: {str(e)}")
        raise Exception("Invalid API response format")
